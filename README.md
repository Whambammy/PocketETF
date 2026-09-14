<div align="center">

# PocketETF 🚀
### 1-Click Tokenized Stock & Index ETF Protocol for Solana Blinks

[![Solana Actions](https://img.shields.io/badge/Solana%20Actions-v2.1.3-14F195?style=flat-square&logo=solana)](https://actions.dialect.to)
[![Jupiter DEX](https://img.shields.io/badge/DEX%20Routing-Jupiter%20v6-00D69F?style=flat-square)](https://jup.ag)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**PocketETF** is a decentralized execution protocol that bundles diversified tokenized US stocks, S&P 500 benchmarks, and commodities into a single atomic transaction native to **Solana Actions & Blinks**.

[Explore Curated ETFs](https://pocketetf.solana.app) • [Test in Dialect Inspector](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/silicon-ai) • [Creator Studio](https://pocketetf.solana.app/studio)

</div>

---

## 📌 Executive Overview

Traditional ETF investing on Solana suffers from severe friction: purchasing multiple tokenized equities (e.g. NVDA, TSM, AMD) requires multiple separate wallet confirmations, multiple DEX swaps, high cumulative fees, and the risk of partial execution failure.

**PocketETF solves this end-to-end**:
* **1-Click Social Execution**: Shareable directly inside Twitter/X feeds, Telegram, Discord, and Phantom/Backpack wallets via the official Solana Actions & Blinks standard.
* **Single Atomic Transaction**: Swaps USDC into up to 3 diversified assets in a single `VersionedTransaction (v0)`. Either all swaps execute or none do—eliminating partial portfolio drift.
* **Creator Studio**: Enables anyone to construct a custom stock ETF, adjust weights with interactive dynamic donut charts, and generate an instant Blink Action URL.
* **Real-Time Oracles**: Powered by Pyth Network and Jupiter on-chain AMM feeds.

---

## ⚡ Core Protocol Engineering & Safeguards

Executing multi-token swaps inside a single Solana transaction presents hard technical constraints. PocketETF enforces 5 protocol safeguards:

```
                  ┌─────────────────────────────────────────┐
                  │          PocketETF Blink URL            │
                  │   /api/actions/etf/silicon-ai?amount=50 │
                  └────────────────────┬────────────────────┘
                                       │ (1) User signs $50 USDC
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       PocketETF Execution Engine        │
                  ├─────────────────────────────────────────┤
                  │ • 1.2M ComputeBudget + Priority Fee     │
                  │ • Pre-create Idempotent ATAs            │
                  │ • Atomic Zero-Dust Math (Base Units)    │
                  │ • Fetch Jupiter v6 Swap Instructions    │
                  │ • Deduplicate Address Lookup Tables     │
                  └────────────────────┬────────────────────┘
                                       │ (2) Compile v0 Tx (<1232B)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        Solana Runtime & DEX AMMs        │
                  │    [NVDA 40%]   [TSM 30%]   [AMD 30%]   │
                  └─────────────────────────────────────────┘
```

### 1. Strict 1232-Byte IPv6 MTU Guard
* **The Problem**: Solana transactions strictly fail if serialized size exceeds 1232 bytes. Multiple Jupiter swap instructions combined with account keys easily overflow this limit.
* **PocketETF Solution**: Baskets are capped at 3 assets per Blink. All Address Lookup Tables (ALTs) are deduplicated, loaded in parallel, and compiled strictly to `VersionedTransaction` (v0), guaranteeing payload size remains well under 1232 bytes.

### 2. 1.2M Compute Unit Budget & Priority Pricing
* Default 200,000 CU fails when chaining multi-leg DEX swaps. PocketETF prepends `ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 })` and `setComputeUnitPrice({ microLamports: 50_000 })` to ensure instant inclusion without out-of-gas reverts.

### 3. Idempotent Associated Token Accounts (ATAs)
* If an investor does not yet hold an equity token, the transfer fails. PocketETF automatically injects `createAssociatedTokenAccountIdempotentInstruction` for all output tokens before DEX routing. If an ATA already exists, execution continues smoothly without collision.

### 4. Zero-Dust Atomic Allocation Math
* Dollar allocations are computed in integer base units (e.g. 6 decimals for USDC = $1.00 = `1,000,000` base units). Truncation dust is tracked and assigned to the primary asset so 100% of input capital is deployed.

### 5. Multi-RPC Failover Rotation
* High-availability RPC cluster rotates between primary endpoints (Helius, QuickNode, Solana Mainnet-Beta) with automated retry on HTTP 429 rate limits.

---

## 📊 Curated PocketETFs

| ETF ID | Name | Holdings | Category | Dialect Test Link |
| :--- | :--- | :--- | :--- | :--- |
| `silicon-ai` | **Silicon AI Supercycle** | 40% NVDA, 30% TSM, 30% AMD | Semiconductors & AI | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/silicon-ai) |
| `mag-titans` | **Magnificent Tech Titans** | 34% AAPL, 33% MSFT, 33% GOOGL | Mega-Cap Tech | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/mag-titans) |
| `spy-benchmark` | **S&P 500 Benchmark Proxy** | 100% SPY | Broad Market Index | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/spy-benchmark) |
| `nasdaq-growth` | **Nasdaq-100 Growth Titans** | 50% QQQ, 25% AMZN, 25% META | Growth Equities | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/nasdaq-growth) |
| `hard-assets` | **All-Weather Gold & Yield** | 50% GLD, 50% TLT | Commodities & Yield | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/hard-assets) |
| `crypto-frontier` | **Web3 & DEX Infrastructure** | 50% COIN, 25% SOL, 25% JUP | Crypto Equities | [Open in Dialect](https://dial.to/?action=solana-action:https://pocketetf.solana.app/api/actions/etf/crypto-frontier) |

---

## 🛠️ Solana Actions & Blinks Specification

PocketETF strictly follows the official [Solana Actions Spec v2.1.3](https://docs.dialect.to/blinks/actions-specification):

* **Discovery Rules (`/actions.json`)**: Wildcard mapping routes `/etf/*` and `/basket/*` to corresponding API endpoints.
* **Universal CORS**: All endpoints include wildcard CORS (`Access-Control-Allow-Origin: *`) and handle preflight `OPTIONS` requests.
* **Header Compliance**: Responses include `x-action-version: 2.1.3` and `x-blockchain-ids: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`.
* **Input Validation**: All POST requests validate Base58 public keys, bounded investment amounts ($0.10 – $100,000), and sanitize inputs against XSS.

---

## 💻 Tech Stack

* **Framework**: Next.js 14+ (App Router, Turbopack, React 18)
* **Language & Typing**: TypeScript 5.7 (Strict Mode)
* **Solana SDK**: `@solana/web3.js` (v0 VersionedTransactions, AddressLookupTableAccount), `@solana/spl-token`
* **DEX Routing**: Jupiter Aggregator v6 REST API
* **Styling & Tokens**: Tailwind CSS, Lucide React, Custom Dark Mode Tokens
* **Charts**: Real-time dynamic SVG Donut Chart engine

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Whambammy/PocketEFT.git
cd PocketEFT
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
*(Optional: add your dedicated Helius or QuickNode RPC URL in `.env.local`)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Verification & Testing Suite

```bash
# Run automated 21-point protocol audit (CORS, actions.json, Solana spec, price feeds)
npm run audit

# Run TypeScript compilation check
npx tsc --noEmit

# Test zero-dust integer math allocations
npm run test:dust
```

---

## 📄 License
MIT License. Open-source decentralized finance infrastructure for the Solana ecosystem.
