import { TOKEN_CATALOG, type ETFAsset } from "./constants";
import { AppError } from "./amounts";
import { fetchJson } from "./server";
export interface PythPriceData {
  ticker: string;
  price: number | null;
  formatted: string;
  confidence: number | null;
  confidencePercent: number | null;
  formattedConfidence: string;
  publishTime: string | null;
  feedId: string | null;
  status: "live" | "stale" | "unavailable";
  marketOpen: boolean | null;
  updatedAt: string | null;
  change24h: string;
}
export const PYTH_FEED_IDS = Object.fromEntries(
  TOKEN_CATALOG.filter((a) => a.pythFeedId).map((a) => [
    a.ticker,
    a.pythFeedId!,
  ]),
);
const cache = new Map<string, { data: PythPriceData; until: number }>();
let pending: Promise<Record<string, PythPriceData>> | undefined;
export function unavailable(ticker: string, feedId?: string): PythPriceData {
  return {
    ticker,
    price: null,
    formatted: "Unavailable",
    confidence: null,
    confidencePercent: null,
    formattedConfidence: "Unavailable",
    publishTime: null,
    feedId: feedId || null,
    status: "unavailable",
    marketOpen: null,
    updatedAt: null,
    change24h: "—",
  };
}
export function parsePythPrice(
  ticker: string,
  feedId: string,
  item: unknown,
  now = Date.now(),
): PythPriceData {
  const data = item as {
    id?: string;
    price?: { price: string; conf: string; expo: number; publish_time: number };
  };
  if (data?.id?.replace(/^0x/, "") !== feedId.replace(/^0x/, ""))
    return unavailable(ticker, feedId);
  const p = data.price;
  if (!p || !Number.isInteger(p.expo) || p.expo < -18 || p.expo > 18)
    return unavailable(ticker, feedId);
  const price = Number(p.price) * 10 ** p.expo;
  const confidence = Number(p.conf) * 10 ** p.expo;
  const age = now - Number(p.publish_time) * 1000;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    !Number.isFinite(age) ||
    age < -5000
  )
    return unavailable(ticker, feedId);
  const publishTime = new Date(p.publish_time * 1000).toISOString();
  return {
    ticker,
    price,
    confidence,
    confidencePercent: (confidence / price) * 100,
    formatted: price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 6,
    }),
    formattedConfidence: "±$" + confidence.toPrecision(3),
    publishTime,
    feedId,
    status: age <= 60000 ? "live" : "stale",
    marketOpen: null,
    updatedAt: publishTime,
    change24h: "—",
  };
}
async function load(): Promise<Record<string, PythPriceData>> {
  const assets = TOKEN_CATALOG;
  const fresh = assets.every(
    (a) => (cache.get(a.ticker)?.until || 0) > Date.now(),
  );
  if (fresh)
    return Object.fromEntries(
      assets.map((a) => [a.ticker, cache.get(a.ticker)!.data]),
    );
  const ids = assets
    .filter((a) => a.pythFeedId)
    .map((a) => "ids[]=" + encodeURIComponent(a.pythFeedId!))
    .join("&");
  let parsed: unknown[] = [];
  try {
    const data = await fetchJson<{ parsed?: unknown[] }>(
      "https://hermes.pyth.network/v2/updates/price/latest?" + ids,
    );
    parsed = Array.isArray(data.parsed) ? data.parsed : [];
  } catch {
    /* unavailable is explicit; never synthesize prices */
  }
  const result: Record<string, PythPriceData> = {};
  for (const a of assets) {
    const item = parsed.find(
      (v) =>
        (v as { id?: string }).id?.replace(/^0x/, "") ===
        a.pythFeedId?.replace(/^0x/, ""),
    );
    let data =
      a.pythFeedId && item
        ? parsePythPrice(a.ticker, a.pythFeedId, item)
        : unavailable(a.ticker, a.pythFeedId);
    // Preserve a genuine last known price, with its original timestamp, only for display.
    if (data.status === "unavailable") {
      const previous = cache.get(a.ticker)?.data;
      if (previous?.price !== null && previous?.price !== undefined)
        data = { ...previous, status: "stale" };
    }
    result[a.ticker] = data;
    cache.set(a.ticker, { data, until: Date.now() + 5000 });
  }
  return result;
}
export async function getPythPricesForAssets(
  assets: Pick<ETFAsset, "ticker">[] = TOKEN_CATALOG,
) {
  if (!pending)
    pending = load().finally(() => {
      pending = undefined;
    });
  const all = await pending;
  return Object.fromEntries(
    assets.map((a) => [a.ticker, all[a.ticker] || unavailable(a.ticker)]),
  );
}
export function requireFreshPrice(data: PythPriceData | undefined): number {
  if (
    !data ||
    data.price === null ||
    data.status !== "live" ||
    !data.publishTime ||
    Date.now() - Date.parse(data.publishTime) > 60000 ||
    data.confidencePercent === null ||
    data.confidencePercent > 1
  )
    throw new AppError(
      "A fresh, sufficiently precise oracle price is required. Trading paused for this asset.",
      503,
      "ORACLE_UNAVAILABLE",
    );
  return data.price;
}
export function portfolioValue(
  holdings: { ticker: string; quantity: number }[],
  prices: Record<string, PythPriceData>,
) {
  let value = 0;
  const missing: string[] = [];
  for (const h of holdings) {
    const p = prices[h.ticker];
    if (p?.status !== "live" || p.price === null) {
      missing.push(h.ticker);
      continue;
    }
    value += h.quantity * p.price;
  }
  return { value: missing.length ? null : value, knownValue: value, missing };
}
