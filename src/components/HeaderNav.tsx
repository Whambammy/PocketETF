'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PocketLogo } from '@/components/PocketLogo';
import {
  Sparkles,
  ExternalLink,
  Menu,
  X,
  Layers,
  BarChart3,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A1128]/95 border-b border-[#146EF5]/20 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
        {/* Logo - Sized responsively to preserve mobile breathing room */}
        <Link
          href="/"
          className="hover:opacity-95 transition-opacity flex items-center shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <PocketLogo imageClassName="h-8 sm:h-10 md:h-12" />
        </Link>

        {/* Desktop Navigation Links (hidden on mobile) */}
        <nav className="hidden sm:flex items-center gap-3 md:gap-5">
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            Explore ETFs
          </Link>

          <Link
            href="/compare"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-[#00D69F] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-1.5"
          >
            <span>Compare</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00D69F]/15 text-[#00D69F] font-mono border border-[#00D69F]/30">
              vs X
            </span>
          </Link>

          <Link
            href="/studio"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:from-[#257BF6] hover:to-[#146EF5] text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-400/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
            <span>Creator Studio</span>
          </Link>

          {/* Solana Ecosystem Badge */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-[#14F195]/25 shadow-sm">
            <a
              href="https://solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:opacity-85 transition-opacity"
              title="Solana Network"
            >
              <img
                src="/solanaLogo.png"
                alt="Solana"
                className="h-2.5 sm:h-3 w-auto object-contain"
              />
            </a>
            <span className="h-3 w-[1px] bg-white/20" />
            <span className="text-[#14F195] text-[10px] font-mono font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
              Mainnet
            </span>
          </div>

          <a
            href="https://dial.to"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-blue-500/40"
          >
            <span>Dialect</span>
            <ExternalLink className="w-3 h-3 text-[#00D69F]" />
          </a>
        </nav>

        {/* Mobile Header Controls (< sm) */}
        <div className="sm:hidden flex items-center gap-2">
          {/* Direct Mobile Quick-Action to Studio */}
          <Link
            href="/studio"
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#146EF5] to-[#0D63F8] text-white shadow-sm border border-blue-400/30 active:scale-95 transition-all"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Sparkles className="w-3 h-3 text-[#00D69F]" />
            <span>Studio</span>
          </Link>

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (< sm) */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#146EF5]/20 bg-[#060A17]/98 backdrop-blur-2xl px-4 py-4 space-y-2.5 shadow-2xl transition-all">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-200 active:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#146EF5]/15 border border-[#146EF5]/30 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#00D69F]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Explore ETFs</div>
              <div className="text-[11px] text-slate-400 font-mono">Curated tokenized equity baskets</div>
            </div>
          </Link>

          <Link
            href="/compare"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-200 active:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-[#00D69F]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Compare vs. World</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00D69F]/15 text-[#00D69F] font-mono border border-[#00D69F]/30">
                  vs X
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">PocketETF vs. Brokerages & EVM</div>
            </div>
          </Link>

          <Link
            href="/studio"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#146EF5]/20 to-[#00D69F]/10 border border-[#00D69F]/30 text-white active:scale-[0.99] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#146EF5] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
              <Sliders className="w-4 h-4 text-[#00D69F]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Creator Studio</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-400/20 text-blue-300">
                  Custom Blinks
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono">Build & mint 1-click social ETFs</div>
            </div>
          </Link>

          {/* Status and Ecosystem Links Bar */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/50 border border-[#14F195]/20">
              <img src="/solanaLogo.png" alt="Solana" className="h-2.5 w-auto object-contain" />
              <span className="h-2.5 w-[1px] bg-white/20" />
              <span className="text-[#14F195] text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
                Mainnet
              </span>
            </div>

            <a
              href="https://dial.to"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
            >
              <span>Dial.to Test</span>
              <ExternalLink className="w-3 h-3 text-[#00D69F]" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
