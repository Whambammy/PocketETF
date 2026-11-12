export function FAQSection() {
  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold">Before you trade</h2>
      {[
        [
          "What do I own?",
          "Individual tokens in your own wallet. PocketETF does not mint ETF shares, provide a pooled fund, or promise returns.",
        ],
        [
          "What does atomic mean?",
          "All instructions in one transaction succeed together or revert together. A failed submitted transaction can still incur network fees.",
        ],
        [
          "Can I sell or rebalance?",
          "Open a basket and select Sell or Rebalance. A fresh quote, compatible wallet, sufficient spendable associated-account holdings and successful simulation are required. Other wallet accounts are displayed but are not automatically consolidated.",
        ],
        [
          "Which wallets work?",
          "Wallet Standard wallets that advertise Solana mainnet signing. v1 is used only when the connected signing feature advertises version 1; otherwise the app uses v0.",
        ],
        [
          "Who controls my swaps?",
          "You approve every transaction in your wallet. PocketETF assembles atomic DEX swaps and does not approve accounts or hold assets. Individual tokens and external providers retain their own terms and technical controls.",
        ],
        [
          "What do prices mean?",
          "Pyth prices are underlying reference prices. Executable DEX quotes may differ. Missing or stale oracle data blocks trading. Reference portfolio values are estimates, not redemption guarantees.",
        ],
        [
          "What are the fees?",
          "PocketETF currently charges no protocol or creator fee. DEX costs are included in quotes. Network fees and new-account rent are disclosed in each preview.",
        ],
        [
          "Is this risk free?",
          "No. Wallets, RPC services, issuers, smart contracts and markets all introduce risks. Only approve trades you understand. Never share seed phrases.",
        ],
      ].map(([q, a]) => (
        <details key={q} className="fintech-card rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">{q}</summary>
          <p className="mt-3 text-sm text-slate-300">{a}</p>
        </details>
      ))}
    </section>
  );
}
