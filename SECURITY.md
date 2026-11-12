# Security

No software or blockchain integration can guarantee 100% security. This repository has automated security regression checks; those do not replace an independent audit.

## Funds and authorization

The app stores no wallet private keys and does not sign for users. Users approve atomic DEX swaps with their own wallets. The client checks that the wallet did not change the reviewed message; a stateless relay checks the message digest, actual Ed25519 signature and transaction lifetime before broadcasting.

The relay is a transport service, not an operator permission layer. Caller-supplied preview metadata is not a server attestation. The user's signature authorizes spending, and Solana enforces signature validity, recent blockhash lifetime and replay protection. Reusing the same signed transaction does not create a new purchase.

Preflight checks do not guarantee identical later bank state or prices. Jupiter minimum output amounts remain in the transaction. Off-chain oracle freshness is checked again on app-mediated submission. External Action clients submit through their own wallets and receive v0 transactions until v1 is explicitly negotiated.

## Trust assumptions

The operator controls deployment code, configuration and any optional service credentials. The app trusts the selected RPC providers, the pinned Jupiter program and routing service, Pyth's published reference prices, and the equity issuer. An issuer can freeze or delegate transfers, rebase balances, or halt trading. Verification of a mint's identity does not make its issuer or underlying collateral risk-free.

Simulation is evidence of execution at a particular bank state. It cannot prove that an upgradable program or remote provider is honest. Wallet approval should be reviewed independently.

## Operational controls

- Validate wallet behavior, simulation and transaction outcomes in the intended deployment. The app has no operator enablement switch.
- Protect any optional RPC/API credentials and Redis token in Vercel's server-side environment settings. No server signing secret is used.
- Keep the canonical app origin accurate. Deploy only behind HTTPS.
- Redis limits use global route buckets. These intentionally favor bounded upstream exposure over availability; tune them in code for the deployment's service budgets.
- Monitor upstream error rates and transaction outcomes without logging credentials or signed payloads.
- Use the lockfile, run dependency audits and update packages deliberately.
- Do not automatically rebuild/resubmit a new trade after an uncertain response. Check the original signature first.
- Previews are intentionally short-lived; expired previews need refreshing before signing.
- Asset registry maintenance requires reviewing issuer addresses and live on-chain token extensions.

## Disclosure

Report suspected vulnerabilities privately to the repository owner using the repository host's private security reporting channel when available. Do not post wallet secrets, credentials, personal identity records, or an exploit against real user funds in public issues. No monitored security email address is asserted by this repository.

## Before release

Run the offline regression suite, typecheck, production build, dependency audit and browser checks. Separately test supported wallet versions on desktop/mobile, hardware-wallet signing, live quote/expiry behavior, RPC failover, issuer transfer controls and operational recovery in an appropriately controlled environment. An independent audit is recommended for broader public use; it is not a runtime requirement or proof of complete security.
