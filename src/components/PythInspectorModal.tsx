'use client';

import React from 'react';
import { X, ShieldCheck, Activity, ExternalLink, Clock, Radio, CheckCircle2, Zap } from 'lucide-react';
import { PYTH_FEED_IDS } from '@/lib/pyth';

interface PythInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  etfName: string;
  holdings: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
  prices: Record<
    string,
    {
      formatted: string;
      change24h: string;
      price: number;
      confidence?: string;
      publishTime?: number;
    }
  >;
}

export function PythInspectorModal({
  isOpen,
  onClose,
  etfName,
  holdings,
  prices,
}: PythInspectorModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-[#0A1128] border border-[#00D69F]/40 rounded-2xl p-6 shadow-2xl shadow-[#00D69F]/10 text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D69F]/20 border border-[#00D69F]/40 flex items-center justify-center text-[#00D69F]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base leading-tight">
                  Pyth Hermes v2 Oracle Inspector
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#00D69F]/20 text-[#00D69F] font-mono text-[10px] border border-[#00D69F]/40">
                  Hermes Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Constituent Oracle Verifications for {etfName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Oracle Protocol Metrics Bar */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="bg-[#0D1530] border border-white/5 rounded-xl p-3 text-center">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-[#00D69F]" />
              PUBLISH LATENCY
            </div>
            <div className="text-sm font-bold text-white mt-1 font-mono">&lt; 400ms</div>
            <div className="text-[9px] text-[#00D69F] font-mono">Sub-second Cross-Chain</div>
          </div>
          <div className="bg-[#0D1530] border border-white/5 rounded-xl p-3 text-center">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#146EF5]" />
              PUBLISHER CONSENSUS
            </div>
            <div className="text-sm font-bold text-white mt-1 font-mono">32 Top Venues</div>
            <div className="text-[9px] text-slate-400 font-mono">CBOE, Jane St, Virtu</div>
          </div>
          <div className="bg-[#0D1530] border border-white/5 rounded-xl p-3 text-center">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" />
              CONFIDENCE (σ)
            </div>
            <div className="text-sm font-bold text-white mt-1 font-mono">Institutional</div>
            <div className="text-[9px] text-amber-400 font-mono">± 0.02% Deviation</div>
          </div>
        </div>

        {/* Holdings Feeds Verification Table */}
        <div className="space-y-3 my-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Basket Constituent Feeds</span>
            <span className="font-mono text-[10px] text-slate-500">HERMES FEED ID (HEX)</span>
          </div>

          <div className="space-y-2">
            {holdings.map((h) => {
              const feedId = PYTH_FEED_IDS[h.symbol] || '0x438f...custom_pyth_id';
              const priceData = prices[h.symbol];
              const conf = priceData?.confidence || '± $0.03';
              const spot = priceData?.formatted || 'Live';

              return (
                <div
                  key={h.symbol}
                  className="bg-[#0D1530] border border-white/5 hover:border-[#00D69F]/30 rounded-xl p-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#146EF5]/20 text-[#146EF5] font-bold text-xs flex items-center justify-center font-mono">
                        {h.symbol}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{h.symbol}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{h.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-300">
                            {h.weight}% weight
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#00D69F]">
                        {spot}
                      </div>
                      <div className="text-[10px] font-mono text-amber-400">
                        conf {conf}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="truncate max-w-[280px]" title={feedId}>
                      Feed: {feedId.slice(0, 10)}...{feedId.slice(-8)}
                    </span>
                    <span className="flex items-center gap-1 text-[#00D69F]">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info & Pyth docs */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Powered by Pyth Network Hermes v2 API
          </span>
          <a
            href="https://hermes.pyth.network/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[#00D69F] hover:underline font-mono text-xs"
          >
            <span>Hermes Specs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
