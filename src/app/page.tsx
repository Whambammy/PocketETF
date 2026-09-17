'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Code2,
  Cpu,
  TrendingUp,
  Activity,
  DollarSign,
  Info,
  CheckCircle2,
  Sliders,
  Database,
  BarChart3,
  Search,
  Wallet,
  Share2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { CURATED_ETFS, ETFDefinition, TOKEN_CATALOG } from '@/lib/constants';
import { ComparisonMatrix } from '@/components/ComparisonMatrix';
import { FAQSection } from '@/components/FAQSection';

export default function HomePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeJsonETF, setActiveJsonETF] = useState<ETFDefinition | null>(null);
  const [showBlinkGuide, setShowBlinkGuide] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<{
    sol: number;
    usdc: number;
    formattedSol: string;
    formattedUsdc: string;
  } | null>(null);
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({
    'silicon-ai': 10,
    'mag-titans': 10,
    'spy-benchmark': 10,
    'nasdaq-growth': 10,
    'hard-assets': 10,
    'crypto-frontier': 10,
    'backpack-titans': 10,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [origin, setOrigin] = useState<string>('https://pocketetf.solana.app');
  const [simulationState, setSimulationState] = useState<
    Record<string, { loading: boolean; result?: any; error?: string }>
  >({});
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [livePrices, setLivePrices] = useState<
    Record<string, { formatted: string; change24h: string; price: number }>
  >({});
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    // Live Price Polling from Pyth & Jupiter via /api/prices
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.prices) {
            setLivePrices(data.prices);
            setIsLiveActive(true);
          }
        }
      } catch {
        // Fallback silently to static baseline
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState<boolean>(false);

  const fetchBalance = async (account: string) => {
    try {
      const res = await fetch(`/api/wallet/balance?account=${account}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWalletBalance({
            sol: data.sol,
            usdc: data.usdc,
            formattedSol: data.formattedSol,
            formattedUsdc: data.formattedUsdc,
          });
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).solana?.isConnected) {
      const addr = (window as any).solana.publicKey?.toString() || null;
      setWalletAddress(addr);
      if (addr) fetchBalance(addr);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress);
      const timer = setInterval(() => fetchBalance(walletAddress), 15000);
      return () => clearInterval(timer);
    } else {
      setWalletBalance(null);
    }
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined') return;
    const solana = (window as any).solana;
    if (!solana) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    setWalletConnecting(true);
    try {
      const resp = await solana.connect();
      const addr = resp.publicKey.toString();
      setWalletAddress(addr);
      fetchBalance(addr);
    } catch (err) {
      console.warn('Wallet connection cancelled', err);
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleCopyBlink = async (id: string) => {
    const actionUrl = `${origin}/api/actions/etf/${id}`;
    await navigator.clipboard.writeText(actionUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLiveBuy = async (etfId: string) => {
    setSimulationState((prev) => ({
      ...prev,
      [etfId]: { loading: true, error: undefined, result: undefined },
    }));

    try {
      const solana = typeof window !== 'undefined' ? (window as any).solana : null;
      if (!solana) {
        throw new Error('Solana wallet not detected. Install Phantom, Backpack, or Solflare to execute live on Solana Mainnet.');
      }

      let activeAccount = walletAddress;
      if (!activeAccount) {
        const resp = await solana.connect();
        activeAccount = resp.publicKey.toString();
        setWalletAddress(activeAccount);
      }

      if (!activeAccount) {
        throw new Error('Could not retrieve active wallet address.');
      }

      const amount = selectedAmounts[etfId] || 10;

      // Zero-Gas Pre-Flight Wallet Check
      let currentUsdc = walletBalance?.usdc;
      try {
        const balRes = await fetch(`/api/wallet/balance?account=${activeAccount}`);
        if (balRes.ok) {
          const balData = await balRes.json();
          if (balData.success) {
            currentUsdc = balData.usdc;
            setWalletBalance({
              sol: balData.sol,
              usdc: balData.usdc,
              formattedSol: balData.formattedSol,
              formattedUsdc: balData.formattedUsdc,
            });
          }
        }
      } catch {
        // fallback to cached walletBalance
      }

      if (typeof currentUsdc === 'number' && currentUsdc < amount) {
        throw new Error(
          `Zero-Gas Safety Guard: Your wallet holds $${currentUsdc.toFixed(2)} USDC, but this ETF purchase requires $${amount}.00 USDC on Solana Mainnet. Please swap SOL to USDC in your wallet first to prevent losing network gas fees.`
        );
      }

      // 1. Fetch real live VersionedTransaction from the API
      const res = await fetch(`/api/actions/etf/${etfId}?amount=${amount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: activeAccount }),
      });

      const data = await res.json();
      if (!res.ok || !data.transaction) {
        throw new Error(data.message || 'Failed to assemble live execution transaction.');
      }

      // 2. Deserialize transaction with @solana/web3.js
      const { VersionedTransaction } = await import('@solana/web3.js');
      const txBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // 3. Request user signature & broadcast via wallet
      let txid: string;
      if (solana.signAndSendTransaction) {
        const sendRes = await solana.signAndSendTransaction(transaction);
        txid = sendRes.signature;
      } else {
        const signed = await solana.signTransaction(transaction);
        const { getSolanaConnection } = await import('@/lib/solana');
        const conn = getSolanaConnection();
        txid = await conn.sendRawTransaction(signed.serialize());
      }

      setSimulationState((prev) => ({
        ...prev,
        [etfId]: {
          loading: false,
          result: {
            isLive: true,
            signature: txid,
            message: `1-Click execution broadcast to Solana Mainnet!`,
          },
        },
      }));
    } catch (err: unknown) {
      const error = err as Error;
      setSimulationState((prev) => ({
        ...prev,
        [etfId]: { loading: false, error: error.message },
      }));
    }
  };

  const handleSimulateSwap = async (etfId: string) => {
    setSimulationState((prev) => ({
      ...prev,
      [etfId]: { loading: true, error: undefined, result: undefined },
    }));

    try {
      const amount = selectedAmounts[etfId] || 50;
      const testAccount = '11111111111111111111111111111111';
      const res = await fetch(`/api/actions/etf/${etfId}?amount=${amount}&simulate=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: testAccount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Simulation failed');
      }

      setSimulationState((prev) => ({
        ...prev,
        [etfId]: { loading: false, result: data },
      }));
    } catch (err: unknown) {
      const error = err as Error;
      setSimulationState((prev) => ({
        ...prev,
        [etfId]: { loading: false, error: error.message },
      }));
    }
  };

  const categories = ['All', 'AI & Semiconductors', 'Mega-Cap Tech', 'Broad Market', 'Growth & Commodities', 'Web3'];

  const filteredETFs = Object.values(CURATED_ETFS).filter((etf) => {
    if (selectedCategory === 'All') return true;
    return etf.category === selectedCategory;
  });

  const filteredCatalog = TOKEN_CATALOG.filter(
    (t) =>
      t.ticker.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="relative overflow-hidden">
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-r from-emerald-600/10 via-cyan-500/10 to-purple-600/10 blur-[140px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 text-center relative">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#146EF5]/10 border border-[#146EF5]/30 text-xs font-mono text-[#00D69F] mb-8 backdrop-blur-md shadow-lg shadow-blue-500/10">
          {/* Official Solana Ecosystem Logo */}
          <img src="/solanaLogo.png" alt="Solana" className="w-4 h-3.5 object-contain" />
          <span className="font-semibold text-white">Built for Solana Actions &amp; Blinks</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#00D69F]">1-Click Stock ETFs</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D69F] animate-ping" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.08] mb-6 text-white">
          Institutional <span className="bg-gradient-to-r from-[#00D69F] via-[#146EF5] to-[#38BDF8] bg-clip-text text-transparent">Stock ETFs</span>
          <br />Native to Solana Blinks.
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
          Execute diversified baskets of tokenized US equities, S&amp;P 500 benchmarks, and gold proxies
          atomically in a single Solana transaction. Shareable directly on Twitter/X, Discord, and Telegram.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a
            href="#etfs"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] text-white font-bold text-sm shadow-xl shadow-blue-500/25 hover:from-[#257BF6] hover:to-[#146EF5] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 border border-blue-400/30"
          >
            <Layers className="w-4 h-4 text-[#00D69F]" />
            <span>Explore Curated ETFs</span>
          </a>

          <Link
            href="/studio"
            className="px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white font-semibold text-sm border border-[#146EF5]/30 hover:border-[#00D69F]/50 backdrop-blur-sm transition-all duration-200 flex items-center gap-2"
          >
            <Sliders className="w-4 h-4 text-[#00D69F]" />
            <span>Open Creator Studio</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Live Market Ticker Strip with Real-Time Feed Indicator */}
        <div className="max-w-5xl mx-auto mb-14 overflow-hidden border-y border-white/[0.06] py-3 bg-black/30 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D69F] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D69F]" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00D69F] flex items-center gap-1.5">
                <span>Powered by Pyth Network Hermes v2 &amp; Jupiter</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-300">
                ±σ Confidence Bands
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">Pull Oracle • 32 Publishers</span>
          </div>

          <div className="flex items-center justify-around gap-6 flex-wrap text-xs font-mono">
            {TOKEN_CATALOG.slice(0, 6).map((token) => {
              const live = livePrices[token.ticker];
              const priceDisplay = live?.formatted || token.underlyingPrice;
              const changeDisplay = live?.change24h || token.change24h;

              return (
                <div key={token.ticker} className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{token.ticker}</span>
                  <span className="text-white font-semibold transition-all duration-300">
                    {priceDisplay}
                  </span>
                  <span
                    className={
                      changeDisplay?.startsWith('+') ? 'text-[#00D69F] font-semibold' : 'text-red-400'
                    }
                  >
                    {changeDisplay}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Protocol Safeguards Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          <div className="fintech-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>1232B MTU GUARD</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Capped at 3 assets max per Blink to strictly prevent IPv6 packet MTU overflows.
            </p>
          </div>

          <div className="fintech-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold mb-1">
              <Zap className="w-4 h-4" />
              <span>1.2M CU BUDGET</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prepends ComputeBudget limit &amp; priority price to eliminate out-of-gas DEX reverts.
            </p>
          </div>

          <div className="fintech-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-bold mb-1">
              <Activity className="w-4 h-4" />
              <span>IDEMPOTENT ATAs</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pre-creates output token accounts safely without re-creation collisions.
            </p>
          </div>

          <div className="fintech-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold mb-1">
              <DollarSign className="w-4 h-4" />
              <span>ZERO-DUST ATOMIC</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Computes in integer atomic base units, assigning remaining dust lamports to top asset.
            </p>
          </div>
        </div>
      </section>

      {/* Curated PocketETFs Section */}
      <section id="etfs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-[#00D69F] tracking-widest uppercase">
                Verified Solana Actions &amp; Blinks
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00D69F]/15 text-[#00D69F] border border-[#00D69F]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D69F] animate-ping" />
                MAINNET LIVE
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Curated PocketETFs
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Pre-baked tokenized equity portfolios compiled into atomic Solana Actions. Execute live in 1-click with your connected wallet, or copy the Blink URL to share on Twitter/X, Dialect, and Discord.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Wallet Connect Button */}
            <button
              type="button"
              onClick={handleConnectWallet}
              disabled={walletConnecting}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                walletAddress
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-gradient-to-r from-[#146EF5] to-[#0D63F8] text-white hover:scale-105 shadow-md shadow-blue-500/25 border border-blue-400/30'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-[#00D69F]" />
              <span>
                {walletAddress
                  ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}${walletBalance ? ` • ${walletBalance.formattedUsdc}` : ''}`
                  : walletConnecting
                  ? 'Connecting...'
                  : 'Connect Wallet'}
              </span>
            </button>

            {/* How to Test Blinks Guide Button */}
            <button
              type="button"
              onClick={() => setShowBlinkGuide(true)}
              className="px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>How to Test Blinks</span>
            </button>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#146EF5] text-white font-semibold shadow-md shadow-blue-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PocketETFs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredETFs.map((etf) => {
            const currentAmount = selectedAmounts[etf.id] || 50;
            const sim = simulationState[etf.id];

            return (
              <div
                key={etf.id}
                className="fintech-card rounded-2xl p-5 flex flex-col fintech-card-hover relative group border border-white/[0.06]"
              >
                {/* Visual Header / SVG Icon */}
                <div className="relative w-full h-40 rounded-xl overflow-hidden mb-5 bg-[#090a10] border border-white/[0.04] flex items-center justify-center p-3">
                  <img
                    src={etf.iconPath}
                    alt={etf.name}
                    className="w-full h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-slate-300">
                    {etf.category}
                  </div>
                  {etf.metrics?.benchmarkYield && (
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#0A1128]/90 backdrop-blur-md border border-[#00D69F]/40 text-[10px] font-mono font-bold text-[#00D69F]">
                      {etf.metrics.benchmarkYield}
                    </div>
                  )}
                </div>

                {/* Info Header */}
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#00D69F] transition-colors">
                    {etf.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-purple-400 font-mono mt-0.5">
                    <span className="font-semibold">{etf.symbol}</span>
                    <span>•</span>
                    <span className="text-slate-400 truncate">{etf.tagline}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-5 line-clamp-2">
                  {etf.description}
                </p>

                {/* Asset Distribution Breakdown Bar */}
                <div className="mb-5">
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-2">
                    <span>Portfolio Weights</span>
                    <span className="text-[#00D69F] font-bold">100% Total</span>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div className="h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden flex p-[1px] gap-[1px]">
                    {etf.targetAssets.map((asset) => (
                      <div
                        key={asset.ticker}
                        style={{
                          width: `${asset.weightPercent}%`,
                          backgroundColor: asset.color,
                        }}
                        className="h-full rounded-sm transition-all duration-300"
                        title={`${asset.ticker}: ${asset.weightPercent}%`}
                      />
                    ))}
                  </div>

                  {/* Asset legend pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {etf.targetAssets.map((asset) => (
                      <div
                        key={asset.ticker}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.04] text-[10px] font-mono text-slate-300"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <span className="font-bold">{asset.ticker}</span>
                        <span className="text-slate-400">{asset.weightPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick-Buy Dollar Preset Simulator */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/[0.04] mb-5">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                    <span>Preset Allocation:</span>
                    <span className="text-[#00D69F] font-bold">
                      ${currentAmount} USDC
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {[5, 10, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          setSelectedAmounts((prev) => ({ ...prev, [etf.id]: amt }))
                        }
                        className={`py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          currentAmount === amt
                            ? 'bg-[#146EF5] text-white shadow-md shadow-blue-500/25 font-bold'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  {/* Atomic breakdown */}
                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Atomic USDC (6 dec):</span>
                      <span className="text-slate-200">
                        {(currentAmount * 1_000_000).toLocaleString()} units
                      </span>
                    </div>
                    {etf.targetAssets.map((a) => {
                      const allocated = (currentAmount * (a.weightPercent / 100)).toFixed(2);
                      return (
                        <div key={a.ticker} className="flex justify-between text-slate-400">
                          <span>• {a.ticker} ({a.weightPercent}%):</span>
                          <span className="text-slate-300">${allocated}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wallet Balance Check Indicator */}
                {walletAddress && walletBalance && (
                  <div
                    className={`mb-2 p-2 rounded-xl text-[10px] font-mono flex items-center justify-between border ${
                      walletBalance.usdc >= currentAmount
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {walletBalance.usdc >= currentAmount ? (
                        <Check className="w-3 h-3 text-[#00D69F]" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                      )}
                      <span>Balance: {walletBalance.formattedUsdc}</span>
                    </span>
                    <span className="font-bold">
                      {walletBalance.usdc >= currentAmount
                        ? '✓ Ready to Buy'
                        : `Need +$${(currentAmount - walletBalance.usdc).toFixed(2)} USDC`}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto space-y-2">
                  {/* Primary 1-Click Live Execution */}
                  <button
                    type="button"
                    onClick={() => handleLiveBuy(etf.id)}
                    disabled={sim?.loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#146EF5] via-[#0D63F8] to-[#00D69F] hover:from-[#257BF6] hover:to-[#14F195] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 border border-blue-400/30"
                  >
                    <Zap className={`w-3.5 h-3.5 text-[#00D69F] ${sim?.loading ? 'animate-bounce' : ''}`} />
                    <span>
                      {sim?.loading
                        ? 'Awaiting Wallet Approval...'
                        : `1-Click Buy $${currentAmount} ETF`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyBlink(etf.id)}
                    className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    {copiedId === etf.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00D69F]" />
                        <span className="text-[#00D69F] font-bold">Action URL Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Solana Action URL</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `Invest in ${etf.name} with 1-click on @solana via @PocketETF!\n\n${origin}/etf/${etf.id}\n\n#Solana #Blinks #PocketETF`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 rounded-lg bg-[#146EF5]/15 hover:bg-[#146EF5]/25 border border-[#146EF5]/30 text-[11px] font-semibold text-blue-300 hover:text-white transition-all flex items-center justify-center gap-1.5 font-mono"
                    >
                      <Share2 className="w-3 h-3 text-[#146EF5]" />
                      <span>Post on X</span>
                    </a>

                    <Link
                      href={`/etf/${etf.id}`}
                      className="py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-emerald-500/40 text-[11px] font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 font-mono"
                    >
                      <span>ETF Page</span>
                      <ExternalLink className="w-3 h-3 text-[#00D69F]" />
                    </Link>
                  </div>

                  {sim?.result?.signature && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono break-all animate-fadeIn">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Execution Broadcast Live!</span>
                      </div>
                      <a
                        href={`https://solscan.io/tx/${sim.result.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00D69F] hover:underline flex items-center gap-1 pt-1 font-mono text-[9px]"
                      >
                        <span>View on Solscan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {sim?.result && !sim?.result?.signature && (
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-blue-500/30 text-[10px] text-slate-300 font-mono break-all animate-fadeIn">
                      <div className="font-bold flex items-center gap-1 mb-0.5 text-blue-400">
                        <Check className="w-3 h-3" />
                        <span>v0 Transaction Assembled (Dry Run):</span>
                      </div>
                      <p className="text-slate-400 text-[9px]">{sim.result.message}</p>
                    </div>
                  )}

                  {sim?.error && (
                    <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-[10px] text-red-300 font-mono animate-fadeIn">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <Info className="w-3 h-3 text-red-400" />
                        <span>Notice:</span>
                      </div>
                      <p className="text-red-200 text-[9px]">{sim.error}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Expanded Token Catalog Directory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Verified Asset Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              25+ Tokenized Stocks, Indices &amp; RWAs
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              All assets are available for composition in the Creator Studio with verified Solana SPL mints.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search ticker or company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#146EF5] font-mono"
            />
          </div>
        </div>

        {/* Token Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredCatalog.slice(0, 18).map((token) => (
            <div
              key={token.ticker}
              className="p-3 rounded-xl bg-black/40 border border-white/[0.04] hover:border-[#146EF5]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm text-white">{token.ticker}</span>
                <span
                  className={`text-[10px] font-mono ${
                    token.change24h?.startsWith('+') ? 'text-[#00D69F]' : 'text-red-400'
                  }`}
                >
                  {token.change24h}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mb-2">{token.name}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
                <span className="text-slate-300 font-semibold">
                  {livePrices[token.ticker]?.formatted || token.underlyingPrice}
                </span>
                <span className="text-[#38BDF8] font-semibold truncate max-w-[65px]">
                  {token.category.split(' ')[0]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:border-[#146EF5]/50"
          >
            <span>Compose Any Asset in Creator Studio</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00D69F]" />
          </Link>
        </div>
      </section>

      {/* Protocol Architecture Deep-Dive */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="text-xs font-mono font-bold text-[#00D69F] tracking-widest uppercase mb-2">
            Execution Standards
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Built for Solana&apos;s Atomic Limits
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            PocketETF solves the five fundamental failure points of multi-token DEX execution on Solana Blinks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="fintech-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#146EF5]/15 border border-[#146EF5]/30 flex items-center justify-center text-[#146EF5] mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1232B MTU Size Guard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solana strictly drops transactions over 1232 bytes. PocketETF caps baskets at 3 assets,
              deduplicates all Jupiter Address Lookup Tables (ALTs), and compiles strictly to
              VersionedTransaction v0.
            </p>
          </div>

          <div className="fintech-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#00D69F]/15 border border-[#00D69F]/30 flex items-center justify-center text-[#00D69F] mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1.2M Compute Units</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Default 200,000 CU fails when chaining multi-leg DEX swaps. PocketETF prepends
              ComputeBudget instructions for 1,200,000 CU and 50,000 microLamports priority to guarantee
              execution.
            </p>
          </div>

          <div className="fintech-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Idempotent ATAs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If an investor wallet lacks the Associated Token Account for an equity, the transfer reverts.
              PocketETF pre-initializes idempotent token accounts so both new and existing holders execute smoothly.
            </p>
          </div>
        </div>
      </section>

      {/* PocketETF vs The World Comparison Matrix */}
      <ComparisonMatrix />

      {/* Protocol FAQ & Knowledge Base */}
      <FAQSection />

      {/* Solana Action JSON Inspector Modal */}
      {activeJsonETF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="fintech-card bg-[#0b0c14] border border-[#146EF5]/40 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#00D69F]" />
                <h4 className="text-xs sm:text-sm font-bold text-white font-mono">
                  Solana Action GET Spec: {activeJsonETF.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveJsonETF(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-md bg-white/5 font-mono"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-300">
              <pre className="bg-black/60 p-4 rounded-xl border border-white/5 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(
                  {
                    type: 'action',
                    icon: `${origin}${activeJsonETF.iconPath}`,
                    title: `PocketETF: ${activeJsonETF.name}`,
                    description: activeJsonETF.description,
                    label: 'Buy PocketETF',
                    disabled: false,
                    links: {
                      actions: [
                        {
                          label: '$10 USDC',
                          href: `${origin}/api/actions/etf/${activeJsonETF.id}?amount=10`,
                        },
                        {
                          label: '$50 USDC',
                          href: `${origin}/api/actions/etf/${activeJsonETF.id}?amount=50`,
                        },
                        {
                          label: '$100 USDC',
                          href: `${origin}/api/actions/etf/${activeJsonETF.id}?amount=100`,
                        },
                        {
                          label: 'Buy Custom Amount',
                          href: `${origin}/api/actions/etf/${activeJsonETF.id}?amount={amount}`,
                          parameters: [
                            {
                              name: 'amount',
                              label: 'USDC Amount ($)',
                              required: true,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40 text-xs font-mono">
              <span className="text-slate-400">Spec Version: 2.1.3</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${origin}/api/actions/etf/${activeJsonETF.id}`);
                  alert('Action endpoint copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:from-[#257BF6] hover:to-[#146EF5] text-white font-semibold transition-all shadow-md shadow-blue-500/25 border border-blue-400/25"
              >
                Copy Action Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blinks & Dialect Testing Guide Modal */}
      {showBlinkGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="fintech-card bg-[#0A1128] border border-[#146EF5]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#146EF5]/20 border border-[#146EF5]/40 flex items-center justify-center text-[#00D69F]">
                  <HelpCircle className="w-4 h-4 text-[#00D69F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">How to Test PocketETF Blinks &amp; Social Links</h4>
                  <p className="text-[11px] text-slate-400 font-mono">Guide to Dialect, Twitter/X, and Live Wallet Swaps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlinkGuide(false)}
                className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 font-mono transition-all"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* 1. Why JSON in browser */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Code2 className="w-4 h-4 text-[#38BDF8]" />
                  <span>1. Why does visiting the link in Chrome show a JSON payload?</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Solana Action URLs (e.g. <code className="text-[#00D69F] font-mono">/api/actions/etf/silicon-ai</code>) are standard REST API endpoints compliant with the <strong>Solana Actions v2.1.3 Specification</strong>. Normal web browsers don't have built-in Solana wallet renderers, so they display the raw JSON metadata.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong>Blinks (Blockchain Links)</strong> are the <em>visual rendering</em> of that JSON created by client apps (like Twitter/X, Discord, and Dialect) when a user has a compatible wallet extension.
                </p>
              </div>

              {/* 2. Testing in Dialect (dial.to) */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <ExternalLink className="w-4 h-4 text-[#00D69F]" />
                  <span>2. How to test on Dialect Blinks Inspector (dial.to)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Dialect verifies all actions against their central registry. While your registry request is in review by Dialect, you can test and interact with your Blink immediately in <strong>Developer Mode</strong>:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono text-[11px] bg-black/40 p-3 rounded-lg border border-white/5">
                  <li>Open <a href="https://dial.to" target="_blank" rel="noreferrer" className="text-[#00D69F] underline">dial.to</a> in your browser.</li>
                  <li>Click the <strong>Settings (⚙️ Gear icon)</strong> in the top right corner.</li>
                  <li>Toggle ON <strong>&quot;Allow unregistered actions&quot;</strong> (or Developer Mode).</li>
                  <li>Paste your Blink URL: <span className="text-cyan-300 break-all">solana-action:{origin}/api/actions/etf/silicon-ai</span></li>
                </ol>
                <p className="text-[11px] text-emerald-400 font-mono">
                  ✓ Dialect will instantly render the full interactive PocketETF buying card with all 1-click buttons!
                </p>
              </div>

              {/* 3. Testing on Twitter / X */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Share2 className="w-4 h-4 text-[#146EF5]" />
                  <span>3. How to test on Twitter / X</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  To view Blinks natively on Twitter/X:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono text-[11px] bg-black/40 p-3 rounded-lg border border-white/5">
                  <li>Ensure your <strong>Phantom</strong> or <strong>Backpack</strong> browser extension is updated.</li>
                  <li>In Phantom: go to <strong>Settings → Developer Settings → Solana Actions &amp; Blinks</strong> and ensure it is enabled.</li>
                  <li>Post or preview the URL <span className="text-cyan-300 break-all">{origin}/api/actions/etf/silicon-ai</span> on Twitter/X.</li>
                  <li>Phantom will automatically unfold the tweet into an interactive buy card right inside your feed!</li>
                </ol>
              </div>

              {/* 4. Wallet & Funds: Why Phantom warns */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>4. Why Phantom blocked the swap &amp; warned about 0.001 SOL</span>
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  PocketETF executes real, live swaps on Solana Mainnet using <strong>USDC</strong> (<code className="font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">EPjFWdd...wyTDt1v</code>).
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Before signing, Phantom runs a <strong>background simulation</strong> of the transaction. If your wallet has <strong>0 USDC</strong>, the simulation fails with <code className="text-red-300 font-mono">insufficient funds</code>. Phantom flags this with a scary red warning: <em>&quot;Malicious or failing transaction detected: If you proceed, you will lose your 0.001 SOL network fee.&quot;</em>
                </p>
                <p className="text-slate-300 leading-relaxed font-semibold">
                  👉 <strong>The Fix:</strong> The 0.001 SOL is Solana&apos;s standard network fee. Simply ensure your Phantom wallet holds at least <strong>$5 or $10 USDC</strong> on Solana Mainnet. You can swap a fraction of your SOL to USDC directly inside Phantom in 5 seconds!
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40 text-xs font-mono">
              <span className="text-slate-400">PocketETF Protocol v1.0</span>
              <button
                type="button"
                onClick={() => setShowBlinkGuide(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#00D69F] text-white font-bold hover:scale-105 transition-all shadow-md shadow-blue-500/25"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
