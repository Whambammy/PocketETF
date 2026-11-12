"use client";
import { useState } from "react";
import Link from "next/link";
import {
  TOKEN_CATALOG,
  findAsset,
  type ETFDefinition,
  type ETFAsset,
} from "@/lib/constants";
import { serializeBasket } from "@/lib/etfResolver";
import { validateAssets } from "@/lib/amounts";
import { validateImageUrl } from "@/lib/imageResolver";
export default function Studio() {
  const [name, setName] = useState("My Basket");
  const [description, setDescription] = useState(
    "My allocation of verified Solana tokens.",
  );
  const [assets, setAssets] = useState<ETFAsset[]>(
    TOKEN_CATALOG.filter((a) => a.kind === "crypto").map((a) => ({
      ...a,
      weightPercent: 50,
    })),
  );
  const [identity, setIdentity] = useState("");
  const [image, setImage] = useState("/etfs/custom.png");
  const [error, setError] = useState("");
  let href = "";
  try {
    const etf: ETFDefinition = {
      id: "custom",
      name: name.trim(),
      description,
      iconPath: validateImageUrl(image),
      targetAssets: assets,
      symbol: "CUSTOM",
      tagline: "",
      category: "Custom",
      colorGradient: { from: "#10B981", to: "#146EF5" },
    };
    if (!etf.name || etf.name.length > 60) throw new Error();
    validateAssets(assets);
    href = "/etf/custom?" + serializeBasket(etf);
  } catch {
    /* invalid drafts remain editable */
  }
  const add = () => {
    setError("");
    const known = findAsset(identity.trim());
    if (!known) {
      setError(
        "This mint is not in the verified registry. Unknown tokens cannot be traded.",
      );
      return;
    }
    if (assets.length >= 8 || assets.some((a) => a.mint === known.mint)) {
      setError("Choose up to eight distinct assets.");
      return;
    }
    setAssets([...assets, { ...known, weightPercent: 1 }]);
    setIdentity("");
  };
  const normalize = () => {
    if (!assets.length) return;
    const bp = Math.floor(10000 / assets.length);
    setAssets(
      assets.map((a, i) => ({
        ...a,
        weightPercent: (bp + (i === 0 ? 10000 - bp * assets.length : 0)) / 100,
      })),
    );
  };
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-7">
      <h1 className="text-4xl font-bold">Creator Studio</h1>
      <p className="text-slate-400">
        Create a shareable allocation of verified assets. Every link preserves
        the exact mint addresses and weights.
      </p>
      <div className="fintech-card rounded-2xl p-6 space-y-5">
        <label className="block text-sm">
          Basket name
          <input
            className="field"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            className="field"
            value={description}
            maxLength={250}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Badge image
          <input
            className="field"
            value={image}
            maxLength={500}
            onChange={(e) => setImage(e.target.value)}
          />
        </label>
        <p className="text-xs text-slate-400">
          Use /etfs/custom.png or a direct HTTPS PNG, JPEG or WebP URL on
          i.imgur.com or i.postimg.cc. Gallery pages and SVGs are not accepted.
        </p>
        <div className="space-y-3">
          {assets.map((a) => (
            <div key={a.mint} className="flex gap-3 items-center">
              <span className="w-24 font-semibold">{a.tokenSymbol}</span>
              <label className="flex-1 text-xs">
                Weight %
                <input
                  aria-label={a.tokenSymbol + " weight percent"}
                  className="field"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={a.weightPercent}
                  onChange={(e) =>
                    setAssets(
                      assets.map((t) =>
                        t.mint === a.mint
                          ? { ...t, weightPercent: Number(e.target.value) }
                          : t,
                      ),
                    )
                  }
                />
              </label>
              <button
                aria-label={"Remove " + a.tokenSymbol}
                className="text-red-300 text-xs"
                onClick={() =>
                  setAssets(assets.filter((t) => t.mint !== a.mint))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span>
            Total: {assets.reduce((s, a) => s + a.weightPercent, 0).toFixed(2)}%
          </span>
          <button className="text-emerald-300 underline" onClick={normalize}>
            Equal weights
          </button>
        </div>
        <label className="block text-sm">
          Add a verified asset
          <select
            className="field"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
          >
            <option value="">Choose a token</option>
            {TOKEN_CATALOG.filter(
              (a) => !assets.some((t) => t.mint === a.mint),
            ).map((a) => (
              <option key={a.mint} value={a.mint}>
                {a.tokenSymbol} · {a.issuer}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Or paste an exact verified mint
          <input
            className="field"
            value={identity}
            maxLength={44}
            onChange={(e) => setIdentity(e.target.value.trim())}
          />
        </label>
        <button
          className="border border-slate-600 rounded-lg px-4 py-2"
          onClick={add}
        >
          Add asset
        </button>
        {error && (
          <p role="alert" className="text-red-300 text-sm">
            {error}
          </p>
        )}
        {href ? (
          <Link
            className="btn-cobalt block text-center rounded-xl px-5 py-3 font-semibold"
            href={href}
          >
            Review and share basket →
          </Link>
        ) : (
          <p className="text-amber-200 text-sm">
            Choose 1–8 distinct verified tokens, an approved image, a name and
            weights totaling exactly 100%.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Final capacity depends on wallet capabilities and actual transaction
        size, accounts and compute. Creator revenue sharing is not enabled. All
        swaps require your wallet signature.
      </p>
    </div>
  );
}
