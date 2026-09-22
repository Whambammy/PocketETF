'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShieldCheck, 
  PieChart, 
  ArrowUpRight,
  AlertCircle 
} from 'lucide-react';
import { TOKEN_CATALOG, ETFAsset } from '@/lib/constants';

interface PortfolioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onConnectWallet: () => void;
}

interface OnChainHolding {
  mint: string;
  ticker: string;
  name: string;
  amount: number;
  decimals: number;
  usdPrice: number;
  usdValue: number;
  change24h: string;
}

export function PortfolioDrawer({
  isOpen,
  onClose,
  walletAddress,
  onConnectWallet,
}: PortfolioDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [holdings, setHoldings] = useState<OnChainHolding[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [totalValueUsd, setTotalValueUsd] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOnChainBalances = async (pubkey: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch live prices from our Pyth Hermes route
      const priceRes = await fetch('/api/prices');
      const priceData = await priceRes.json();
      const livePrices = priceData.prices || {};

      // 2. Query real on-chain SPL token accounts via public Solana RPC
      const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      
      const res = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'portfolio-query',
          method: 'getTokenAccountsByOwner',
          params: [
            pubkey,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' }
          ]
        })
      });

      const json = await res.json();
      const accounts = json.result?.value || [];

      // Map on-chain accounts to known stock catalog assets & USDC
      const catalogByMint = new Map<string, ETFAsset>(TOKEN_CATALOG.map((a: ETFAsset) => [a.mint, a]));
      const detectedHoldings: OnChainHolding[] = [];
      let foundUsdc = 0;

      for (const item of accounts) {
        const info = item.account?.data?.parsed?.info;
        if (!info) continue;

        const mint = info.mint;
        const rawAmount = info.tokenAmount?.uiAmount;
        const decimals = info.tokenAmount?.decimals ?? 6;

        if (!rawAmount || rawAmount <= 0) continue;

        // Check for Canonical USDC
        if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          foundUsdc += rawAmount;
          continue;
        }

        // Check if token matches our Stock/Commodity Catalog
        const asset = catalogByMint.get(mint);
        if (asset) {
          const priceObj = livePrices[asset.ticker];
          const price = priceObj ? priceObj.price : parseFloat(asset.underlyingPrice?.replace('$', '') || '0');
          const value = rawAmount * price;

          detectedHoldings.push({
            mint,
            ticker: asset.ticker,
            name: asset.name,
            amount: rawAmount,
            decimals,
            usdPrice: price,
            usdValue: value,
            change24h: priceObj?.change24h || asset.change24h || '+0.0%',
          });
        }
      }

      setUsdcBalance(foundUsdc);
      setHoldings(detectedHoldings);

      const totalStockVal = detectedHoldings.reduce((sum, h) => sum + h.usdValue, 0);
      setTotalValueUsd(totalStockVal + foundUsdc);
    } catch (err: any) {
      console.error('[Portfolio] Failed to fetch on-chain balances:', err);
      setError('Could not reach Solana RPC to read token balances. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchOnChainBalances(walletAddress);
    }
  }, [isOpen, walletAddress]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-[#0A1128] border border-[#146EF5]/40 rounded-2xl p-6 shadow-2xl shadow-black/90 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#146EF5]/20 border border-[#146EF5]/40 flex items-center justify-center text-[#00D69F]">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                My PocketETF Holdings
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Read-Only On-Chain RPC Sync
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

        {/* Not Connected State */}
        {!walletAddress ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#146EF5]/10 border border-[#146EF5]/30 flex items-center justify-center text-[#146EF5] mx-auto">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="max-w-xs mx-auto">
              <h4 className="font-bold text-white text-base">Connect Solana Wallet</h4>
              <p className="text-xs text-slate-400 mt-1">
                Connect your wallet to view your verified on-chain tokenized equities, indices, and USDC balances.
              </p>
            </div>
            <button
              onClick={onConnectWallet}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#146EF5] to-[#00D69F] font-bold text-sm text-white shadow-lg shadow-[#146EF5]/20 hover:opacity-90 transition-opacity"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="flex-1 py-4 flex flex-col overflow-y-auto space-y-4">
            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-[#101B3B] to-[#0D1530] border border-[#146EF5]/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>TOTAL EQUITIES &amp; CASH</span>
                <button
                  onClick={() => fetchOnChainBalances(walletAddress)}
                  disabled={loading}
                  className="flex items-center gap-1 text-[#00D69F] hover:underline text-[11px]"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="mt-2 text-3xl font-extrabold font-mono text-white">
                ${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="text-slate-400 font-mono">
                  Wallet: <span className="text-slate-200">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                </div>
                <div className="text-[11px] font-mono text-[#00D69F] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>On-Chain Verified</span>
                </div>
              </div>
            </div>

            {/* Error Message if RPC Failed */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Holdings List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Holdings ({holdings.length + (usdcBalance > 0 ? 1 : 0)})</span>
                <span className="text-[10px] font-mono">VALUED VIA PYTH</span>
              </div>

              {/* USDC Balance item */}
              {usdcBalance > 0 && (
                <div className="bg-[#0D1530] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#2775CA]/20 text-[#2775CA] font-bold text-xs flex items-center justify-center font-mono">
                      USDC
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">USD Coin</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {usdcBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-white">
                      ${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">$1.00 Peg</div>
                  </div>
                </div>
              )}

              {/* Stock Holdings items */}
              {holdings.length === 0 ? (
                <div className="bg-[#0D1530] border border-white/5 rounded-xl p-5 text-center text-slate-400 text-xs">
                  <p className="font-medium text-slate-300">No tokenized stocks found in this wallet.</p>
                  <p className="mt-1 text-slate-500">
                    Buy a curated PocketETF or mint a custom basket to start building your on-chain portfolio.
                  </p>
                </div>
              ) : (
                holdings.map((h) => {
                  const isPositive = !h.change24h.startsWith('-');
                  return (
                    <div
                      key={h.mint}
                      className="bg-[#0D1530] border border-white/5 hover:border-[#146EF5]/30 rounded-xl p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#146EF5]/20 text-[#00D69F] font-bold text-xs flex items-center justify-center font-mono">
                            {h.ticker}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{h.ticker}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {h.amount.toFixed(4)} shares
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-sm font-bold text-white">
                            ${h.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[10px] flex items-center justify-end gap-0.5 ${isPositive ? 'text-[#00D69F]' : 'text-rose-400'}`}>
                            {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {h.change24h}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Liquidity Exit */}
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Spot: ${h.usdPrice.toFixed(2)}
                        </span>
                        <a
                          href={`https://jup.ag/swap/${h.mint}-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-mono text-[#146EF5] hover:text-[#00D69F] transition-colors"
                        >
                          <span>Exit to USDC</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer security notice */}
            <div className="pt-3 border-t border-white/10 text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00D69F]" />
              <span>Production-ready read-only RPC. Zero custody risk.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
