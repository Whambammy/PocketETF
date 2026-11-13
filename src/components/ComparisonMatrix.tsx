'use client';

import React, { useState } from 'react';
import { Check, X, Shield, Zap, Clock, DollarSign, Layers, Share2, ArrowRight, Table } from 'lucide-react';

export function ComparisonMatrix() {
  const [activeCompetitor, setActiveCompetitor] = useState<'traditional' | 'evm' | 'manual'>('traditional');
  const [showFullTableOnMobile, setShowFullTableOnMobile] = useState(false);

  const competitorMeta = {
    traditional: {
      name: 'Traditional Brokerages',
      subtitle: 'Robinhood, Schwab, Fidelity',
      tag: 'Legacy Web2',
      badgeClass: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    },
    evm: {
      name: 'EVM Index Protocols',
      subtitle: 'Index Coop, PieDAO (Ethereum)',
      tag: 'EVM DeFi',
      badgeClass: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    },
    manual: {
      name: 'Manual DEX Swapping',
      subtitle: 'Jupiter, Raydium (Single Swaps)',
      tag: 'Manual DeFi',
      badgeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    },
  };

  const features = [
    {
      feature: 'Trading Hours',
      icon: Clock,
      traditional: '9:30 AM – 4:00 PM EST (Closed Weekends)',
      evm: '24/7/365 Continuous',
      manual: '24/7/365 Continuous',
      pocketetf: '24/7/365 Continuous On-Chain',
      highlight: true,
    },
    {
      feature: 'Average Network / Tx Cost',
      icon: DollarSign,
      traditional: '$0.00 (PFOF) or $5+ broker fees',
      evm: '$10.00 – $50.00+ Gas',
      manual: '~$0.006 (3 separate swaps)',
      pocketetf: '< $0.002 (Single atomic v0 tx)',
      highlight: true,
    },
    {
      feature: 'Execution Workflow',
      icon: Zap,
      traditional: '3+ separate search & buy screens',
      evm: 'Single buy (Crypto tokens only)',
      manual: '3 separate swaps + 3 approvals',
      pocketetf: '1-Click Social Blink (Atomic)',
      highlight: true,
    },
    {
      feature: 'Social Timeline Embedding',
      icon: Share2,
      traditional: 'None (Walled-garden app required)',
      evm: 'None (Web dApp connection only)',
      manual: 'None (DEX website only)',
      pocketetf: 'Native Solana Blinks (X, Discord, TG)',
      highlight: true,
    },
    {
      feature: 'Asset Universe',
      icon: Layers,
      traditional: 'Traditional Equities (Broker account)',
      evm: 'Crypto Only (DPI, MVI, DeFi)',
      manual: 'Single SPL tokens individually',
      pocketetf: 'Tokenized US Equities & Cryptos',
      highlight: true,
    },
    {
      feature: 'Oracle & NAV Benchmarking',
      icon: Shield,
      traditional: 'Closed broker proprietary feed',
      evm: 'Chainlink (High block latency)',
      manual: 'Spot AMM price only',
      pocketetf: 'Pyth Network Hermes v2 (±σ Bands)',
      highlight: true,
    },
    {
      feature: 'Account Minimums',
      icon: DollarSign,
      traditional: '$50 – $1,000+ wire/deposit minimums',
      evm: 'High (Gas prohibits micro-orders)',
      manual: 'Variable per token pool',
      pocketetf: 'Micro-investing from $5 USDC',
      highlight: true,
    },
    {
      feature: 'Annual Management Expense Ratio',
      icon: DollarSign,
      traditional: '0.20% – 1.50% / year recurring',
      evm: '0.95% / year management drag',
      manual: '0% (Self-custody individual tokens)',
      pocketetf: '0% Annual Management Fee',
      highlight: true,
    },
  ];

  return (
    <section id="compare" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20">
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#146EF5]/10 border border-[#146EF5]/30 text-xs font-mono text-[#00D69F] mb-4">
          <Layers className="w-3.5 h-3.5 text-[#00D69F]" />
          <span>Competitive Landscape &amp; Value Proposition</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Why <span className="bg-gradient-to-r from-[#00D69F] via-[#146EF5] to-[#38BDF8] bg-clip-text text-transparent">PocketETF</span>?
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
          See how PocketETF outperforms legacy brokerages, Ethereum-based index protocols, and manual multi-swaps across latency, costs, and accessibility.
        </p>
      </div>

      {/* MOBILE-OPTIMIZED CARD VIEW (< md) */}
      <div className="block md:hidden">
        {/* Competitor Selector Pills */}
        <div className="mb-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
            Select Competitor to Compare:
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
            {(['traditional', 'evm', 'manual'] as const).map((key) => {
              const meta = competitorMeta[key];
              const isSelected = activeCompetitor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveCompetitor(key);
                    setShowFullTableOnMobile(false);
                  }}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-mono font-bold transition-all text-center leading-tight ${
                    isSelected
                      ? 'bg-[#146EF5] text-white shadow-md shadow-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div>{meta.tag}</div>
                </button>
              );
            })}
          </div>
          <div className="text-center mt-2 text-xs font-mono text-slate-300">
            Comparing against: <strong className="text-white">{competitorMeta[activeCompetitor].name}</strong> ({competitorMeta[activeCompetitor].subtitle})
          </div>
        </div>

        {/* View Full Table Toggle on Mobile */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setShowFullTableOnMobile((prev) => !prev)}
            className="text-[11px] font-mono text-[#00D69F] hover:underline flex items-center gap-1 py-1"
          >
            <Table className="w-3 h-3" />
            <span>{showFullTableOnMobile ? 'Switch to Card View' : 'View Full 5-Column Table →'}</span>
          </button>
        </div>

        {/* Mobile Cards Feed */}
        {!showFullTableOnMobile ? (
          <div className="space-y-3.5">
            {features.map((row, idx) => {
              const Icon = row.icon;
              const competitorVal = row[activeCompetitor];
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#060A17]/90 border border-white/[0.08] shadow-lg shadow-black/30 space-y-2.5"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                    <div className="w-6 h-6 rounded-md bg-[#146EF5]/15 border border-[#146EF5]/30 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#00D69F]" />
                    </div>
                    <span className="font-bold text-sm text-white font-mono">{row.feature}</span>
                  </div>

                  {/* Competitor Reality */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                      <span>{competitorMeta[activeCompetitor].name}</span>
                      <span className="text-slate-500">Alternative</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 font-medium">{competitorVal}</div>
                  </div>

                  {/* PocketETF Advantage */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#146EF5]/15 to-[#00D69F]/10 border border-[#00D69F]/40 shadow-sm">
                    <div className="text-[10px] font-mono text-[#00D69F] uppercase font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D69F] animate-pulse" />
                      <span>PocketETF (Solana Native)</span>
                    </div>
                    <div className="text-xs text-white font-bold mt-1 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#00D69F] shrink-0" />
                      <span>{row.pocketetf}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* FULL MATRIX TABLE (Desktop default, mobile toggled) */}
      <div
        className={`${
          showFullTableOnMobile ? 'block' : 'hidden md:block'
        } overflow-x-auto rounded-2xl border border-[#146EF5]/20 bg-[#060A17]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/5`}
      >
        <div className="p-3 text-[11px] font-mono text-slate-400 bg-white/[0.01] border-b border-white/[0.06] flex items-center justify-between md:hidden">
          <span>← Swipe horizontally to see all 5 columns →</span>
          <button
            type="button"
            onClick={() => setShowFullTableOnMobile(false)}
            className="text-[#00D69F] underline font-semibold"
          >
            Back to Card View
          </button>
        </div>

        <table className="w-full min-w-[700px] text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-4 px-5 text-slate-300 font-bold uppercase tracking-wider font-mono w-[24%]">
                Feature / Vector
              </th>
              <th className="py-4 px-4 text-slate-400 font-semibold font-mono w-[19%]">
                Traditional Brokerages
                <div className="text-[10px] text-slate-500 font-normal">Robinhood, Schwab</div>
              </th>
              <th className="py-4 px-4 text-slate-400 font-semibold font-mono w-[19%]">
                EVM Index Protocols
                <div className="text-[10px] text-slate-500 font-normal">Index Coop, PieDAO</div>
              </th>
              <th className="py-4 px-4 text-slate-400 font-semibold font-mono w-[18%]">
                Manual DEX Swapping
                <div className="text-[10px] text-slate-500 font-normal">Jupiter, Raydium</div>
              </th>
              <th className="py-4 px-5 bg-gradient-to-b from-[#146EF5]/20 to-[#00D69F]/10 border-l border-r border-[#00D69F]/30 text-[#00D69F] font-bold font-mono w-[20%]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00D69F] animate-pulse" />
                  <span>PocketETF (Solana)</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-normal">1-Click Social Protocol</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {features.map((row, idx) => {
              const Icon = row.icon;
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-200 flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#146EF5] shrink-0" />
                    <span>{row.feature}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{row.traditional}</td>
                  <td className="py-3.5 px-4 text-slate-400">{row.evm}</td>
                  <td className="py-3.5 px-4 text-slate-400">{row.manual}</td>
                  <td className="py-3.5 px-5 font-bold text-white bg-gradient-to-b from-[#146EF5]/15 to-[#00D69F]/5 border-l border-r border-[#00D69F]/30">
                    <span className="text-[#00D69F] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#00D69F] shrink-0" />
                      <span>{row.pocketetf}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
