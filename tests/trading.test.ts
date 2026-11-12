import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  generateKeyPairSigner,
  getAddressEncoder,
  address,
  getTransactionDecoder,
  getTransactionEncoder,
  getCompiledTransactionMessageDecoder,
  getBase58Decoder,
  signTransaction,
} from "@solana/kit";
import {
  TOKEN_CATALOG,
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  USDC_MINT_ADDRESS,
  CURATED_ETFS,
  type ETFAsset,
} from "../src/lib/constants";
import { ata } from "../src/lib/solana";
import { buildTrade, validateQuote, planRebalance } from "../src/lib/jupiter";
import { parsePythPrice } from "../src/lib/pyth";
import { POST as submit } from "../src/app/api/trades/submit/route";

test("full basket preparation, safety failures, v0/v1 and signed submission (all upstreams mocked)", async (t) => {
  const signer = await generateKeyPairSigner();
  const account = signer.address;
  const assets = CURATED_ETFS["crypto-frontier"].targetAssets;
  const usdcAta = await ata(account, USDC_MINT_ADDRESS);
  const atas = new Map(
    await Promise.all(
      TOKEN_CATALOG.map(
        async (a) =>
          [a.mint, await ata(account, a.mint, a.tokenProgram)] as const,
      ),
    ),
  );
  const base = new Map<string, bigint>([
    [usdcAta, 1000000000n],
    ...assets.map(
      (a) =>
        [atas.get(a.mint)!, a.ticker === "SOL" ? 1000000000n : 50000000n] as [
          string,
          bigint,
        ],
    ),
  ]);
  const mintFor = (a: string) =>
    a === usdcAta
      ? USDC_MINT_ADDRESS
      : TOKEN_CATALOG.find((t) => atas.get(t.mint) === a)!.mint;
  const quotes: any[] = [];
  let failure = "";
  let lastSignature = "";
  let sendCount = 0;
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.JUPITER_API_KEY;
  process.env.JUPITER_API_KEY = "mock-key";
  function tokenData(mint: string, amount: bigint) {
    const b = Buffer.alloc(165);
    b.set(getAddressEncoder().encode(address(mint)), 0);
    b.set(getAddressEncoder().encode(account), 32);
    b.writeBigUInt64LE(amount, 64);
    b[108] = 1;
    return b.toString("base64");
  }
  const response = (v: unknown) =>
    new Response(JSON.stringify(v), {
      headers: { "Content-Type": "application/json" },
    });
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "hermes.pyth.network")
      return response({
        parsed: TOKEN_CATALOG.filter((a) => a.pythFeedId).map((a) => ({
          id: a.pythFeedId,
          price: {
            price: a.ticker === "JUP" ? "100000000" : "10000000000",
            conf: "1000",
            expo: -8,
            publish_time: Math.floor(Date.now() / 1000),
          },
        })),
      });
    if (url.hostname === "api.jup.ag") {
      const inputMint = url.searchParams.get("inputMint")!,
        outputMint = url.searchParams.get("outputMint")!,
        amount = BigInt(url.searchParams.get("amount")!);
      const buy = inputMint === USDC_MINT_ADDRESS;
      const asset = TOKEN_CATALOG.find(
        (a) => a.mint === (buy ? outputMint : inputMint),
      )!;
      const price = asset.ticker === "SOL" ? 100 : 1;
      const out = BigInt(
        Math.floor(
          buy
            ? (Number(amount) / 1e6 / price) * 10 ** asset.decimals
            : (Number(amount) / 10 ** asset.decimals) * price * 1e6,
        ),
      );
      const slip = Number(url.searchParams.get("slippageBps"));
      const source = buy ? usdcAta : atas.get(asset.mint)!,
        destination = buy ? atas.get(asset.mint)! : usdcAta;
      const wire = Buffer.alloc(35);
      wire.set(Buffer.from("bb64facc31c4af14", "hex"));
      wire.writeBigUInt64LE(
        failure === "encoded-spend" ? amount + 1n : amount,
        8,
      );
      wire.writeBigUInt64LE(out, 16);
      wire.writeUInt16LE(slip, 24);
      wire.writeUInt16LE(failure === "encoded-fee" ? 1 : 0, 26);
      wire.writeUInt32LE(1, 30);
      const q = {
        inputMint: failure === "mint" ? assets[0].mint : inputMint,
        outputMint,
        inAmount: amount.toString(),
        outAmount: out.toString(),
        otherAmountThreshold: (out - (out * BigInt(slip)) / 10000n).toString(),
        swapMode: "ExactIn",
        slippageBps: slip,
        priceImpactPct: failure === "impact" ? "0.10" : "0.001",
        transactionVersion: Number(url.searchParams.get("transactionVersion")),
        setupInstructions: [],
        addressesByLookupTableAddress: {},
        swapInstruction: {
          programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
          accounts: [
            {
              pubkey: failure === "signer" ? USDC_MINT_ADDRESS : account,
              isSigner: true,
              isWritable: true,
            },
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: inputMint, isSigner: false, isWritable: false },
            { pubkey: outputMint, isSigner: false, isWritable: false },
          ],
          data: wire.toString("base64"),
        },
        _source: source,
        _destination: destination,
        _amount: amount,
        _out: out,
      };
      quotes.push(q);
      const { _source, _destination, _amount, _out, ...publicQuote } = q;
      return response(publicQuote);
    }
    if (
      !["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"].includes(
        url.hostname,
      )
    )
      throw new Error("Unexpected upstream " + url.hostname);
    const { method, params } = JSON.parse(String(init?.body));
    let result: unknown;
    switch (method) {
      case "getGenesisHash":
        result = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        break;
      case "getBalance":
        result = { value: failure === "sol" ? 0 : 1000000000 };
        break;
      case "getTokenAccountsByOwner": {
        const entries =
          params[1].programId === TOKEN_PROGRAM
            ? [
                {
                  mint: USDC_MINT_ADDRESS,
                  ata: usdcAta,
                  amount: failure === "balance" ? 0n : base.get(usdcAta)!,
                },
                ...assets.map((a) => ({
                  mint: a.mint,
                  ata: atas.get(a.mint)!,
                  amount: base.get(atas.get(a.mint)!)!,
                })),
              ]
            : [];
        result = {
          value: entries.map((e) => ({
            pubkey: e.ata,
            account: {
              owner: TOKEN_PROGRAM,
              data: {
                parsed: {
                  info: {
                    mint: e.mint,
                    state: "initialized",
                    tokenAmount: {
                      amount: e.amount.toString(),
                      uiAmountString: String(
                        Number(e.amount) /
                          10 ** (e.mint === assets[0].mint ? 9 : 6),
                      ),
                    },
                  },
                },
              },
            },
          })),
        };
        break;
      }
      case "getMultipleAccounts":
        result = {
          value: params[0].map((mint: string) => {
            const a = TOKEN_CATALOG.find((t) => t.mint === mint)!;
            return {
              owner:
                failure === "program" ? TOKEN_2022_PROGRAM : a.tokenProgram,
              data: {
                parsed: {
                  type: "mint",
                  info: { decimals: a.decimals, isInitialized: true },
                },
              },
            };
          }),
        };
        break;
      case "getLatestBlockhash":
        result = {
          value: { blockhash: USDC_MINT_ADDRESS, lastValidBlockHeight: 2000 },
        };
        break;
      case "getRecentPrioritizationFees":
        result = [{ prioritizationFee: 20000 }];
        break;
      case "getFeeForMessage":
        result = { value: 10000 };
        break;
      case "getBlockHeight":
        result = failure === "expiry" ? 3000 : 1000;
        break;
      case "simulateTransaction": {
        const after = new Map(base);
        for (const q of quotes) {
          after.set(q._source, (after.get(q._source) || 0n) - q._amount);
          after.set(q._destination, (after.get(q._destination) || 0n) + q._out);
        }
        if (failure === "overspend")
          after.set(usdcAta, (after.get(usdcAta) || 0n) - 100000000n);
        result = {
          value: {
            err:
              failure === "simulation"
                ? { InstructionError: [1, "InvalidArgument"] }
                : null,
            unitsConsumed: 200000,
            loadedAccountsDataSize: 300000,
            accounts: params[1].accounts.addresses.map(
              (a: string, i: number) =>
                i === 0
                  ? {
                      lamports: 999990000,
                      owner: "11111111111111111111111111111111",
                      data: ["", "base64"],
                    }
                  : {
                      lamports: 2000000,
                      owner: TOKEN_PROGRAM,
                      data: [
                        tokenData(mintFor(a), after.get(a) || 0n),
                        "base64",
                      ],
                    },
            ),
          },
        };
        break;
      }
      case "sendTransaction":
        sendCount++;
        result = lastSignature;
        break;
      default:
        throw new Error("Unexpected RPC " + method);
    }
    return response({ jsonrpc: "2.0", id: 1, result });
  }) as typeof fetch;
  const build = async (
    version: 0 | 1,
    mode: "buy" | "sell" | "rebalance" = "buy",
    amount = mode === "sell" ? "25" : "10",
  ) => {
    quotes.length = 0;
    return buildTrade({
      account,
      assets,
      version,
      mode,
      amount,
      slippageBps: 50,
    });
  };
  try {
    for (const version of [0, 1] as const)
      await t.test(
        "v" + version + " compiles, simulates and discloses minimum receipts",
        async () => {
          const p = await build(version);
          assert.ok(p.byteLength <= (version ? 4096 : 1232));
          assert.equal(p.legs.length, 2);
          assert.equal(p.inputUsdc, "10");
          assert.ok(p.computeUnits < 1400000);
          const decoded = getTransactionDecoder().decode(
            Buffer.from(p.transaction, "base64"),
          );
          const message = getCompiledTransactionMessageDecoder().decode(
            decoded.messageBytes,
          );
          assert.equal(message.version, version);
          if (message.version === 1) {
            assert.ok(message.configMask & 4);
            assert.ok(message.configMask & 8);
            assert.ok(message.configValues.every((v) => v.value > 0));
          }
        },
      );
    await t.test("sell uses actual balances and exact percentage", async () => {
      const p = await build(1, "sell", "25");
      assert.equal(p.legs.length, 2);
      assert.equal(p.legs[0].input, "0.25");
      assert.ok(Number(p.minimumUsdc) > 0);
    });
    await t.test(
      "rebalance sells before buys and preserves existing USDC",
      async () => {
        const p = await build(1, "rebalance");
        assert.ok(p.legs.some((l) => l.direction === "sell"));
        assert.ok(p.legs.some((l) => l.direction === "buy"));
        assert.equal(p.inputUsdc, "0");
        assert.ok(Number(p.minimumUsdc) >= 0);
      },
    );
    for (const [scenario, pattern] of [
      ["mint", /route response/],
      ["impact", /Price impact/],
      ["signer", /recipients/],
      ["encoded-spend", /encoded amount/],
      ["encoded-fee", /encoded amount/],
      ["program", /Mint metadata/],
      ["balance", /Insufficient spendable/],
      ["sol", /Insufficient SOL/],
      ["simulation", /simulation failed/],
      ["overspend", /approved trade/],
    ] as const)
      await t.test("rejects " + scenario, async () => {
        failure = scenario;
        try {
          await assert.rejects(build(1), pattern);
        } finally {
          failure = "";
        }
      });
    await t.test(
      "tampered or invalidly signed messages never broadcast",
      async () => {
        const p = await build(1);
        const tx = getTransactionDecoder().decode(
          Buffer.from(p.transaction, "base64"),
        );
        const signed = await signTransaction([signer.keyPair], tx);
        const bytes = getTransactionEncoder().encode(signed);
        lastSignature = getBase58Decoder().decode(signed.signatures[account]!);
        const call = (
          transaction: string,
          expectedMessageHash = p.messageHash,
          expiresAt = p.expiresAt,
        ) =>
          submit(
            new NextRequest("https://app.test/api/trades/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction,
                expectedMessageHash,
                expiresAt,
                account,
                lastValidBlockHeight: p.lastValidBlockHeight,
                mints: assets.map((a) => a.mint),
              }),
            }),
          );
        const invalid = Uint8Array.from(bytes);
        invalid[invalid.length - 1] ^= 1;
        assert.equal(
          (await call(Buffer.from(invalid).toString("base64"))).status,
          400,
        );
        assert.equal(sendCount, 0);
        assert.equal(
          (
            await call(
              Buffer.from(bytes).toString("base64"),
              p.messageHash.replace(/^./, p.messageHash[0] === "a" ? "b" : "a"),
            )
          ).status,
          400,
        );
        assert.equal(sendCount, 0);
        failure = "expiry";
        assert.equal(
          (await call(Buffer.from(bytes).toString("base64"))).status,
          409,
        );
        assert.equal(sendCount, 0);
        failure = "";
        const res = await call(Buffer.from(bytes).toString("base64"));
        assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
        assert.equal(sendCount, 1);
      },
    );
    await t.test(
      "production preparation needs no operator switches, secret, Redis or Jupiter key",
      async () => {
        const previousMode = process.env.NODE_ENV;
        Object.assign(process.env, { NODE_ENV: "production" });
        delete process.env.JUPITER_API_KEY;
        quotes.length = 0;
        try {
          const preview = await buildTrade({
            account,
            assets: [{ ...assets[1], weightPercent: 100 }],
            version: 1,
            mode: "buy",
            amount: "1",
            slippageBps: 50,
          });
          assert.equal(preview.inputUsdc, "1");
          assert.match(preview.messageHash, /^[a-f0-9]{64}$/);
          assert.equal("authorization" in preview, false);
        } finally {
          if (previousMode === undefined)
            Reflect.deleteProperty(process.env, "NODE_ENV");
          else Object.assign(process.env, { NODE_ENV: previousMode });
        }
      },
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.JUPITER_API_KEY;
    else process.env.JUPITER_API_KEY = oldKey;
  }
});
