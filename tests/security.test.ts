import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { TOKEN_CATALOG, CURATED_ETFS } from "../src/lib/constants";
import {
  parseUnits,
  formatUnits,
  scaledUnits,
  allocate,
  validateAssets,
} from "../src/lib/amounts";
import { resolveETF, serializeBasket } from "../src/lib/etfResolver";
import {
  validateImageUrl,
  resolveDirectImageUrl,
} from "../src/lib/imageResolver";
import {
  parsePythPrice,
  requireFreshPrice,
  portfolioValue,
} from "../src/lib/pyth";
import { messageHash, readJson, limitRequests } from "../src/lib/server";
import {
  GET as metadata,
  POST as action,
} from "../src/app/api/actions/etf/[id]/route";
import { POST as prepare } from "../src/app/api/trades/prepare/route";
import { POST as submit } from "../src/app/api/trades/submit/route";
import { proxy } from "../src/proxy";

const basket = CURATED_ETFS["crypto-frontier"];
test("registry identities are unique, pinned, and include Token-2022 metadata", () => {
  assert.equal(
    new Set(TOKEN_CATALOG.map((a) => a.mint)).size,
    TOKEN_CATALOG.length,
  );
  for (const a of TOKEN_CATALOG) {
    assert.ok(a.provenanceUrl.startsWith("https://"));
    assert.ok(a.verifiedAt);
    assert.ok(a.pythFeedId?.match(/^[0-9a-f]{64}$/));
    if (a.kind === "equity") {
      assert.equal(a.decimals, 8);
      assert.ok(a.tokenProgram.startsWith("Tokenz"));
    }
  }
  assert.notEqual(
    TOKEN_CATALOG.find((a) => a.ticker === "SPY")?.mint,
    TOKEN_CATALOG.find((a) => a.ticker === "JUP")?.mint,
  );
});
test("exact decimal parser rejects coercion, trailing junk, exponent, infinity, precision loss and negative values", () => {
  for (const v of [
    "1e2",
    "Infinity",
    "NaN",
    "10abc",
    "-1",
    "+1",
    " 1",
    "01",
    "0",
    "0.0000001",
    10,
    null,
    {},
  ])
    assert.throws(() => parseUnits(v, 6));
  assert.equal(parseUnits("100000", 6, 100000000000n), 100000000000n);
  assert.throws(() => parseUnits("100000.000001", 6, 100000000000n));
  assert.equal(formatUnits(1234567n, 6), "1.234567");
});
test("allocation sums exactly to approved spend across rounding boundaries", () => {
  for (const amount of [100000n, 100001n, 999999n, 100000000000n]) {
    const a = basket.targetAssets.map((a, i) => ({
      ...a,
      weightPercent: i ? 66.67 : 33.33,
    }));
    const values = allocate(amount, a);
    assert.equal(
      values.reduce((s, v) => s + v, 0n),
      amount,
    );
  }
  assert.throws(() => allocate(1n, basket.targetAssets));
  for (const weights of [
    [100, 100],
    [20, 20],
    [0, 100],
    [NaN, 50],
    [50.001, 49.999],
  ])
    assert.throws(() =>
      validateAssets(
        basket.targetAssets.map((a, i) => ({
          ...a,
          weightPercent: weights[i],
        })),
      ),
    );
  assert.throws(() =>
    validateAssets([
      { ...basket.targetAssets[0], weightPercent: 50 },
      { ...basket.targetAssets[0], weightPercent: 50 },
    ]),
  );
  assert.throws(() =>
    validateAssets([
      {
        ...basket.targetAssets[0],
        mint: basket.targetAssets[1].mint,
        weightPercent: 100,
      },
    ]),
  );
});
test("Token-2022 display amounts use the multiplier and round minimum receipts down", () => {
  assert.equal(scaledUnits(3000000n, 8, 1.000918075849), "0.03002754");
  assert.equal(scaledUnits(123456789n, 8, 1), "1.23456789");
  assert.throws(() => scaledUnits(1n, 8, Infinity));
});
test("custom basket links preserve exact case-sensitive mints and reject ambiguous or unknown identities", () => {
  const custom = { ...basket, id: "custom", name: "My & basket" };
  const query = serializeBasket(custom);
  const resolved = resolveETF("custom", new URLSearchParams(query));
  assert.ok(resolved);
  assert.deepEqual(resolved.targetAssets, custom.targetAssets);
  for (const q of [
    "assets=UNKNOWN:100",
    "assets=NVDA:100,TSM:100",
    "assets=NVDA:20,TSM:20",
    "assets=SOL:50,SOL:50",
    "assets=SOL:100&assets=JUP:100",
    "assets=SOL:100junk",
    "assets=SOL:100&image=http://localhost/a.png",
  ])
    assert.equal(resolveETF("custom", new URLSearchParams(q)), null);
  assert.equal(resolveETF("__proto__", new URLSearchParams()), null);
  assert.equal(resolveETF("constructor", new URLSearchParams()), null);
});
test("image validation performs no server fetch and blocks SSRF, credentials, redirects and SVG", async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("Unexpected network");
  }) as typeof fetch;
  try {
    for (const u of [
      "http://127.0.0.1/postimg.cc/x",
      "http://169.254.169.254/latest/meta-data",
      "https://i.imgur.com.evil.example/x.png",
      "https://i.imgur.com@127.0.0.1/x.png",
      "https://i.imgur.com:8443/x.png",
      "https://i.imgur.com/x.svg",
      "//i.imgur.com/x.png",
      "/etfs/../secret.png",
      "https://i.imgur.com/x.png?redirect=http://localhost",
      "https://postimg.cc/gallery",
    ])
      assert.throws(() => validateImageUrl(u));
    assert.equal(
      await resolveDirectImageUrl("https://i.imgur.com/abc.png"),
      "https://i.imgur.com/abc.png",
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});
test("oracle rejects stale, wrong-feed, low precision and future data without generating fallback prices", () => {
  const feed = basket.targetAssets[0].pythFeedId!;
  const now = Date.now();
  const item = {
    id: feed,
    price: {
      price: "10000000000",
      conf: "1000000",
      expo: -8,
      publish_time: Math.floor(now / 1000),
    },
  };
  const p = parsePythPrice("SOL", feed, item, now);
  assert.equal(requireFreshPrice(p), 100);
  assert.throws(() =>
    requireFreshPrice(
      parsePythPrice(
        "SOL",
        feed,
        {
          ...item,
          price: { ...item.price, publish_time: Math.floor(now / 1000) - 61 },
        },
        now,
      ),
    ),
  );
  assert.equal(parsePythPrice("SOL", "wrong", item, now).price, null);
  assert.equal(
    parsePythPrice(
      "SOL",
      feed,
      {
        ...item,
        price: { ...item.price, publish_time: Math.floor(now / 1000) + 60 },
      },
      now,
    ).status,
    "unavailable",
  );
  assert.throws(() => requireFreshPrice({ ...p, confidencePercent: 2 }));
  assert.deepEqual(
    portfolioValue([{ ticker: "SOL", quantity: 2 }], { SOL: p }),
    { value: 200, knownValue: 200, missing: [] },
  );
  assert.equal(
    portfolioValue([{ ticker: "UNKNOWN", quantity: 2 }], {}).value,
    null,
  );
});
test("reviewed message digests change when transaction bytes change", () => {
  assert.notEqual(
    messageHash(new Uint8Array([1, 2, 3])),
    messageHash(new Uint8Array([1, 2, 4])),
  );
});
test("bounded JSON parsing rejects oversized requests and wrong content types", async () => {
  await assert.rejects(
    readJson(new Request("https://app.test", { method: "POST", body: "x" })),
  );
  await assert.rejects(
    readJson(
      new Request("https://app.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "x".repeat(200) }),
      }),
      50,
    ),
  );
  await assert.rejects(
    readJson(
      new Request("https://app.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "[]",
      }),
    ),
  );
});
test("live routes reject demos and malformed requests without reaching the network", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("Unexpected upstream");
  }) as typeof fetch;
  try {
    const r = await action(
      new NextRequest(
        "https://app.test/api/actions/etf/crypto-frontier?amount=10&simulate=true",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      ),
      { params: Promise.resolve({ id: "crypto-frontier" }) },
    );
    assert.equal(r.status, 400);
    const p = await prepare(
      new NextRequest("https://app.test/api/trades/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "custom",
          query: "assets=SOL:100,JUP:100",
          amount: "10",
          account: "bad",
          mode: "buy",
          version: 0,
          slippageBps: 50,
        }),
      }),
    );
    assert.equal(p.status, 400);
    const s = await submit(
      new NextRequest("https://app.test/api/trades/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: "invalid", transaction: "AAAA" }),
      }),
    );
    assert.equal(s.status, 400);
  } finally {
    globalThis.fetch = original;
  }
});
test("Action metadata is usable without operator approval or an eligibility service", async () => {
  for (const id of ["silicon-ai", "crypto-frontier"]) {
    const result = await metadata(
      new NextRequest("https://app.test/api/actions/etf/" + id),
      { params: Promise.resolve({ id }) },
    );
    assert.equal(result.status, 200);
    assert.equal((await result.json()).disabled, false);
  }
});
test("CSP has distinct request nonces and forbids arbitrary outbound connections or framing", () => {
  const a = proxy(new NextRequest("https://app.test"));
  const b = proxy(new NextRequest("https://app.test"));
  const csp = a.headers.get("Content-Security-Policy")!;
  assert.ok(csp.includes("connect-src 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(csp.includes("'nonce-"));
  assert.notEqual(csp, b.headers.get("Content-Security-Policy"));
});
test("distributed rate limits use a canonical endpoint and reject exhausted or failed service responses", async () => {
  const oldFetch = globalThis.fetch;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
  let count = 1;
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "https://example.upstash.io/pipeline");
    return new Response(JSON.stringify([{ result: count }, { result: 1 }]), {
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await limitRequests("test", 2);
    count = 3;
    await assert.rejects(limitRequests("test", 2), /Too many requests/);
    globalThis.fetch = (async () => {
      throw new Error("Disconnected");
    }) as typeof fetch;
    await assert.rejects(
      limitRequests("test", 2),
      /upstream service is unavailable/,
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = url;
    if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = token;
  }
});
