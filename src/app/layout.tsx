import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { PocketLogo } from '@/components/PocketLogo';
import { HeaderNav } from '@/components/HeaderNav';
import { ShieldCheck, Zap, Terminal, Activity } from 'lucide-react';

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
    description:
      'Institutional-grade 1-click tokenized stock and ETF execution protocol for Solana Blinks and Jupiter DEX aggregation.',
    url: 'https://pocketetf.vercel.app',
    siteName: 'PocketETF Protocol',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PocketETF - Institutional Stock ETFs Native to Solana Blinks',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PocketETF | 1-Click Tokenized Stock ETFs for Solana Blinks',
    description:
      'Execute multi-asset stock and index ETFs natively via Solana Blinks and Jupiter DEX aggregation.',
    images: ['/og-image.png'],
    creator: '@PocketETF',
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

        {/* Global Responsive Navigation Header */}
        <HeaderNav />

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

            <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-mono">
              <p>© 2026 PocketETF Protocol. Open-source decentralized finance infrastructure.</p>
              <div className="flex flex-wrap items-center gap-5">
                <a
                  href="https://solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-[#14F195]/25 hover:border-[#14F195]/50 transition-all shadow-sm group"
                  title="Built natively on Solana"
                >
                  <span className="text-[10px] text-slate-400 font-mono">Built natively on</span>
                  <img
                    src="/solanaLogo.png"
                    alt="Solana"
                    className="h-3 sm:h-3.5 w-auto object-contain transition-transform group-hover:scale-105"
                  />
                </a>
                <span className="flex items-center gap-2 text-slate-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00D69F] animate-pulse" />
                  Solana Mainnet-Beta
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
