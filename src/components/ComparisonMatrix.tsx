'use client';

import React from 'react';
import { Check, X, Shield, Zap, Clock, DollarSign, Layers, Share2 } from 'lucide-react';

export function ComparisonMatrix() {
  const features = [
    {
      feature: 'Trading Hours',
      icon: Clock,
      traditional: '9:30 AM – 4:00 PM EST (Closed Weekends)',
      evm: '24/7/365 Continuous',
      manual: '24/7/365 Continuous',
      pocketetf: '24/7/365 Continuous',
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
      pocketetf: 'Native Solana Blinks (X, Discord)',
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
    <section id="compare" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#146EF5]/10 border border-[#146EF5]/30 text-xs font-mono text-[#00D69F] mb-4">
          <Layers className="w-3.5 h-3.5 text-[#00D69F]" />
          <span>Competitive Landscape &amp; Value Proposition</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Why <span className="bg-gradient-to-r from-[#00D69F] via-[#146EF5] to-[#38BDF8] bg-clip-text text-transparent">PocketETF</span>?
        </h2>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          How PocketETF compares against legacy brokerages, Ethereum-based index protocols, and manual decentralized exchange swapping.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#146EF5]/20 bg-[#060A17]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-4 px-5 text-slate-300 font-bold uppercase tracking-wider font-mono">
                Feature / Vector
              </th>
              <th className="py-4 px-5 text-slate-400 font-semibold font-mono">
                Traditional Brokerages
                <div className="text-[10px] text-slate-500 font-normal">Robinhood, Schwab</div>
              </th>
              <th className="py-4 px-5 text-slate-400 font-semibold font-mono">
                EVM Index Protocols
                <div className="text-[10px] text-slate-500 font-normal">Index Coop, PieDAO</div>
              </th>
              <th className="py-4 px-5 text-slate-400 font-semibold font-mono">
                Manual DEX Swapping
                <div className="text-[10px] text-slate-500 font-normal">Jupiter, Raydium</div>
              </th>
              <th className="py-4 px-5 bg-gradient-to-b from-[#146EF5]/20 to-[#00D69F]/10 border-l border-r border-[#00D69F]/30 text-[#00D69F] font-bold font-mono">
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
                  <td className="py-3.5 px-5 text-slate-400">{row.traditional}</td>
                  <td className="py-3.5 px-5 text-slate-400">{row.evm}</td>
                  <td className="py-3.5 px-5 text-slate-400">{row.manual}</td>
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
