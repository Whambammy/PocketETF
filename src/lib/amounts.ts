import { MAX_ETF_ASSETS, TOKEN_CATALOG, type ETFAsset } from "./constants";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
  }
}
export function parseUnits(
  value: unknown,
  decimals: number,
  max?: bigint,
): bigint {
  if (
    typeof value !== "string" ||
    value.length > 60 ||
    !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)
  )
    throw new AppError("Enter an exact positive decimal amount.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals)
    throw new AppError("Amount has too many decimal places.");
  const units =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");
  if (units <= 0n || (max !== undefined && units > max))
    throw new AppError("Amount is outside the allowed range.");
  return units;
}
export function formatUnits(value: bigint | string, decimals: number): string {
  const raw = BigInt(value);
  const base = 10n ** BigInt(decimals);
  return (
    (raw / base).toString() +
    (decimals
      ? "." + (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "")
      : ""
    ).replace(/\.$/, "")
  );
}
export function scaledUnits(
  value: bigint | string,
  decimals: number,
  multiplier = 1,
): string {
  if (!Number.isFinite(multiplier) || multiplier <= 0)
    throw new AppError("Invalid token multiplier.");
  if (multiplier === 1) return formatUnits(value, decimals);
  const factor = parseUnits(multiplier.toFixed(18), 18);
  // Display minimum receipts conservatively: never round the amount upward.
  return formatUnits((BigInt(value) * factor) / 10n ** 18n, decimals);
}
export function validateAssets(assets: ETFAsset[]): void {
  if (
    !Array.isArray(assets) ||
    !assets.length ||
    assets.length > MAX_ETF_ASSETS
  )
    throw new AppError("Choose 1–8 verified assets.");
  const seen = new Set<string>();
  let total = 0;
  for (const a of assets) {
    const known = TOKEN_CATALOG.find((t) => t.mint === a.mint);
    if (
      !known ||
      known.ticker !== a.ticker ||
      known.decimals !== a.decimals ||
      known.tokenProgram !== a.tokenProgram
    )
      throw new AppError("Unverified asset identity.");
    if (seen.has(a.mint))
      throw new AppError("Duplicate mint addresses are not allowed.");
    seen.add(a.mint);
    const bp = Math.round(a.weightPercent * 100);
    if (
      !Number.isFinite(a.weightPercent) ||
      bp < 1 ||
      bp > 10000 ||
      Math.abs(bp - a.weightPercent * 100) > 1e-7
    )
      throw new AppError(
        "Weights must be positive with at most two decimal places.",
      );
    total += bp;
  }
  if (total !== 10000)
    throw new AppError("Basket weights must add up to exactly 100%.");
}
export function allocate(total: bigint, assets: ETFAsset[]): bigint[] {
  validateAssets(assets);
  if (total <= 0n) throw new AppError("Amount must be positive.");
  const result = assets.map(
    (a) => (total * BigInt(Math.round(a.weightPercent * 100))) / 10000n,
  );
  const largest = assets.reduce(
    (best, a, i) => (a.weightPercent > assets[best].weightPercent ? i : best),
    0,
  );
  result[largest] += total - result.reduce((s, n) => s + n, 0n);
  if (result.some((n) => n <= 0n))
    throw new AppError("Amount is too small for this allocation.");
  return result;
}
