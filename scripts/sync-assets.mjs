// Explicit maintenance command. Never run automatically during install or builds.
// Identities come from the issuer, and mint metadata is checked independently on chain.
import fs from "node:fs/promises";
const symbols = [
  "NVDA",
  "TSM",
  "AMD",
  "AVGO",
  "PLTR",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "SPY",
  "QQQ",
  "SMH",
  "IWM",
  "VTI",
  "GLD",
  "SLV",
  "TLT",
  "COIN",
  "MSTR",
];
const registry = [];
for (const symbol of symbols) {
  const source = `https://api.xstocks.fi/api/v2/public/assets/${symbol}x`;
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (response.status === 404) {
    console.log(`${symbol}: no issuer deployment`);
    continue;
  }
  if (!response.ok) throw new Error(`Issuer registry ${response.status}`);
  const data = await response.json();
  const deployment = data.deployments?.find((d) => d.network === "Solana");
  if (
    !deployment ||
    data.symbol !== `${symbol}x` ||
    data.underlying?.symbol !== symbol
  ) {
    console.log(`${symbol}: no matching Solana identity`);
    continue;
  }
  registry.push({
    ticker: symbol,
    tokenSymbol: data.symbol,
    name: data.name,
    mint: deployment.address,
    issuer: "Backed / xStocks",
    provenanceUrl: source,
    verifiedAt: new Date().toISOString(),
  });
}
const crypto = [
  {
    ticker: "SOL",
    tokenSymbol: "wSOL",
    name: "Wrapped SOL",
    mint: "So11111111111111111111111111111111111111112",
    issuer: "Solana SPL",
    provenanceUrl: "https://solana.com/docs/tokens/basics/sync-native",
  },
  {
    ticker: "JUP",
    tokenSymbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    issuer: "Jupiter",
    provenanceUrl: "https://jup.ag",
  },
];
registry.push(
  ...crypto.map((a) => ({ ...a, verifiedAt: new Date().toISOString() })),
);
const values = [];
for (let offset = 0; offset < registry.length; offset += 5) {
  const response = await fetch("https://solana-rpc.publicnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getMultipleAccounts",
      params: [
        registry.slice(offset, offset + 5).map((a) => a.mint),
        { encoding: "jsonParsed", commitment: "finalized" },
      ],
    }),
  });
  const rpc = await response.json();
  if (rpc.error || !rpc.result?.value)
    throw new Error(
      `Mint verification RPC failed: ${rpc.error?.message || response.status}`,
    );
  values.push(...rpc.result.value);
}
const programs = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);
for (const [i, a] of registry.entries()) {
  const account = values[i];
  if (
    !account ||
    !programs.has(account.owner) ||
    account.data?.parsed?.type !== "mint"
  )
    throw new Error(`Invalid mint: ${a.ticker}`);
  a.decimals = account.data.parsed.info.decimals;
  a.tokenProgram = account.owner;
}
await fs.mkdir("src/data", { recursive: true });
await fs.writeFile(
  "src/data/assets.json",
  JSON.stringify(registry, null, 2) + "\n",
);
console.log(
  `Verified ${registry.length} issuer/crypto identities and on-chain mint accounts.`,
);
