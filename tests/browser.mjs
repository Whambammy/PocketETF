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
  await page.getByRole('heading',{level:1}).filter({hasText:'Stock ETFs'}).waitFor();
  await page.locator('#etfs').getByRole('heading',{name:'Curated PocketETFs'}).waitFor();
  assert.equal(await page.locator('#compare tbody tr').count(),8);
  assert.ok(await page.locator('#compare table').isVisible());
  await page.screenshot({path:'.test-artifacts/restored-home-desktop.png',caret:'initial'});
  await page.locator('#compare').screenshot({path:'.test-artifacts/restored-comparison-desktop.png',caret:'initial'});
  await page.locator('header nav a[href="/compare"]').click();
  await page.waitForURL('**/compare');
  assert.equal(await page.locator('#compare tbody tr').count(),8);
  await page.locator('header nav a[href="/studio"]').click();
  await page.getByRole('heading',{name:'Build a Custom Stock ETF Blink'}).waitFor();
  await page.getByRole('button',{name:'Widget View'}).click();
  await page.getByRole('button',{name:/Feed View/}).click();
  const shareText=await page.getByText(/^http:\/\/127\.0\.0\.1:3210\/etf\/custom\?/).first().textContent();
  const share=new URL(shareText.trim());
  assert.ok(share.searchParams.get('assets').includes('Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh:60'));
  // Existing weight controls must work for the expanded eight-asset basket limit.
  for (const ticker of ['SOL', 'JUP', 'AAPL', 'MSFT', 'AMD', 'GOOGL']) {
    await page.getByRole('button',{name:/Add Asset from Catalog/}).click();
    await page.getByPlaceholder('Search catalog...').fill(ticker);
    await page.getByRole('button').filter({has:page.getByText(ticker,{exact:true})}).click();
  }
  await page.getByRole('button',{name:'Equal Split',exact:true}).click();
  const splitLink=new URL((await page.getByText(/^http:\/\/127\.0\.0\.1:3210\/etf\/custom\?/).first().textContent()).trim());
  const weights=splitLink.searchParams.get('assets').split(',').map(pair=>Number(pair.split(':')[1]));
  assert.equal(weights.length,8);
  assert.equal(weights.reduce((sum,value)=>sum+value,0),100);
  assert.ok(weights.every(value=>value===12||value===13));
  await page.locator('input[type="range"]').first().fill('99');
  await page.getByRole('button',{name:'Balance',exact:true}).click();
  const balancedLink=new URL((await page.getByText(/^http:\/\/127\.0\.0\.1:3210\/etf\/custom\?/).first().textContent()).trim());
  assert.equal(balancedLink.searchParams.get('assets').split(',').reduce((sum,pair)=>sum+Number(pair.split(':')[1]),0),100);
  await page.goto(share.href);
  await page.getByRole('button',{name:'Trade on Mobile (QR)'}).click();
  await page.getByRole('dialog',{name:'Trade on mobile'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:/^Connect Wallet$/i}).first().click();
  await page.getByText('Open this site in your wallet browser or install a supported wallet extension.').waitFor();
  await page.getByRole('dialog',{name:'Connect Wallet'}).getByRole('button',{name:'Close dialog'}).click();
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:3210');
  await page.getByRole('button',{name:'Open Navigation Menu'}).click();
  await page.getByRole('link',{name:/Compare vs. World/}).click();
  await page.waitForURL('**/compare');
  await page.getByRole('button',{name:'EVM DeFi',exact:true}).click();
  await page.locator('#compare').screenshot({path:'.test-artifacts/restored-comparison-mobile.png',caret:'initial'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto('http://127.0.0.1:3210/etf/crypto-frontier');
  await page.getByRole('button',{name:/Execute 1-Click Buy/}).waitFor();
  await page.screenshot({path:'.test-artifacts/restored-basket-mobile.png',caret:'initial',fullPage:true});
  await page.goto('http://127.0.0.1:3210/portfolio');
  await page.getByRole('heading',{name:'Portfolio & history'}).waitFor();
  await page.getByText('Connect a wallet to read holdings').waitFor();
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
    await walletPage.route('**/api/wallet/balance*',route=>route.fulfill({json:{success:true,account:signer.address,sol:1,usdc:1000,formattedSol:'1 SOL',formattedUsdc:'$1000.00',holdings:[],prices:{},valuation:{value:1000,knownValue:1000,missing:[]},observedAt:new Date().toISOString()}}));
    await walletPage.goto("http://127.0.0.1:3210/etf/crypto-frontier");
    await walletPage
      .getByRole("button", { name: /^Connect Wallet$/i })
      .first()
      .click();
    await walletPage.getByRole("button", { name: "Regression Wallet" }).click();
    await walletPage.getByRole('button',{name:/Execute 1-Click Buy/}).click();
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
    "Restored UI browser checks passed: original homepage/header, desktop comparison, mobile navigation/comparison, original Creator Studio, custom mint links, QR modal, portfolio and invalid-trade rejection.",
  );
  console.log(
    "Mock Wallet Standard v0/v1 flows passed: capability selection, preview invalidation, signing, submission, finalized status and history. No real transactions were submitted.",
  );
} finally {
  await browser.close();
}
