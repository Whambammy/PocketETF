import Link from "next/link";
import { CURATED_ETFS, TOKEN_CATALOG } from "@/lib/constants";
import { FAQSection } from "@/components/FAQSection";
export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-14 space-y-14">
      <section className="max-w-3xl space-y-6">
        <span className="inline-flex rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300">
          Self-custody · Atomic execution · Solana
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
          Your basket.
          <br />
          <span className="brand-text-gradient">Your wallet.</span>
        </h1>
        <p className="text-slate-300 text-lg">
          Build an allocation, review the actual token amounts and fees, and
          approve one atomic transaction. Keep every token in your own wallet.
        </p>
        <div className="flex gap-3">
          <a
            href="#etfs"
            className="btn-cobalt px-5 py-3 rounded-xl font-semibold"
          >
            Explore baskets
          </a>
          <Link
            href="/studio"
            className="border border-slate-600 px-5 py-3 rounded-xl"
          >
            Create a basket
          </Link>
        </div>
      </section>
      <aside className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 text-sm text-amber-100">
        You approve swaps with your own wallet. PocketETF never holds your
        funds. Review token identities, minimum receipts and fees before
        signing.
      </aside>
      <section id="etfs" className="space-y-6">
        <h2 className="text-2xl font-bold">Curated baskets</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.values(CURATED_ETFS).map((etf) => (
            <article
              key={etf.id}
              className="fintech-card fintech-card-hover rounded-2xl p-6 space-y-5"
            >
              <img
                src={etf.iconPath}
                alt=""
                width={64}
                height={64}
                className="rounded-xl"
              />
              <div>
                <p className="text-xs text-emerald-300 mb-2">{etf.category}</p>
                <h3 className="text-xl font-bold">{etf.name}</h3>
              </div>
              <div className="space-y-2">
                {etf.targetAssets.map((a) => (
                  <div key={a.mint} className="flex justify-between text-sm">
                    <span>{a.tokenSymbol}</span>
                    <span>{a.weightPercent}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {etf.targetAssets.some((a) => a.kind === "equity")
                  ? "Verified tokenized assets"
                  : "Verified crypto tokens · wSOL stays wrapped"}
              </p>
              <Link
                href={"/etf/" + etf.id}
                className="block text-center btn-cobalt rounded-xl py-3 font-semibold"
              >
                Review basket →
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="space-y-5">
        <h2 className="text-2xl font-bold">Know what you own</h2>
        <p className="text-sm text-slate-400">
          {TOKEN_CATALOG.length} issuer/crypto identities checked against
          on-chain mint metadata. Open a basket to inspect provenance, token
          program and decimals. Identity verification does not remove issuer or
          market risk.
        </p>
        <div className="flex gap-2 flex-wrap">
          {TOKEN_CATALOG.map((a) => (
            <a
              href={a.provenanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              key={a.mint}
              className="rounded-full border border-slate-700 px-3 py-2 text-xs"
            >
              {a.tokenSymbol} ↗
            </a>
          ))}
        </div>
      </section>
      <FAQSection />
    </div>
  );
}
