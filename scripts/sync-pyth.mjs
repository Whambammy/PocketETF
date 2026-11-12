import fs from "node:fs/promises";
const assets = JSON.parse(await fs.readFile("src/data/assets.json", "utf8"));
for (const asset of assets) {
  const symbol =
    (asset.ticker === "SOL" || asset.ticker === "JUP"
      ? "Crypto."
      : "Equity.US.") +
    asset.ticker +
    "/USD";
  const response = await fetch(
    "https://hermes.pyth.network/v2/price_feeds?query=" +
      encodeURIComponent(symbol),
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Pyth feed registry unavailable");
  const match = (await response.json()).find(
    (feed) => feed.attributes?.symbol === symbol,
  );
  if (match) {
    asset.pythFeedId = match.id;
    asset.oracleSymbol = symbol;
  } else
    console.log(
      asset.ticker + ": no matching oracle; execution will be blocked",
    );
}
await fs.writeFile(
  "src/data/assets.json",
  JSON.stringify(assets, null, 2) + "\n",
);
console.log("Verified exact Pyth symbols and identifiers.");
