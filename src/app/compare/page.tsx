import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Layers } from 'lucide-react';
import { ComparisonMatrix } from '@/components/ComparisonMatrix';
import { FAQSection } from '@/components/FAQSection';

export const metadata = {
  title: 'PocketETF vs. Traditional Brokerages & EVM Protocols | Comparison',
  description: 'Detailed competitive analysis of PocketETF vs. Robinhood, Schwab, Index Coop, and manual Solana DEX swaps.',
};

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-[#00D69F] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore ETFs</span>
        </Link>
      </div>

      <ComparisonMatrix />

      <div className="mt-16">
        <FAQSection />
      </div>
    </div>
  );
}
