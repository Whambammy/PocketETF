"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ETFDefinition } from "@/lib/constants";
import type { PythPriceData } from "@/lib/pyth";
import { TradePanel } from "@/components/TradePanel";
import { copyToClipboard } from "@/lib/clipboard";
import { MobileQRModal } from "@/components/MobileQRModal";
export default function ETFDetailClient({
  etf,
  queryStr = "",
}: {
  etf: ETFDefinition;
  queryStr?: string;
}) {
  const [prices, setPrices] = useState<Record<string, PythPriceData>>({});
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setOrigin(window.location.origin);
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const r = await fetch(
          "/api/prices?tickers=" +
            etf.targetAssets.map((a) => a.ticker).join(","),
          { signal: controller.signal },
        );
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (mounted) setPrices(data.prices);
      } catch {
        /* Existing timestamps remain visible; never relabel as fresh. */
      }
    };
    void load();
    const timer = setInterval(() => {
      setNow(Date.now());
      void load();
    }, 15000);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [etf]);
  const share =
    origin +
    "/etf/" +
    etf.id +
    (etf.id === "custom" && queryStr ? "?" + queryStr : "");
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <Link className="text-sm text-slate-400" href="/">
        ← All baskets
      </Link>
      <header className="flex gap-5 items-center">
        <img
          src={etf.iconPath}
          alt=""
          width={80}
          height={80}
          className="rounded-2xl"
        />
        <div>
          <p className="text-emerald-300 text-xs mb-2">{etf.category}</p>
          <h1 className="text-3xl sm:text-4xl font-bold">{etf.name}</h1>
          <p className="text-slate-400 mt-2">{etf.description}</p>
        </div>
      </header>
      <div className="flex flex-wrap gap-3">
        <button
          className="border border-slate-600 rounded-xl px-4 py-2 text-sm"
          onClick={async () =>
            setMessage(
              (await copyToClipboard(share))
                ? "Link copied"
                : "Could not copy link",
            )
          }
        >
          Copy share link
        </button>
        <button
          className="border border-slate-600 rounded-xl px-4 py-2 text-sm"
          onClick={() => setQr(true)}
        >
          Open on mobile
        </button>
        <a
          className="border border-slate-600 rounded-xl px-4 py-2 text-sm"
          href={
            "https://twitter.com/intent/tweet?url=" + encodeURIComponent(share)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on X
        </a>
        <span role="status" className="text-sm text-emerald-300">
          {message}
        </span>
      </div>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <section className="fintech-card rounded-2xl p-6 space-y-6">
          <h2 className="text-xl font-bold">Verified constituents</h2>
          {etf.targetAssets.map((a) => {
            const p = prices[a.ticker];
            const live =
              p?.status === "live" &&
              p.publishTime &&
              now - Date.parse(p.publishTime) <= 60000;
            return (
              <article
                key={a.mint}
                className="border-b border-white/10 pb-5 space-y-2"
              >
                <div className="flex justify-between">
                  <h3 className="font-bold">
                    {a.tokenSymbol}{" "}
                    <span className="font-normal text-slate-400">{a.name}</span>
                  </h3>
                  <span>{a.weightPercent}%</span>
                </div>
                <p className="text-sm">
                  {p?.formatted || "Price unavailable"}{" "}
                  <span
                    className={live ? "text-emerald-300" : "text-amber-300"}
                  >
                    ·{" "}
                    {live
                      ? "Live reference"
                      : p?.price
                        ? "Stale reference"
                        : "Unavailable"}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Oracle confidence: {p?.formattedConfidence || "Unavailable"} ·
                  Published{" "}
                  {p?.publishTime
                    ? new Date(p.publishTime).toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-slate-400">
                  {a.issuer} ·{" "}
                  {a.tokenProgram.startsWith("Tokenz")
                    ? "Token-2022"
                    : "SPL Token"}{" "}
                  · {a.decimals} decimals
                </p>
                <a
                  href={"https://explorer.solana.com/address/" + a.mint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 break-all block"
                >
                  {a.mint}
                </a>
                <a
                  href={a.provenanceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-300 underline"
                >
                  Issuer / asset source ↗
                </a>
                {a.kind === "equity" && (
                  <p className="text-xs text-amber-200">
                    Issuer restrictions apply. Balances may scale for corporate
                    actions; the issuer retains freeze and permanent-delegate
                    controls. Fresh underlying reference prices are required to
                    trade; the DEX price can differ.
                  </p>
                )}
              </article>
            );
          })}
          <p className="text-xs text-slate-400">
            Underlying equity exchange hours differ from DEX availability.
            Outside fresh oracle coverage, trading is blocked. No synthetic
            prices, returns or AUM are displayed.
          </p>
        </section>
        <TradePanel etf={etf} query={queryStr} />
      </div>
      <MobileQRModal
        isOpen={qr}
        onClose={() => setQr(false)}
        etfId={etf.id}
        etfName={etf.name}
        url={share}
      />
    </div>
  );
}
