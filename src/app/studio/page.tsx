'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Plus,
  Trash2,
  Share2,
  RefreshCw,
  Search,
  CheckCircle2,
  Database,
  PieChart,
  HelpCircle,
} from 'lucide-react';
import { TOKEN_CATALOG, MAX_ETF_ASSETS, ETFAsset } from '@/lib/constants';
import { DonutChart } from '@/components/DonutChart';

interface ActiveStock {
  ticker: string;
  name: string;
  weight: number;
  color: string;
  mint: string;
  category: string;
  underlyingPrice?: string;
}

export default function StudioPage() {
  const [etfName, setEtfName] = useState('Silicon AI & Foundry Titans');
  const [etfDescription, setEtfDescription] = useState(
    '1-Click diversified exposure across NVIDIA, TSMC, and AMD. Executed atomically via PocketETF and Jupiter DEX routing on Solana.'
  );

  const [activeStocks, setActiveStocks] = useState<ActiveStock[]>([
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      weight: 40,
      color: '#10B981',
      mint: TOKEN_CATALOG.find((t) => t.ticker === 'NVDA')?.mint || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      category: 'Semiconductors & AI',
      underlyingPrice: '$220.00',
    },
    {
      ticker: 'TSM',
      name: 'Taiwan Semiconductor Mfg',
      weight: 30,
      color: '#06B6D4',
      mint: TOKEN_CATALOG.find((t) => t.ticker === 'TSM')?.mint || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
      category: 'Semiconductors & AI',
      underlyingPrice: '$195.40',
    },
    {
      ticker: 'AMD',
      name: 'Advanced Micro Devices',
      weight: 30,
      color: '#EF4444',
      mint: TOKEN_CATALOG.find((t) => t.ticker === 'AMD')?.mint || '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
      category: 'Semiconductors & AI',
      underlyingPrice: '$165.20',
    },
  ]);

  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://pocketetf.solana.app');
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [customMintInput, setCustomMintInput] = useState('');
  const [customTickerInput, setCustomTickerInput] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const fetchLivePrices = async () => {
      try {
        const res = await fetch('/api/prices');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.prices) {
            setActiveStocks((prev) =>
              prev.map((s) => {
                const live = data.prices[s.ticker];
                return live ? { ...s, underlyingPrice: live.formatted } : s;
              })
            );
          }
        }
      } catch {
        // Fallback silently to initial prices
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 15000);
    return () => clearInterval(interval);
  }, []);

  const totalWeight = activeStocks.reduce((sum, s) => sum + s.weight, 0);

  // Auto-normalize weights to 100%
  const handleNormalizeWeights = () => {
    if (activeStocks.length === 0) return;
    const currentSum = activeStocks.reduce((acc, s) => acc + s.weight, 0);
    if (currentSum === 0) {
      handleEqualWeights();
      return;
    }

    let allocatedSum = 0;
    const normalized = activeStocks.map((s, index) => {
      if (index === activeStocks.length - 1) {
        return {
          ...s,
          weight: Math.max(1, 100 - allocatedSum),
        };
      }
      const raw = Math.round((s.weight / currentSum) * 100);
      allocatedSum += raw;
      return {
        ...s,
        weight: Math.max(1, raw),
      };
    });

    setActiveStocks(normalized);
  };

  // Equal balance weights
  const handleEqualWeights = () => {
    const count = activeStocks.length;
    if (count === 0) return;

    if (count === 1) {
      setActiveStocks(activeStocks.map((s) => ({ ...s, weight: 100 })));
    } else if (count === 2) {
      setActiveStocks(activeStocks.map((s) => ({ ...s, weight: 50 })));
    } else if (count === 3) {
      setActiveStocks([
        { ...activeStocks[0], weight: 34 },
        { ...activeStocks[1], weight: 33 },
        { ...activeStocks[2], weight: 33 },
      ]);
    }
  };

  // Add stock from catalog
  const handleAddStock = (asset: ETFAsset) => {
    if (activeStocks.length >= MAX_ETF_ASSETS) {
      alert(`Maximum of ${MAX_ETF_ASSETS} assets allowed to strictly preserve the 1232-byte MTU limit.`);
      return;
    }

    if (activeStocks.some((s) => s.ticker === asset.ticker)) {
      return;
    }

    const nextCount = activeStocks.length + 1;
    const nextWeight = Math.floor(100 / nextCount);

    const updated = [
      ...activeStocks.map((s) => ({ ...s, weight: nextWeight })),
      {
        ticker: asset.ticker,
        name: asset.name,
        weight: nextWeight,
        color: asset.color,
        mint: asset.mint,
        category: asset.category,
        underlyingPrice: asset.underlyingPrice,
      },
    ];

    const currentTotal = updated.reduce((sum, s) => sum + s.weight, 0);
    if (currentTotal < 100 && updated.length > 0) {
      updated[0].weight += 100 - currentTotal;
    }

    setActiveStocks(updated);
    setIsAssetDrawerOpen(false);
  };

  // Add custom SPL mint address
  const handleAddCustomMint = () => {
    if (activeStocks.length >= MAX_ETF_ASSETS) {
      alert(`Maximum of ${MAX_ETF_ASSETS} assets allowed for 1232B MTU safety.`);
      return;
    }

    const trimmedMint = customMintInput.trim();
    const trimmedTicker = (customTickerInput || 'CUSTOM').trim().toUpperCase();

    if (trimmedMint.length < 32 || trimmedMint.length > 44) {
      alert('Please enter a valid Solana public key address (32-44 characters).');
      return;
    }

    const nextCount = activeStocks.length + 1;
    const nextWeight = Math.floor(100 / nextCount);

    const updated = [
      ...activeStocks.map((s) => ({ ...s, weight: nextWeight })),
      {
        ticker: trimmedTicker,
        name: `${trimmedTicker} Custom Token`,
        weight: nextWeight,
        color: '#10B981',
        mint: trimmedMint,
        category: 'Custom Asset',
        underlyingPrice: 'Dynamic',
      },
    ];

    const currentTotal = updated.reduce((sum, s) => sum + s.weight, 0);
    if (currentTotal < 100 && updated.length > 0) {
      updated[0].weight += 100 - currentTotal;
    }

    setActiveStocks(updated);
    setCustomMintInput('');
    setCustomTickerInput('');
    setIsAssetDrawerOpen(false);
  };

  // Remove stock
  const handleRemoveStock = (ticker: string) => {
    if (activeStocks.length <= 1) {
      alert('A PocketETF must contain at least 1 asset.');
      return;
    }

    const remaining = activeStocks.filter((s) => s.ticker !== ticker);
    const count = remaining.length;
    const baseWeight = Math.floor(100 / count);

    const rebalanced = remaining.map((s, idx) => ({
      ...s,
      weight: idx === 0 ? baseWeight + (100 - baseWeight * count) : baseWeight,
    }));

    setActiveStocks(rebalanced);
  };

  // Update specific slider weight
  const handleWeightChange = (ticker: string, newWeight: number) => {
    setActiveStocks((prev) =>
      prev.map((s) => (s.ticker === ticker ? { ...s, weight: newWeight } : s))
    );
  };

  // Build Action URL
  const assetQuery = activeStocks.map((s) => `${s.ticker}:${s.weight}`).join(',');
  const actionUrl = `${origin}/api/actions/etf/custom?assets=${encodeURIComponent(
    assetQuery
  )}&name=${encodeURIComponent(etfName)}&description=${encodeURIComponent(etfDescription)}`;
  const dialectUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`;
  const tweetText = `Check out my custom tokenized stock ETF "${etfName}" on Solana! Execute 1-click with @JupiterExchange & Blinks:`;
  const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(actionUrl)}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(actionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const categories = [
    'All',
    'Semiconductors & AI',
    'Mega-Cap Tech',
    'Indices & Benchmarks',
    'Commodities & Yield',
    'Web3 Equities',
  ];

  const filteredCatalog = TOKEN_CATALOG.filter((token) => {
    const matchesCategory =
      activeCategoryFilter === 'All' || token.category === activeCategoryFilter;
    const matchesSearch =
      token.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Curated ETFs</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#146EF5]/15 border border-[#146EF5]/30 text-[#00D69F] text-xs font-mono font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
            <span>PocketETF Creator Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Build a Custom Stock ETF Blink
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Select 2 or 3 stock assets, balance portfolio weights, and generate an instant Solana Action
            URL ready to execute in Twitter/X feeds and Dialect.
          </p>
        </div>

        {/* 1232B MTU Status Pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#00D69F]" />
          <span>
            Assets: <strong className="text-white">{activeStocks.length}</strong> /{' '}
            {MAX_ETF_ASSETS} Max (1232B MTU Guard)
          </span>
        </div>
      </div>

      {/* Main Grid: Studio Builder on Left, Live Blink Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Builder */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Form */}
          <div className="fintech-card p-6 rounded-2xl">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#146EF5]" />
              <span>1. ETF Metadata</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  ETF Name
                </label>
                <input
                  type="text"
                  value={etfName}
                  onChange={(e) => setEtfName(e.target.value)}
                  placeholder="e.g. AI Titans or Green Energy Duo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:outline-none focus:border-[#146EF5] font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Description / Investment Thesis
                </label>
                <textarea
                  rows={2}
                  value={etfDescription}
                  onChange={(e) => setEtfDescription(e.target.value)}
                  placeholder="Explain your portfolio thesis for social media followers..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#146EF5] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Asset Allocation & Interactive Weight Sliders */}
          <div className="fintech-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00D69F]" />
                <span>2. Portfolio Weights ({activeStocks.length}/3 Assets)</span>
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEqualWeights}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#146EF5]/40 text-[11px] font-mono font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Equal Split
                </button>
                <button
                  type="button"
                  onClick={handleNormalizeWeights}
                  className="px-2.5 py-1 rounded-lg bg-[#146EF5]/20 hover:bg-[#146EF5]/35 border border-[#146EF5]/40 text-[11px] font-mono font-semibold text-[#146EF5] hover:text-white transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto 100%</span>
                </button>
              </div>
            </div>

            {/* Total Weight Warning */}
            {totalWeight !== 100 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Current total weight is <strong>{totalWeight}%</strong>. Click auto-normalize to balance to 100%.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleNormalizeWeights}
                  className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 text-[10px] font-bold hover:bg-amber-500/30"
                >
                  Balance
                </button>
              </div>
            )}

            {/* Active Stocks List */}
            <div className="space-y-3.5 mb-6">
              {activeStocks.map((stock) => (
                <div
                  key={stock.ticker}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stock.color }}
                      />
                      <span className="font-mono font-bold text-sm text-white">{stock.ticker}</span>
                      <span className="text-xs text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                        {stock.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-xs text-slate-400">{stock.underlyingPrice}</span>
                      <span className="text-sm font-bold text-[#00D69F] w-12 text-right">
                        {stock.weight}%
                      </span>
                      {activeStocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStock(stock.ticker)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                          title="Remove asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Weight Slider */}
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={stock.weight}
                    onChange={(e) => handleWeightChange(stock.ticker, parseInt(e.target.value))}
                    className="w-full accent-[#146EF5] cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
              ))}
            </div>

            {/* Add Asset Trigger */}
            {activeStocks.length < MAX_ETF_ASSETS && (
              <button
                type="button"
                onClick={() => setIsAssetDrawerOpen(true)}
                className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-[#146EF5]/60 hover:bg-[#146EF5]/5 text-xs font-mono font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#00D69F]" />
                <span>Add Asset from Catalog or Custom SPL Mint ({MAX_ETF_ASSETS - activeStocks.length} slot available)</span>
              </button>
            )}
          </div>

          {/* Export & Action URL */}
          <div className="fintech-card p-6 rounded-2xl">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#00D69F]" />
              <span>3. Export Solana Action &amp; Blink Link</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 overflow-hidden">
                <span className="font-mono text-xs text-slate-300 truncate">
                  {actionUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:from-[#257BF6] hover:to-[#146EF5] text-white font-semibold text-xs transition-all shrink-0 flex items-center gap-1.5 font-mono shadow-md shadow-blue-500/25 border border-blue-400/30"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00D69F]" />
                      <span className="text-[#00D69F]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={dialectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all hover:border-[#00D69F]/40"
                >
                  <span>Dialect Inspector</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#00D69F]" />
                </a>

                <a
                  href={twitterIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 rounded-xl bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/40 text-xs font-mono font-semibold text-[#1DA1F2] flex items-center justify-center gap-2 transition-all"
                >
                  <span>Share Blink on X</span>
                  <Share2 className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form: Real-Time Donut Chart & Live Blink Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Dynamic Donut Chart Card */}
          <div className="fintech-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00D69F] flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-[#00D69F]" />
                Dynamic Donut Chart
              </span>
              <span className="text-xs font-mono text-slate-400">Real-Time Split</span>
            </div>

            <div className="py-2 flex justify-center">
              <DonutChart
                segments={activeStocks.map((s) => ({
                  ticker: s.ticker,
                  name: s.name,
                  weightPercent: s.weight,
                  color: s.color,
                }))}
                size={190}
                strokeWidth={22}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.04] text-center font-mono">
              {activeStocks.map((s) => (
                <div key={s.ticker} className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-white">{s.ticker}</span>
                  </div>
                  <span className="text-xs text-[#00D69F] font-bold">{s.weight}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Blink Card Preview */}
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[#146EF5] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
                Live Blink Card Preview
              </span>
              <span>Twitter / Dialect Frame</span>
            </div>

            {/* Simulated Blink Action Card */}
            <div className="rounded-2xl border border-white/15 bg-[#0e0f17] overflow-hidden shadow-2xl">
              <div className="relative w-full h-44 bg-gradient-to-br from-[#0A1128] via-[#0F172A] to-[#060A17] flex items-center justify-center p-4 border-b border-white/10">
                <img
                  src="/favicon.png"
                  alt="PocketETF"
                  className="w-16 h-16 object-contain drop-shadow-[0_0_24px_rgba(20,110,245,0.4)]"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#00D69F]/30 text-[10px] font-mono font-bold text-[#00D69F] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#00D69F]" />
                  <span>PocketETF Action</span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                  v2.1.3
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1 font-mono">
                    PocketETF: {etfName || 'Untitled ETF'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {etfDescription || 'No description provided.'}
                  </p>
                </div>

                {/* Weights preview bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                    <span>Weights</span>
                    <span className="text-[#00D69F] font-bold">{totalWeight}% Total</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex p-[1px] gap-[1px]">
                    {activeStocks.map((s) => (
                      <div
                        key={s.ticker}
                        style={{
                          width: `${s.weight}%`,
                          backgroundColor: s.color,
                        }}
                        className="h-full rounded-sm transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                  <button
                    type="button"
                    className="py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    $10 USDC
                  </button>
                  <button
                    type="button"
                    className="py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    $50 USDC
                  </button>
                  <button
                    type="button"
                    className="py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    $100 USDC
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      placeholder="Custom USDC Amount"
                      disabled
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-400 cursor-not-allowed font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl bg-white/10 text-slate-400 text-xs font-mono font-semibold cursor-not-allowed"
                  >
                    Buy
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#00D69F]" />
                    Jupiter v6 Multi-Swap
                  </span>
                  <span>pocketetf.solana.app</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Catalog Drawer Modal */}
      {isAssetDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="fintech-card bg-[#0b0c14] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#146EF5]" />
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Select Asset or Enter Custom Mint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssetDrawerOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-md bg-white/5 font-mono"
              >
                Close (ESC)
              </button>
            </div>

            {/* Custom Mint Tab / Form */}
            <div className="p-5 border-b border-white/[0.06] bg-black/30 space-y-3">
              <div className="text-xs font-mono font-bold text-[#00D69F] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#00D69F]" />
                <span>Add Any Custom Solana SPL Token Mint:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={customTickerInput}
                  onChange={(e) => setCustomTickerInput(e.target.value)}
                  placeholder="Ticker (e.g. bNVDA)"
                  className="sm:col-span-3 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#146EF5]"
                />
                <input
                  type="text"
                  value={customMintInput}
                  onChange={(e) => setCustomMintInput(e.target.value)}
                  placeholder="SPL Token Mint Address (Base58 Public Key)"
                  className="sm:col-span-7 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#146EF5]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMint}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:from-[#257BF6] hover:to-[#146EF5] text-white font-mono text-xs font-semibold transition-all shadow-md shadow-blue-500/25 border border-blue-400/25"
                >
                  Add Mint
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                      activeCategoryFilter === cat
                        ? 'bg-[#146EF5] text-white font-semibold shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#146EF5]"
                />
              </div>
            </div>

            {/* Assets Grid */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCatalog.map((asset) => {
                const isSelected = activeStocks.some((s) => s.ticker === asset.ticker);
                return (
                  <button
                    key={asset.ticker}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleAddStock(asset)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-black/20 border-white/[0.04] opacity-50 cursor-not-allowed'
                        : 'bg-black/50 border-white/10 hover:border-[#146EF5]/50 hover:bg-[#146EF5]/5'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-mono font-bold text-sm text-white">{asset.ticker}</span>
                      <span
                        className={`text-[10px] font-mono ${
                          asset.change24h?.startsWith('+') ? 'text-[#00D69F]' : 'text-red-400'
                        }`}
                      >
                        {asset.change24h}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-3">{asset.name}</p>
                    <div className="flex items-center justify-between w-full pt-2 border-t border-white/[0.04] text-[10px] font-mono text-slate-500">
                      <span>{asset.underlyingPrice}</span>
                      <span className="text-[#00D69F] font-semibold">
                        {isSelected ? 'Added' : '+ Add Asset'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
