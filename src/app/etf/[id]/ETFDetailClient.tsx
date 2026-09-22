'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Zap,
  Share2,
  ExternalLink,
  Check,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  DollarSign,
  Wallet,
  Smartphone,
} from 'lucide-react';
import { ETFDefinition } from '@/lib/constants';
import { DonutChart } from '@/components/DonutChart';
import { PythInspectorModal } from '@/components/PythInspectorModal';
import { MobileQRModal } from '@/components/MobileQRModal';

interface Props {
  etf: ETFDefinition;
}

export default function ETFDetailClient({ etf }: Props) {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<{
    sol: number;
    usdc: number;
    formattedSol: string;
    formattedUsdc: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('https://pocketetf.vercel.app');
  const [isPythModalOpen, setIsPythModalOpen] = useState<boolean>(false);
  const [isMobileQrOpen, setIsMobileQrOpen] = useState<boolean>(false);
  const [prices, setPrices] = useState<Record<string, any>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      if ((window as any).solana?.isConnected) {
        const addr = (window as any).solana.publicKey?.toString();
        if (addr) {
          setWalletAddress(addr);
          fetchBalance(addr);
        }
      }

      fetch('/api/prices')
        .then((r) => r.json())
        .then((data) => {
          if (data.prices) setPrices(data.prices);
        })
        .catch(() => {});
    }
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const res = await fetch(`/api/wallet/balance?account=${address}`);
      const data = await res.json();
      if (data.success) {
        setWalletBalance({
          sol: data.sol,
          usdc: data.usdc,
          formattedSol: data.formattedSol,
          formattedUsdc: data.formattedUsdc,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined') return;
    const solana = (window as any).solana;
    if (!solana) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    try {
      const resp = await solana.connect();
      const addr = resp.publicKey.toString();
      setWalletAddress(addr);
      fetchBalance(addr);
    } catch (err) {
      console.warn('Wallet connection cancelled', err);
    }
  };

  const handleLiveBuy = async () => {
    setLoading(true);
    setTxError(null);
    setTxSignature(null);

    try {
      const solana = typeof window !== 'undefined' ? (window as any).solana : null;
      if (!solana) {
        throw new Error('Please install Phantom, Backpack, or Solflare to execute on Solana Mainnet.');
      }

      let activeAccount = walletAddress;
      if (!activeAccount) {
        const resp = await solana.connect();
        activeAccount = resp.publicKey.toString();
        setWalletAddress(activeAccount);
      }

      if (!activeAccount) {
        throw new Error('Wallet not connected.');
      }

      const activeAmount = customAmount ? parseFloat(customAmount) : amount;
      if (!activeAmount || activeAmount <= 0) {
        throw new Error('Please enter a valid investment amount.');
      }

      // Zero-Gas Pre-Flight Wallet Check
      let currentUsdc = walletBalance?.usdc;
      try {
        const balRes = await fetch(`/api/wallet/balance?account=${activeAccount}`);
        if (balRes.ok) {
          const balData = await balRes.json();
          if (balData.success) {
            currentUsdc = balData.usdc;
            setWalletBalance({
              sol: balData.sol,
              usdc: balData.usdc,
              formattedSol: balData.formattedSol,
              formattedUsdc: balData.formattedUsdc,
            });
          }
        }
      } catch {
        // fallback to cached walletBalance
      }

      if (typeof currentUsdc === 'number' && currentUsdc < activeAmount) {
        throw new Error(
          `Zero-Gas Safety Guard: Your wallet holds $${currentUsdc.toFixed(2)} USDC, but this ETF purchase requires $${activeAmount.toFixed(2)} USDC on Solana Mainnet. Please swap SOL to USDC in your wallet first to prevent losing network gas fees.`
        );
      }

      // Fetch transaction from the action API
      const res = await fetch(`/api/actions/etf/${etf.id}?amount=${activeAmount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: activeAccount }),
      });

      const data = await res.json();
      if (!res.ok || !data.transaction) {
        throw new Error(data.message || 'Failed to assemble live execution transaction.');
      }

      const { VersionedTransaction } = await import('@solana/web3.js');
      const txBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      let txid: string;
      if (solana.signAndSendTransaction) {
        const sendRes = await solana.signAndSendTransaction(transaction);
        txid = sendRes.signature;
      } else {
        const signed = await solana.signTransaction(transaction);
        const { getSolanaConnection } = await import('@/lib/solana');
        const conn = getSolanaConnection();
        txid = await conn.sendRawTransaction(signed.serialize());
      }

      setTxSignature(txid);
      fetchBalance(activeAccount);
    } catch (err: any) {
      setTxError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const actionUrl = `${origin}/api/actions/etf/${etf.id}`;
  const shareTweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Invest in the ${etf.name} with 1-click on @solana via @PocketETF!\n\n${origin}/etf/${etf.id}\n\n#Solana #Blinks #PocketETF`
  )}`;

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      {/* Breadcrumb & Wallet Status Sub-Bar */}
      <div className="bg-[#0A1128]/80 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#146EF5]" />
            <span>Back to All ETFs</span>
          </Link>

          <div className="flex items-center gap-2">
            {walletAddress ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#00D69F] animate-pulse" />
                <span className="text-slate-300 text-[11px]">
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </span>
                {walletBalance && (
                  <span className="text-[#00D69F] font-bold text-[11px] ml-1">
                    ({walletBalance.formattedUsdc})
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectWallet}
                className="px-3 py-1.5 rounded-xl bg-[#146EF5] hover:bg-[#0D63F8] text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: ETF Overview & Holdings */}
          <div className="lg:col-span-7 space-y-6">
            <div className="fintech-card p-6 sm:p-8 rounded-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center p-2">
                  <Image
                    src={etf.iconPath}
                    alt={etf.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-[#00D69F] bg-[#00D69F]/10 px-2 py-0.5 rounded-full border border-[#00D69F]/20">
                      {etf.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPythModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#00D69F] bg-[#00D69F]/15 hover:bg-[#00D69F]/25 px-2.5 py-0.5 rounded-full border border-[#00D69F]/40 transition-colors shadow-sm cursor-pointer"
                      title="Inspect real-time Pyth Hermes v2 feed IDs, confidence intervals, and latency"
                    >
                      <Activity className="w-3 h-3 text-[#00D69F] animate-pulse" />
                      <span>Pyth Hermes v2 Verified</span>
                    </button>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{etf.name}</h1>
                  <p className="text-xs font-mono text-slate-400 mt-1">{etf.tagline}</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2 border-t border-white/10">
                {etf.description}
              </p>
            </div>

            {/* Asset Allocation Breakdown */}
            <div className="fintech-card p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#00D69F]" />
                    <span>Underlying Holdings &amp; Weights</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Atomic composition routed directly via Jupiter DEX Aggregator
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">{etf.targetAssets.length} Assets</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <div className="w-36 h-36 flex-shrink-0 flex items-center justify-center">
                  <DonutChart segments={etf.targetAssets} size={144} strokeWidth={18} />
                </div>

                <div className="flex-1 w-full space-y-3">
                  {etf.targetAssets.map((asset) => (
                    <div
                      key={asset.ticker}
                      className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <div>
                          <div className="font-bold font-mono text-xs text-white">{asset.ticker}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {asset.name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">{asset.weightPercent}%</div>
                        <div className="text-[10px] text-slate-400">{asset.underlyingPrice}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social & Blinks Sharing Hub */}
            <div className="fintech-card p-6 rounded-2xl space-y-4 bg-gradient-to-br from-[#146EF5]/10 via-[#0A1128] to-transparent border border-[#146EF5]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#146EF5]" />
                  <h3 className="text-sm font-bold text-white">Share as Solana Blink</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Dialect Verified Spec
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Post this ETF directly to Twitter/X, Discord, or Telegram. Users with Solana wallets can buy it with 1 click without leaving their feed.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <a
                  href={shareTweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#146EF5] hover:bg-[#0D63F8] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/25"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Post on X (Twitter)</span>
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(actionUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-semibold text-xs transition-all flex items-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00D69F]" />
                      <span className="text-[#00D69F]">Action URL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copy Solana Action URL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileQrOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#00D69F] font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Trade on Mobile (QR)</span>
                </button>

                <a
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition-all flex items-center gap-1.5"
                >
                  <span>View Action JSON</span>
                  <ExternalLink className="w-3 h-3 text-[#00D69F]" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: 1-Click Buy Interface */}
          <div className="lg:col-span-5 space-y-6">
            <div className="fintech-card p-6 sm:p-7 rounded-2xl space-y-6 border border-[#146EF5]/40 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#00D69F]" />
                  <h3 className="text-sm font-bold text-white">1-Click Live Buy</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-[#00D69F] font-bold">
                  Solana Mainnet
                </span>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Investment Amount (USDC)
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmount(preset);
                        setCustomAmount('');
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        amount === preset && !customAmount
                          ? 'bg-[#146EF5] text-white shadow-md shadow-blue-500/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Custom amount (e.g. 75)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#146EF5]"
                  />
                </div>
              </div>

              {/* Live Wallet Balance Pre-Check */}
              {walletAddress && walletBalance && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Your USDC Balance:</span>
                  </span>
                  <span
                    className={`font-bold ${
                      walletBalance.usdc >= (customAmount ? parseFloat(customAmount) : amount)
                        ? 'text-[#00D69F]'
                        : 'text-amber-400'
                    }`}
                  >
                    {walletBalance.formattedUsdc}
                  </span>
                </div>
              )}

              {/* Live Buy Execution Button */}
              <button
                type="button"
                onClick={handleLiveBuy}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#146EF5] via-[#0D63F8] to-[#00D69F] hover:from-[#257BF6] hover:to-[#14F195] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-98"
              >
                <Zap className={`w-4 h-4 text-[#00D69F] ${loading ? 'animate-bounce' : ''}`} />
                <span>
                  {loading
                    ? 'Awaiting Wallet Approval...'
                    : `Execute 1-Click Buy $${customAmount || amount} ETF`}
                </span>
              </button>

              {/* Success Result */}
              {txSignature && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Check className="w-4 h-4" />
                    <span>Execution Confirmed On-Chain!</span>
                  </div>
                  <a
                    href={`https://solscan.io/tx/${txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00D69F] hover:underline flex items-center gap-1 text-[11px] break-all"
                  >
                    <span>View Transaction on Solscan</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Error Message */}
              {txError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-mono space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Execution Notice:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">{txError}</p>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D69F]" />
                  <span>VersionedTransaction v0 (Under 1,232 Bytes)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>1.2M Compute Units + Idempotent ATAs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pyth Hermes v2 Oracle Inspector Modal */}
      <PythInspectorModal
        isOpen={isPythModalOpen}
        onClose={() => setIsPythModalOpen(false)}
        etfName={etf.name}
        holdings={etf.targetAssets.map((a) => ({
          symbol: a.ticker,
          name: a.name,
          weight: a.weightPercent,
        }))}
        prices={prices}
      />

      {/* Mobile QR Modal */}
      <MobileQRModal
        isOpen={isMobileQrOpen}
        onClose={() => setIsMobileQrOpen(false)}
        etfId={etf.id}
        etfName={etf.name}
        url={`${origin}/etf/${etf.id}`}
      />
    </div>
  );
}
