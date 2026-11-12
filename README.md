# PocketETF

Self-custodied baskets of verified Solana tokens. PocketETF assembles atomic Jupiter swaps; it does not issue ETF shares or operate a pooled fund.

## Implemented

- A pinned registry of 23 issuer/crypto token identities, checked against actual mint accounts, token programs, decimals and exact Pyth symbols.
- Server validation of exact amounts, distinct mints and weights totaling 100%. Custom links retain case-sensitive mint addresses.
- Wallet Standard discovery, shared connection state and capability-gated v1 signing with v0 support.
- Jupiter Swap API V2 build instructions, bounded concurrent requests, explicit slippage and price-impact limits.
- Buy, percentage sell and manual rebalance previews. Rebalancing spends only minimum guaranteed sale proceeds; existing USDC is preserved and surplus remains USDC.
- Actual transaction size/account/compute checks, dynamic resource sizing, final simulation, minimum token receipt checks and SOL fee/rent estimates.
- The client compares the signed message with the reviewed transaction. A stateless relay verifies the user's wallet signature, message digest and lifetime; no operator authorization or server signing secret is required.
- Honest oracle availability and original timestamps. Missing, old or imprecise reference prices block trading.
- Portfolio valuation uses real token quantities, including RPC-scaled Token-2022 balances. Missing prices produce an incomplete valuation.
- On-chain status tracking, wallet-scoped browser-local history and CSV export with spreadsheet formula neutralization.
- No server fetching of user image URLs. Strict image allowlist, CSP nonces, security headers, bounded JSON responses and requests, and optional distributed rate limiting.
- No protocol fee or creator revenue share is collected.

## Local development

Use Node.js 22.14 or newer and the committed lockfile.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `npm.cmd` if execution policy prevents `npm.ps1`.

Swapping is available without operator enablement or a separate account approval service. Users authorize atomic swaps with their own wallets. Never put a private key or seed phrase in app configuration.

## Configuration

See [.env.example](.env.example). Deploy through the existing GitHub -> Vercel integration. There is no separate hosting service or release approval workflow in the app.

The server needs ordinary network access to Solana RPC, Jupiter and Pyth. Public RPC fallbacks and keyless Jupiter requests are supported. Keyless routing is paced to the published request limit; concurrent traffic may receive a retry message. A Jupiter API key and a dedicated HTTPS RPC endpoint are optional reliability improvements, configured in Vercel and kept server-side.

Redis rate limiting is optional. Without it, bounded per-instance request limits remain active. To share counters across instances, configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Neither Redis nor a server signing secret is required for a user to swap.

Set NEXT_PUBLIC_BASE_URL to the canonical HTTPS Vercel/custom domain for metadata and Action links. No deployment credentials or private keys belong in the repository.

## Asset provenance

The registry pins specific token addresses, token programs and issuer sources. Token identity checks and issuer transfer/pause controls remain technical protections. The app does not add geography checks, a platform account approval step or an external eligibility service. External token and service terms remain separate from the app's self-custody architecture. See the linked provenance for each asset.

## Execution boundaries

- At most eight registered assets per basket. This is a product cap, not a guarantee of transaction fit. v0 remains 1,232 bytes; v1 is 4,096 bytes with explicit limits. Both paths enforce a 64-account ceiling.
- External Solana Actions retain v0 because the endpoint has not negotiated v1 signing capabilities with the client.
- The UI requires the selected Wallet Standard `solana:signTransaction` feature to advertise the transaction version used. Sign-and-send-only wallets are not supported by this reviewed-message submission flow.
- Purchases use spendable USDC in the canonical associated account. Sales/rebalancing use spendable canonical associated accounts for the chosen tokens. Other accounts are visible but are not automatically consolidated.
- SOL basket exposure is wrapped SOL. Native SOL is kept separate for network fees.
- Only supported associated-account setup instructions and the pinned Jupiter program's current RouteV2 instruction layout are accepted. Encoded spend, recipient accounts, mint identities, slippage and zero platform/capture fees are independently checked. Unknown layouts, extra signers, tips, cleanup, unrelated wallet token access, unsupported token extensions and failed simulations are rejected.
- Pyth data must be no more than 60 seconds old with relative confidence at most 1%. Quote price impact and deviation from the reference price are capped at 3%. These are preflight gates, not on-chain oracle conditions; Jupiter minimum receipts enforce the transaction's output bounds.
- Equity oracles may stop updating outside exchange hours. This implementation deliberately blocks trading when the reference data is stale.
- A quote normally expires within 30 seconds after preparation and no later than 45 seconds after preparation starts. Wallet approval delays may require a fresh preview.
- A broadcast signature is not confirmation. Failed submitted transactions can still incur fees.
- History is local to this browser and may be incomplete. Use the explorer to resolve uncertain submission status before submitting another trade.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run audit
```

The regression suite uses real SDK compilation and cryptographic signatures with **mocked** Jupiter, oracle and RPC responses. It never submits real transactions.

For browser checks, start the app on `127.0.0.1:3210`, then run `npm run test:browser`. The test uses installed Microsoft Edge, intercepts price/trade endpoints, and supplies ephemeral mock wallets. Screenshots are written to the ignored `.test-artifacts/` directory. Browser testing in other operating systems requires configuring an installed Playwright browser.

Registry maintenance is explicit: `npm run sync:assets` contacts the issuer, Solana RPC and Hermes. Review all changed addresses, metadata, supported extensions and feeds before release. It is never run automatically during install or build.

## Security status

This is a hardened application implementation, **not an independent audit or a security guarantee**. Dependency advisories change. Live wallet/provider compatibility still needs validation. An independent security review is recommended; it is not an application permission gate.

See [SECURITY.md](SECURITY.md) for trust assumptions, reporting and release checks.
