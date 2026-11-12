import registry from "@/data/assets.json";

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;
export const USDC_ATOMIC_PER_UNIT = 1_000_000;
export const MAX_BASKET_ASSETS = 8;
export const MAX_ETF_ASSETS = MAX_BASKET_ASSETS;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const COMPUTE_UNIT_LIMIT = 1_400_000;
export const COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = 25_000;
export const DEFAULT_PLATFORM_FEE_BPS = 0;
// Monetization is disabled until a separately reviewed fee implementation exists.
export const CREATOR_FEE_SPLIT_PERCENT = 0;
export const MAX_PRIORITY_FEE_LAMPORTS = 100_000;
export const QUOTE_LIFETIME_MS = 45_000;
export interface ETFAsset {
  ticker: string;
  tokenSymbol: string;
  name: string;
  weightPercent: number;
  mint: string;
  decimals: number;
  tokenProgram: string;
  issuer: string;
  provenanceUrl: string;
  verifiedAt: string;
  color: string;
  category: string;
  kind: "equity" | "crypto";
  pythFeedId?: string;
  primaryDex?: string;
  underlyingPrice?: string;
  change24h?: string;
}
export type BasketAsset = ETFAsset;
export interface ETFDefinition {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  description: string;
  iconPath: string;
  category: string;
  targetAssets: ETFAsset[];
  colorGradient: { from: string; to: string };
}
export type BasketDefinition = ETFDefinition;
const colors = ["#10B981", "#38BDF8", "#A78BFA", "#FBBF24", "#F472B6"];
export const TOKEN_CATALOG: ETFAsset[] = registry.map((a, i) => ({
  ...a,
  weightPercent: 0,
  kind: a.ticker === "SOL" || a.ticker === "JUP" ? "crypto" : "equity",
  color: colors[i % colors.length],
  category:
    a.ticker === "SOL" || a.ticker === "JUP" ? "Crypto" : "Tokenized equities",
}));
export const STOCK_MINTS = Object.fromEntries(
  TOKEN_CATALOG.map((a) => [a.ticker, a.mint]),
);
export function findAsset(identity: string): ETFAsset | undefined {
  return TOKEN_CATALOG.find(
    (a) =>
      a.mint === identity ||
      a.ticker === identity.toUpperCase() ||
      a.tokenSymbol === identity,
  );
}
function basket(
  id: string,
  name: string,
  category: string,
  weights: [string, number][],
): ETFDefinition {
  return {
    id,
    name,
    symbol: "PETF",
    category,
    tagline: "Hold the underlying tokens in your wallet",
    description:
      weights.map(([s, w]) => w + "% " + s).join(", ") +
      ". Atomic basket execution; no pooled fund shares.",
    iconPath: "/etfs/" + id + ".png",
    colorGradient: { from: "#00D69F", to: "#146EF5" },
    targetAssets: weights.map(([s, w]) => {
      const a = findAsset(s);
      if (!a) throw new Error("Missing verified asset " + s);
      return { ...a, weightPercent: w };
    }),
  };
}
export const CURATED_ETFS: Record<string, ETFDefinition> = Object.fromEntries(
  [
    basket("silicon-ai", "Silicon AI Supercycle", "AI & Semiconductors", [
      ["NVDA", 60],
      ["TSM", 40],
    ]),
    basket("mag-titans", "Magnificent Tech Titans", "Mega-Cap Tech", [
      ["AAPL", 50],
      ["MSFT", 50],
    ]),
    basket("spy-benchmark", "S&P 500 Exposure", "Broad Market", [["SPY", 100]]),
    basket("nasdaq-growth", "Nasdaq Growth", "Broad Market", [
      ["QQQ", 60],
      ["AMZN", 40],
    ]),
    basket("hard-assets", "Gold & Treasuries", "Growth & Commodities", [
      ["GLD", 50],
      ["TLT", 50],
    ]),
    basket("crypto-frontier", "Solana & Jupiter", "Web3", [
      ["SOL", 50],
      ["JUP", 50],
    ]),
    basket("backpack-titans", "NVIDIA & Strategy", "Web3", [
      ["NVDA", 50],
      ["MSTR", 50],
    ]),
  ].map((b) => [b.id, b]),
);
export const PRE_BAKED_BASKETS: Record<string, ETFDefinition> = {
  "ai-chipset": CURATED_ETFS["silicon-ai"],
  "us-mega": CURATED_ETFS["mag-titans"],
  "index-proxy": CURATED_ETFS["spy-benchmark"],
};
export const ACTIONS_SPEC_VERSION = "2.1.3";
export const SOLANA_BLOCKCHAIN_ID = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": ACTIONS_SPEC_VERSION,
  "X-Blockchain-Ids": SOLANA_BLOCKCHAIN_ID,
  "Cache-Control": "no-store",
};
// Only actual compilation/simulation determines whether a basket fits.
export function getDEXConflictStatus(assets: ETFAsset[]) {
  return {
    isCompatible: assets.length > 0 && assets.length <= MAX_ETF_ASSETS,
    uniqueDexes: [] as string[],
    estimatedBytes: 0,
    statusLabel: "Capacity checked during trade preview",
  };
}
