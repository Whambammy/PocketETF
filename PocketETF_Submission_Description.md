# PocketETF — 1-Click Social Index Protocol on Solana

> **Wall Street indices, sized for your pocket and native to your social timeline.**

* **Live Protocol:** [https://pocketetf.vercel.app](https://pocketetf.vercel.app)
* **Creator Studio:** [https://pocketetf.vercel.app/studio](https://pocketetf.vercel.app/studio)
* **GitHub:** [https://github.com/Whambammy/PocketETF](https://github.com/Whambammy/PocketETF)
* **Official 𝕏:** [https://x.com/PocketETF](https://x.com/PocketETF)
* **Solana Action:** [https://pocketetf.vercel.app/api/actions/etf/silicon-ai](https://pocketetf.vercel.app/api/actions/etf/silicon-ai)

---

## ⚡ 60-Second Walkthrough (Live on Solana Mainnet)
*Zero mock data. Fully deployed and production-ready:*
1. **1-Click Buy & Pyth Oracles:** Open [pocketetf.vercel.app/etf/silicon-ai](https://pocketetf.vercel.app/etf/silicon-ai). Click **"Pyth Hermes Feeds (±σ)"** to inspect sub-second live prices & confidence intervals. Select $10 USDC and click **1-Click Buy**—routes multi-swaps into a single atomic `v0` transaction via Jupiter v6.
2. **Trade on Mobile:** Click **"Trade on Mobile (QR)"** on any ETF to open the QR modal. Scan with Phantom or Backpack Mobile to execute directly in your wallet browser.
3. **Studio & 𝕏 Simulation:** Visit [/studio](https://pocketetf.vercel.app/studio). Pick 2-3 stocks from the 25+ verified token catalog (NVDA, AAPL, TSM), adjust weights with the interactive donut chart, and toggle **"Feed View (𝕏)"** to preview the live Blink action card.
4. **Safety Suite:** Run `npm test` locally to verify 82 passing tests covering MTU limits, zero-dust math, and fallbacks.

---

## 📌 Executive Summary
**PocketETF** turns any investment thesis into a fractional equity index fund discovered and purchased directly inside social feeds in < 400ms. Powered by Solana Actions, Blinks, Pyth Hermes v2, and Jupiter, PocketETF eliminates brokerage friction, high fees, and fragmented swaps.

---

## 🚨 The Problem & 💡 The Solution
* **Context Switching & Drift:** Acting on a social thesis requires leaving feeds and manually executing multiple stock orders. PocketETF packages thematic baskets into a **Solana Blink URL** that executes in 1 click.
* **Recurring Fees:** Traditional ETFs charge 0.20%–1.50% annual expense ratios. PocketETF offers **0% expense ratios** with direct self-custody of underlying 1:1 backed SPL stocks.
* **Failed Multi-Swaps:** Chaining DEX swaps manually risks partial failure and burns gas. PocketETF synthesizes all swaps into a **single atomic VersionedTransaction (v0)**—all legs succeed or none do.

---

## ⚡ Architecture Flow

```
[Social Feed: X / Discord] ──> (1) Shares Blink: pocketetf.vercel.app/etf/silicon-ai
          │
          ▼
[Interactive Blink Card]   ──> (2) User selects amount ($50) & clicks "1-Click Buy"
          │
          ▼
[PocketETF Engine]         ──> (3) Injects 1.2M CU, checks balance, creates ATAs,
                               queries Pyth NAV & Jupiter v6 swap instructions
          │
          ▼
[Atomic v0 Tx (< 1232B)]   ──> (4) 1 biometric wallet approval signs all swaps
          │
          ▼
[Solana AMMs & Wallet]     ──> (5) Settles underlying stocks in wallet in < 400ms
```

---

## 🛡️ 5 Core Protocol Engineering Safeguards
1. **Strict 1232B MTU Guard:** Baskets capped at 3 assets with parallel-loaded ALTs, keeping `v0` tx size strictly under 1232B.
2. **1.2M Compute Budget & Priority Fees:** Pre-allocates CU and priority pricing to guarantee instant inclusion without out-of-gas reverts.
3. **Idempotent ATAs:** Injects `createAssociatedTokenAccountIdempotentInstruction` so non-holders receive tokens without collision.
4. **Zero-Dust Base-Unit Math:** Calculates allocations in integer base units (USDC 6 decimals). Truncation dust goes to the lead asset.
5. **Zero-Gas Balance Protection:** Pre-flight balance checks reject unfunded wallets before signing, preventing wasted network gas.

---

## 🔮 Sponsor Integrations
* **Pyth Network (Hermes v2):** Sub-second price feeds across 25+ tokenized assets with confidence intervals ($\pm\sigma$) and dynamic Basket NAV aggregation: `Basket NAV = Σ(w_i × P_i) ± Σ(w_i × σ_i)`.
* **Solana Actions & Blinks:** Spec v2.1.3 compliant with `/actions.json` wildcard discovery, universal CORS, and dynamic Twitter Card unfurl metadata.
* **Jupiter Aggregator (v6):** Optimal multi-hop routing across Whirlpool, Meteora, and Raydium.

---

## 🛠️ Architecture & Scalability
* **Zero-Backend Protocol:** 100% serverless and non-custodial. Portfolios serialize into URL-safe state with zero database reliance.
* **Stack:** Next.js 14, TypeScript (Strict), `@solana/web3.js`, Jupiter v6, Pyth Hermes v2.
* **SIMD-0385 Ready:** Ready to expand from 3 to 10+ asset funds once Solana activates Transaction V1 (4096B).
