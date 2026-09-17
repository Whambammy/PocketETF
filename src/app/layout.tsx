import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { PocketLogo } from '@/components/PocketLogo';
import { Sparkles, ExternalLink, ShieldCheck, Zap, Terminal, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PocketETF | 1-Click Tokenized Stock ETFs for Solana Blinks',
  description:
    'Institutional-grade 1-click tokenized stock and ETF execution protocol for Solana Blinks and Jupiter DEX aggregation. Execute NVDA, AAPL, SPY, QQQ, and Gold proxies atomically in a single transaction.',
  keywords: [
    'PocketETF',
    'Solana',
    'Blinks',
    'Solana Actions',
    'Jupiter Exchange',
    'Tokenized Stocks',
    'RWAs',
    'DeFi',
    'NVDA',
    'SPY',
  ],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'PocketETF | 1-Click Tokenized Stock ETFs for Solana Blinks',
    description: 'Execute multi-asset stock and index ETFs natively via Solana Blinks and Jupiter.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#0A1128] text-slate-100 antialiased selection:bg-[#00D69F] selection:text-black">
        {/* Top Brand Hairline Indicator */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#146EF5] via-[#00D69F] to-[#14F195]" />

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A1128]/90 border-b border-[#146EF5]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] sm:h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="hover:opacity-95 transition-opacity flex items-center py-1">
              <PocketLogo imageClassName="h-[56px] sm:h-[68px]" />
            </Link>

            {/* Nav Links */}
            <nav className="flex items-center gap-2 sm:gap-5">
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
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00D69F]/15 text-[#00D69F] font-mono border border-[#00D69F]/30">vs X</span>
              </Link>

              <Link
                href="/studio"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#0D63F8] hover:from-[#257BF6] hover:to-[#146EF5] text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00D69F]" />
                <span>Creator Studio</span>
              </Link>

              {/* Solana Network Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#14F195]/25 text-[11px] font-mono text-slate-300">
                <img src="/solanaLogo.png" alt="Solana" className="w-4 h-4 object-contain" />
                <span className="text-[#14F195] font-semibold">Mainnet-Beta</span>
              </div>

              <a
                href="https://dial.to"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-blue-500/40"
              >
                <span>Dialect</span>
                <ExternalLink className="w-3 h-3 text-[#00D69F]" />
              </a>
            </nav>
          </div>
        </header>

        {/* Main Application Content */}
        <main className="flex-grow">{children}</main>

        {/* Protocol Security & Architecture Footer */}
        <footer className="border-t border-[#146EF5]/20 bg-[#060A17] py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div className="md:col-span-2 space-y-3">
                <PocketLogo size={34} />
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  PocketETF is a decentralized multi-asset ETF execution engine engineered for the Solana
                  Actions &amp; Blinks standard. Bundles tokenized stocks, index ETFs, and commodities into a
                  single atomic VersionedTransaction (v0) using Jupiter DEX aggregation and Address Lookup
                  Tables.
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                  <span>Solana Spec: Actions v2.1.3</span>
                  <span>•</span>
                  <span>Execution: v0 Versioned Tx</span>
                  <span>•</span>
                  <span>Oracle: Pyth Hermes v2</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-3 font-mono">
                  Execution Safeguards
                </h4>
                <ul className="text-xs text-slate-400 space-y-2 font-mono">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00D69F]" />
                    <span>1232B MTU Limit Guard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#146EF5]" />
                    <span>1,200,000 Compute Unit Cap</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pyth Hermes Feeds (±σ)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Zero-Dust Atomic Math</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-3 font-mono">
                  Network &amp; Discovery
                </h4>
                <div className="text-xs text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Universal CORS:</span>
                    <span className="font-mono text-[#00D69F] font-semibold">Enabled (*)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protocol Comparison:</span>
                    <Link href="/compare" className="font-mono text-[#00D69F] hover:underline">
                      PocketETF vs X
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span>Oracle Feeds:</span>
                    <Link href="/api/prices" className="font-mono text-purple-400 hover:underline">
                      /api/prices (Pyth)
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span>Action Rules:</span>
                    <Link href="/actions.json" className="font-mono text-[#146EF5] hover:underline">
                      /actions.json
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
              <p>© 2026 PocketETF Protocol. Open-source decentralized finance infrastructure.</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <img src="/solanaLogo.png" alt="Solana" className="w-3.5 h-3.5 object-contain" />
                  <span>Built on Solana</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-[#00D69F] animate-pulse" />
                  Mainnet-Beta Ready
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
