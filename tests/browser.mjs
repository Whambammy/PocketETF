import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import {
  generateKeyPairSigner,
  getTransactionDecoder,
  getTransactionEncoder,
  getBase58Decoder,
  signTransaction,
} from "@solana/kit";
import { compileWire } from "../src/lib/jupiter.ts";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/prices*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, prices: {} }),
    }),
  );
  const response = await page.goto("http://127.0.0.1:3210");
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /nonce-/);
  await page.getByRole("heading", { name: /Your basket/ }).waitFor();
  await page.getByRole("link", { name: "Review basket →" }).last().waitFor();
  await page.screenshot({
    caret: "initial",
    path: ".test-artifacts/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Creator Studio", exact: true }).click();
  await page.getByRole("heading", { name: "Creator Studio" }).waitFor();
  await page.getByRole("button", { name: "Equal weights" }).click();
  await page.getByRole("link", { name: "Review and share basket →" }).click();
  await page.getByRole("heading", { name: "Verified constituents" }).waitFor();
  assert.ok(
    new URL(page.url()).searchParams
      .get("assets")
      .includes("So11111111111111111111111111111111111111112:50"),
  );
  await page.getByRole("button", { name: "Open on mobile" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await page
    .getByText(
      "Open this site in your wallet browser or install a supported wallet extension.",
    )
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3210/etf/crypto-frontier");
  await page.getByRole("heading", { name: "Trade basket" }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    caret: "initial",
    path: ".test-artifacts/basket-mobile.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:3210/portfolio");
  await page.getByRole("heading", { name: "Portfolio & history" }).waitFor();
  await page.getByText("Connect a wallet to read holdings").waitFor();
  const rejected = await page.request.post(
    "http://127.0.0.1:3210/api/trades/prepare",
    {
      data: {
        id: "custom",
        query: "assets=SOL:100,JUP:100",
        account: "bad",
        amount: "10",
        mode: "buy",
        version: 1,
        slippageBps: 50,
      },
    },
  );
  assert.equal(rejected.status(), 400);
  assert.deepEqual(errors, []);
  for (const version of [0, 1]) {
    const signer = await generateKeyPairSigner();
    let signedSignature = "";
    let requestedVersion = -1;
    const walletContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await walletContext.addInitScript(
      ({ account, version }) => {
        const walletAccount = {
          address: account,
          publicKey: new Uint8Array(32),
          chains: ["solana:mainnet"],
          features: ["solana:signTransaction"],
        };
        const wallet = {
          version: "1.0.0",
          name: "Regression Wallet",
          icon: "data:image/png;base64,",
          chains: ["solana:mainnet"],
          accounts: [],
          features: {
            "standard:connect": {
              version: "1.0.0",
              connect: async () => ({ accounts: [walletAccount] }),
            },
            "standard:disconnect": {
              version: "1.0.0",
              disconnect: async () => {},
            },
            "solana:signTransaction": {
              version: "1.0.0",
              supportedTransactionVersions: [version],
              signTransaction: async ({ transaction }) => [
                {
                  signedTransaction: Uint8Array.from(
                    await window.__signTest(Array.from(transaction)),
                  ),
                },
              ],
            },
          },
        };
        window.addEventListener("wallet-standard:app-ready", (event) =>
          event.detail.register(wallet),
        );
      },
      { account: signer.address, version },
    );
    const walletPage = await walletContext.newPage();
    walletPage.setDefaultTimeout(10000);
    const walletErrors = [];
    walletPage.on("pageerror", (e) => walletErrors.push(e.message));
    await walletPage.exposeFunction("__signTest", async (bytes) => {
      const tx = getTransactionDecoder().decode(Uint8Array.from(bytes));
      const signed = await signTransaction([signer.keyPair], tx);
      signedSignature = getBase58Decoder().decode(
        signed.signatures[signer.address],
      );
      return Array.from(getTransactionEncoder().encode(signed));
    });
    await walletPage.route("**/api/prices*", (r) =>
      r.fulfill({ json: { success: true, prices: {} } }),
    );
    await walletPage.route("**/api/trades/prepare", (route) => {
      const input = route.request().postDataJSON();
      requestedVersion = input.version;
      const tx = compileWire(
        signer.address,
        version,
        [],
        {},
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        2000,
        200000,
        32768,
        5000,
      );
      return route.fulfill({
        json: {
          success: true,
          preview: {
            transaction: Buffer.from(
              getTransactionEncoder().encode(tx),
            ).toString("base64"),
            messageHash: "a".repeat(64),
            account: signer.address,
            mode: input.mode,
            version,
            expiresAt: Date.now() + 45000,
            lastValidBlockHeight: 2000,
            byteLength: 200,
            computeUnits: 200000,
            networkFeeLamports: 10000,
            rentLamports: 0,
            inputUsdc: input.amount,
            minimumUsdc: "0",
            slippageBps: 50,
            legs: [
              {
                ticker: "SOL",
                mint: "So11111111111111111111111111111111111111112",
                direction: "buy",
                input: "5",
                inputAtomic: "5000000",
                expectedOutput: "0.05",
                minimumOutput: "0.04975",
                minimumOutputAtomic: "49750000",
                outputSymbol: "wSOL",
                priceImpactPercent: 0.1,
              },
            ],
            allocation: [],
          },
        },
      });
    });
    await walletPage.route("**/api/trades/submit", (route) =>
      route.fulfill({ json: { success: true, signature: signedSignature } }),
    );
    await walletPage.route("**/api/trades/status*", (route) =>
      route.fulfill({ json: { success: true, status: "finalized" } }),
    );
    await walletPage.goto("http://127.0.0.1:3210/etf/crypto-frontier");
    await walletPage
      .getByRole("button", { name: "Connect wallet", exact: true })
      .first()
      .click();
    await walletPage.getByRole("button", { name: "Regression Wallet" }).click();
    await walletPage.getByRole("button", { name: "Preview buy" }).click();
    await walletPage
      .getByRole("heading", { name: "Review before signing" })
      .waitFor();
    assert.equal(requestedVersion, version);
    await walletPage.getByLabel("Spend USDC").fill("20");
    await walletPage
      .getByRole("heading", { name: "Review before signing" })
      .waitFor({ state: "detached" });
    await walletPage.getByRole("button", { name: "Preview buy" }).click();
    await walletPage
      .getByRole("button", { name: "Approve reviewed trade" })
      .click();
    await walletPage
      .getByText("Transaction finalized.", { exact: true })
      .waitFor();
    const history = await walletPage.evaluate(() =>
      JSON.parse(localStorage.getItem("pocketetf-history-v1")),
    );
    assert.equal(history[0].signature, signedSignature);
    assert.equal(history[0].status, "finalized");
    assert.deepEqual(walletErrors, []);
    await walletContext.close();
  }
  console.log(
    "Browser smoke checks passed: desktop/mobile, CSP hydration, custom mint round trip, dialog dismissal, wallet discovery, portfolio and invalid-trade rejection.",
  );
  console.log(
    "Mock Wallet Standard v0/v1 flows passed: capability selection, preview invalidation, signing, submission, finalized status and history. No real transactions were submitted.",
  );
} finally {
  await browser.close();
}
