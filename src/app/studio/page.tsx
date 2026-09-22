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
  Smartphone,
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
} from 'lucide-react';
import { TOKEN_CATALOG, MAX_ETF_ASSETS, ETFAsset, getDEXConflictStatus } from '@/lib/constants';
import { DonutChart } from '@/components/DonutChart';
import { MobileQRModal } from '@/components/MobileQRModal';

interface ActiveStock {
  ticker: string;
  name: string;
  weight: number;
  color: string;
  mint: string;
  category: string;
  primaryDex?: 'Whirlpool' | 'Meteora' | 'Raydium';
  underlyingPrice?: string;
}

export default function StudioPage() {
  const [etfName, setEtfName] = useState('Silicon AI Supercycle');
  const [etfDescription, setEtfDescription] = useState(
    '1-Click execution for 60% NVIDIA (NVDA) and 40% Taiwan Semiconductor (TSM) via Jupiter DEX aggregation.'
  );

  const [activeStocks, setActiveStocks] = useState<ActiveStock[]>([
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      weight: 60,
      color: '#76B900',
      mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      category: 'Semiconductors & AI',
      primaryDex: 'Whirlpool',
      underlyingPrice: '$220.00',
    },
    {
      ticker: 'TSM',
      name: 'Taiwan Semiconductor',
      weight: 40,
      color: '#D12420',
      mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
      category: 'Semiconductors & AI',
      primaryDex: 'Whirlpool',
      underlyingPrice: '$195.40',
    },
  ]);

  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://pocketetf.vercel.app');
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [customMintInput, setCustomMintInput] = useState('');
  const [customTickerInput, setCustomTickerInput] = useState('');
  const [previewMode, setPreviewMode] = useState<'widget' | 'twitter'>('twitter');
  const [isMobileQrOpen, setIsMobileQrOpen] = useState(false);

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
        primaryDex: asset.primaryDex || 'Whirlpool',
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
        primaryDex: 'Whirlpool' as const,
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
  const tweetText = `Check out my custom tokenized stock ETF "${etfName}" on Solana! Execute 1-click with @JupiterExchange & @PocketETF:`;
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

  const conflictStatus = getDEXConflictStatus(
    activeStocks.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      weightPercent: s.weight,
      mint: s.mint,
      decimals: 6,
      color: s.color,
      category: s.category as any,
      primaryDex: s.primaryDex || 'Whirlpool',
    }))
  );

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
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
            conflictStatus.isCompatible
              ? 'bg-black/40 border-white/10 text-slate-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {conflictStatus.isCompatible ? (
            <ShieldCheck className="w-4 h-4 text-[#00D69F]" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-400" />
          )}
          <span>
            Assets: <strong className="text-white">{activeStocks.length}</strong> /{' '}
            {MAX_ETF_ASSETS} Max &bull;{' '}
            <span className={conflictStatus.isCompatible ? 'text-[#00D69F]' : 'text-red-400 font-bold'}>
              {conflictStatus.statusLabel}
            </span>
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

            {/* DEX Venue Conflict Warning */}
            {!conflictStatus.isCompatible && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-xs font-mono text-red-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>DEX Venue Conflict: Exceeds Solana 1232B MTU Limit</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {conflictStatus.reason}
                </p>
                <div className="pt-1 text-[11px] text-amber-300">
                  💡 <strong>Venue Optimization:</strong> Replace one stock so all 3 assets share 1 or 2 DEX venues (e.g. Whirlpool for NVDA/GOOGL/META or Meteora for TSM/MSFT/TSLA) to fit safely on-chain.
                </div>
              </div>
            )}

            {/* Active Stocks List */}
            <div className="space-y-3 mb-6">
              {activeStocks.map((stock) => (
                <div
                  key={stock.ticker}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stock.color }}
                      />
                      <span className="font-mono font-bold text-sm text-white">{stock.ticker}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-slate-300">
                        {stock.primaryDex || 'Whirlpool'}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[180px]">
                        {stock.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 font-mono pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
                      <span className="text-xs text-slate-400">{stock.underlyingPrice}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#00D69F] w-12 text-right">
                          {stock.weight}%
                        </span>
                        {activeStocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStock(stock.ticker)}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors"
                            title="Remove asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

            {!conflictStatus.isCompatible ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Blink Generation Paused: 3-DEX AMM Conflict</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Solana transactions cannot fit Whirlpool, Meteora, and Raydium accounts simultaneously within the 1232B MTU packet limit. Please adjust your 3 assets to share 1 or 2 venues or reduce to 2 assets to enable export.
                </p>
              </div>
            ) : (
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

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all hover:border-[#00D69F]/40"
                  >
                    <span>Action JSON</span>
                    <ExternalLink className="w-3 h-3 text-[#00D69F]" />
                  </a>

                  <a
                    href={twitterIntentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 rounded-xl bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/40 text-[11px] font-mono font-semibold text-[#1DA1F2] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Post on 𝕏</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsMobileQrOpen(true)}
                    className="py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-mono font-semibold text-[#00D69F] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Mobile QR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Creator Monetization & Protocol Revenue */}
          <div className="fintech-card p-5 rounded-2xl border border-[#00D69F]/20 bg-gradient-to-b from-[#00D69F]/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
                <span>Creator Affiliate Revenue Architecture</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D69F]/15 text-[#00D69F] font-mono border border-[#00D69F]/30 font-semibold">
                0% Fee Alpha
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              PocketETF features an automated <strong>50/50 Creator Revenue Split</strong> built directly into the Jupiter DEX swap routing. When fees are activated, half of all platform protocol basis points are paid atomically to your creator wallet address.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">CURRENT ALPHA FEE</span>
                <span className="text-white font-bold text-sm">0.00% (0 bps)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">CREATOR REVENUE SPLIT</span>
                <span className="text-[#00D69F] font-bold text-sm">50% of Platform Fee</span>
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
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold uppercase tracking-wider text-[#146EF5] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
                Live Action Simulation
              </span>
              <div className="flex items-center p-0.5 rounded-lg bg-black/60 border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('twitter')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 ${
                    previewMode === 'twitter'
                      ? 'bg-[#1D9BF0] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Feed View (𝕏)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('widget')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    previewMode === 'widget'
                      ? 'bg-[#146EF5] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Widget View</span>
                </button>
              </div>
            </div>

            {/* Social Feed Mockup Frame when in Twitter Mode */}
            <div className={previewMode === 'twitter' ? 'rounded-2xl border border-white/10 bg-[#000000] p-4 sm:p-5 shadow-2xl space-y-3' : ''}>
              {previewMode === 'twitter' && (
                <div>
                  {/* Tweet Author Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#146EF5] to-[#00D69F] p-0.5 flex-shrink-0">
                        <img
                          src="/favicon.png"
                          alt="PocketETF"
                          className="w-full h-full rounded-full bg-black object-contain p-1"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 leading-tight">
                          <span className="font-bold text-white text-sm hover:underline cursor-pointer">
                            PocketETF
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-[#1D9BF0] fill-[#1D9BF0]" />
                          <span className="text-slate-500 text-xs font-normal">@PocketETF</span>
                          <span className="text-slate-500 text-xs">·</span>
                          <span className="text-slate-500 text-xs">2m</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">1-Click Equity Baskets on Solana</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm font-bold font-mono">𝕏</span>
                  </div>

                  {/* Tweet Body Text */}
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed mt-2.5 mb-3 font-sans">
                    Just created a new equity basket thesis on @Solana:{' '}
                    <span className="text-[#1D9BF0] font-semibold">${etfName || 'Custom Basket'}</span>! 1-click execution across{' '}
                    {activeStocks.map((s) => '$' + s.ticker).join(', ')} directly in your timeline via @Solana Actions &amp; @JupiterExchange. 🚀
                  </p>
                </div>
              )}

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

                  {/* Preset Buttons (All 5 Presets) */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1 font-mono">
                    {['$5', '$10', '$25', '$50', '$100'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 text-center"
                      >
                        {amt}
                      </button>
                    ))}
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
                    <span>pocketetf.vercel.app</span>
                  </div>
                </div>
              </div>

              {/* Twitter Engagement Bar when in Feed View */}
              {previewMode === 'twitter' && (
                <div className="pt-2 flex items-center justify-between text-slate-500 text-xs font-mono px-2">
                  <div className="flex items-center gap-1.5 hover:text-[#1D9BF0] transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-[11px]">24</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer">
                    <Repeat2 className="w-4 h-4" />
                    <span className="text-[11px]">88</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-rose-500 transition-colors cursor-pointer">
                    <Heart className="w-4 h-4" />
                    <span className="text-[11px]">342</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#1D9BF0] transition-colors cursor-pointer">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-[11px]">49</span>
                  </div>
                  <div className="hover:text-[#1D9BF0] transition-colors cursor-pointer">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              )}
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-white">{asset.ticker}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 border border-white/10 text-slate-300">
                          {asset.primaryDex || 'Whirlpool'}
                        </span>
                      </div>
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

      {/* Mobile QR Modal for Custom Basket */}
      <MobileQRModal
        isOpen={isMobileQrOpen}
        onClose={() => setIsMobileQrOpen(false)}
        etfId="custom-basket"
        etfName={etfName || 'Custom Basket'}
        url={actionUrl}
      />
    </div>
  );
}
