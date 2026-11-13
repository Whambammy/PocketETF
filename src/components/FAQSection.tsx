'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShieldCheck, DollarSign, Database, Activity, Sparkles, Lock } from 'lucide-react';

interface FAQItem {
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  answer: React.ReactNode;
}

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // First item open by default

  const toggleFAQ = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const faqs: FAQItem[] = [
    {
      question: 'Is PocketETF safe and non-custodial?',
      icon: ShieldCheck,
      answer: (
        <div className="space-y-2">
          <p>
            <strong>Self-custody.</strong> PocketETF never asks for private keys or holds your funds. Transactions carry smart contract, issuer, liquidity, and network risks; no application can promise complete safety.
          </p>
          <p className="text-slate-400">
            The server compiles and simulates an atomic <strong>versioned transaction (v0 or v1)</strong> using the version supported by your wallet. Review the amounts, minimum outputs, and costs before signing. If any swap fails, the swaps revert together, although network fees can still apply.
          </p>
        </div>
      ),
    },
    {
      question: 'Where do the tokenized stocks and assets come from?',
      icon: Database,
      answer: (
        <div className="space-y-2">
          <p>
            The catalog uses <strong>verified token identities</strong> from the asset registry, including <strong>issuer and provenance information</strong>. Tokenized assets are issued by external providers; PocketETF does not issue securities or ETF shares.
          </p>
          <p className="text-slate-400">
            Backing, redemption, custody, and transfer restrictions depend on the specific issuer and token. Buying a token does not necessarily give you direct ownership or redemption rights to the underlying shares. Check the issuer terms before trading.
          </p>
        </div>
      ),
    },
    {
      question: 'Is this a free platform, or does it generate revenue and how?',
      icon: DollarSign,
      answer: (
        <div className="space-y-2">
          <p>
            <strong>Current Protocol Fee:</strong> PocketETF charges <strong>0% protocol fees</strong>. DEX costs, slippage, network fees, and token-account rent can still apply and are shown in the trade preview.
          </p>
          <p className="text-slate-400">
            <strong>Future Revenue Model:</strong> Platform routing fees are not implemented or collected. Any future fee would require a separate implementation and review.
          </p>
          <p className="text-slate-400">
            <strong>Creator Revenue Share:</strong> Creator payouts are not implemented. Sharing a basket does not currently earn routing fees.
          </p>
        </div>
      ),
    },
    {
      question: 'How does Pyth Network power the pricing and Net Asset Value (NAV)?',
      icon: Activity,
      answer: (
        <div className="space-y-2">
          <p>
            PocketETF uses <strong>Pyth Network Hermes v2</strong> feeds where available, with publish timestamps, confidence information, and freshness checks. Missing or stale references are marked unavailable.
          </p>
          <p className="text-slate-400">
            Holdings valuation uses token quantities and reference prices: <strong>portfolio reference value</strong> is <code className="text-[#00D69F] font-mono">sum(quantity * reference price)</code>. A weighted price is not a share NAV. <strong>Oracle confidence</strong> is not the executable spread; Jupiter quotes determine expected and minimum swap outputs.
          </p>
        </div>
      ),
    },
    {
      question: 'What happens if I don’t have enough Solana USDC in my wallet?',
      icon: Lock,
      answer: (
        <div className="space-y-2">
          <p>
            PocketETF checks <strong>on-chain balances and transaction simulation</strong> before presenting a trade for signing. You need enough USDC for the purchase and enough native SOL for network costs and any new token accounts.
          </p>
          <p className="text-slate-400">
            When the balance or simulation check fails, the app displays the error instead of providing a trade to approve. Balances and routes can change after a preview; <strong>always review your wallet prompt</strong>.
          </p>
        </div>
      ),
    },
    {
      question: 'Can I sell, rebalance, or withdraw my stocks anytime?',
      icon: Sparkles,
      answer: (
        <div className="space-y-2">
          <p>
            <strong>Yes, you have full ownership.</strong> When you execute a PocketETF basket, the individual SPL tokens settle directly into your self-custody wallet (Phantom, Solflare, Backpack).
          </p>
          <p className="text-slate-400">
            PocketETF has no pooled vault or annual management fee. Use the trade review to sell or rebalance, or trade individual tokens through a compatible DEX. Execution depends on liquidity, issuer restrictions, and network conditions.
          </p>
        </div>
      ),
    },
  ];

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#146EF5]/10 border border-[#146EF5]/30 text-xs font-mono text-[#00D69F] mb-4">
          <HelpCircle className="w-3.5 h-3.5 text-[#00D69F]" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Everything You Need to Know
        </h2>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Transparent answers regarding safety, real-world asset provenance, Pyth oracles, and protocol fees.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          const Icon = faq.icon;

          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-[#0A1128]/90 border-[#146EF5]/50 shadow-lg shadow-blue-500/10'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(idx)}
                className="w-full py-4 px-5 flex items-center justify-between text-left gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isOpen
                        ? 'bg-[#146EF5]/20 text-[#00D69F] border border-[#146EF5]/40'
                        : 'bg-white/[0.04] text-slate-400 border border-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {faq.question}
                  </span>
                </div>

                <div className="text-slate-400 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#00D69F]" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.05] animate-fadeIn">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
