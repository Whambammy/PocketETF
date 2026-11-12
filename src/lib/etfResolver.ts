import {
  CURATED_ETFS,
  PRE_BAKED_BASKETS,
  findAsset,
  type ETFDefinition,
} from "./constants";
import { validateAssets } from "./amounts";
import { validateImageUrl } from "./imageResolver";
export function safeDecode(val: string): string {
  return val;
} // URLSearchParams already decoded once.
export function resolveETF(
  id: string,
  sp: URLSearchParams,
): ETFDefinition | null {
  if (Object.hasOwn(CURATED_ETFS, id)) return CURATED_ETFS[id];
  if (Object.hasOwn(PRE_BAKED_BASKETS, id)) return PRE_BAKED_BASKETS[id];
  if (id !== "custom") return null;
  try {
    for (const key of ["assets", "name", "description", "image"])
      if (sp.getAll(key).length > 1) return null;
    const raw = sp.get("assets");
    if (!raw || raw.length > 1000) return null;
    const assets = raw.split(",").map((pair) => {
      const parts = pair.split(":");
      if (parts.length !== 2 || !/^\d+(\.\d{1,2})?$/.test(parts[1]))
        throw new Error();
      const known = findAsset(parts[0]);
      if (!known) throw new Error();
      return { ...known, weightPercent: Number(parts[1]) };
    });
    validateAssets(assets);
    const name = (sp.get("name") || "Custom Basket").trim().slice(0, 60);
    const description = (
      sp.get("description") || "A self-custodied basket of verified tokens."
    )
      .trim()
      .slice(0, 250);
    if (!name || /[\u0000-\u001f]/.test(name + description)) return null;
    return {
      id: "custom",
      name,
      symbol: "CUSTOM",
      description,
      tagline: "Your allocation, your wallet",
      category: "Custom",
      iconPath: validateImageUrl(sp.get("image") || "/etfs/custom.png"),
      colorGradient: { from: "#10B981", to: "#146EF5" },
      targetAssets: assets,
    };
  } catch {
    return null;
  }
}
export function serializeBasket(etf: ETFDefinition): string {
  validateAssets(etf.targetAssets);
  return new URLSearchParams({
    assets: etf.targetAssets
      .map((a) => a.mint + ":" + a.weightPercent)
      .join(","),
    name: etf.name,
    description: etf.description,
    image: validateImageUrl(etf.iconPath),
  }).toString();
}
