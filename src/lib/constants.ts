import registry from "@/data/assets.json";
import presentation from "@/data/presentation.json";

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
  metrics?: {
    aumSimulated?: string;
    benchmarkYield?: string;
    volatility?: string;
  };
}
export type BasketDefinition = ETFDefinition;
export const TOKEN_CATALOG: ETFAsset[] = registry.map((a) => {
  const display = presentation.assets.find((item) => item.ticker === a.ticker);
  return {
    ...a,
    name: display?.name || a.name,
    weightPercent: 0,
    kind: a.ticker === "SOL" || a.ticker === "JUP" ? "crypto" : "equity",
    color: display?.color || "#10B981",
    category: display?.category || "Web3 Equities",
  };
});
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
export const CURATED_ETFS: Record<string, ETFDefinition> = Object.fromEntries(
  presentation.baskets.map(({ weights, ...display }) => [
    display.id,
    {
      ...display,
      metrics: {
        ...display.metrics,
        aumSimulated: "Not tracked",
        benchmarkYield: "Not tracked",
      },
      targetAssets: weights.map(({ ticker, weightPercent }) => {
        const verified = findAsset(ticker);
        if (!verified) throw new Error("Missing verified asset " + ticker);
        return { ...verified, weightPercent };
      }),
    },
  ]),
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
export function getDEXConflictStatus(assets: readonly unknown[]) {
  return {
    isCompatible: assets.length > 0 && assets.length <= MAX_ETF_ASSETS,
    uniqueDexes: [] as string[],
    estimatedBytes: 0,
    statusLabel: "Capacity checked during trade preview",
    reason:
      assets.length > MAX_ETF_ASSETS
        ? "Choose up to eight assets; actual capacity is checked during trade preview."
        : undefined,
  };
}
