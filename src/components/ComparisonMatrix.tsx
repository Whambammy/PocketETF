export function ComparisonMatrix() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-4xl font-bold">How PocketETF works</h1>
      <p className="text-slate-300">
        A basket is an allocation instruction. The assets remain individual
        tokens in your wallet.
      </p>
      <ol className="list-decimal pl-5 space-y-4 text-slate-300">
        <li>Choose verified token identities and exact weights.</li>
        <li>Connect a compatible wallet and request a trade preview.</li>
        <li>
          The server verifies balances and oracle data, builds Jupiter routes,
          checks fees and simulates the complete transaction.
        </li>
        <li>Review minimum receipts and costs, then sign in your wallet.</li>
        <li>
          The app submits the unchanged reviewed message and tracks on-chain
          confirmation.
        </li>
      </ol>
      <p className="text-sm text-slate-400">
        A brokerage account, a pooled on-chain index fund and a token basket
        have different ownership rights and risks. Network finality does not
        establish issuer redemption rights. Atomic execution prevents partial
        execution within one transaction; it does not prevent future allocation
        drift.
      </p>
    </section>
  );
}
