'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface MobileQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  etfId: string;
  etfName: string;
  url: string;
}

export function MobileQRModal({
  isOpen,
  onClose,
  etfId,
  etfName,
  url,
}: MobileQRModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Phantom Universal Deep Link format
  const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent('https://pocketetf.vercel.app')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#0A1128] border border-[#146EF5]/30 rounded-2xl p-6 shadow-2xl shadow-[#146EF5]/20 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#146EF5]/20 border border-[#146EF5]/40 flex items-center justify-center text-[#00D69F]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                Scan to Trade on Mobile
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {etfName}
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

        {/* QR Code Container */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-xl shadow-black/50 border-4 border-[#00D69F]/40 flex items-center justify-center">
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-[#00D69F]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Direct Solana Actions & Jupiter Integration</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#0D1530] border border-white/5 rounded-xl p-3.5 space-y-2 mb-4 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#146EF5]/30 text-[#00D69F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span>Open your phone's camera or the <strong>Phantom / Backpack</strong> in-app scanner.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#146EF5]/30 text-[#00D69F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span>Point at the QR code to open this ETF directly inside your mobile wallet.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#146EF5]/30 text-[#00D69F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span>Review live Pyth NAV and execute atomically with 1 click.</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all text-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#00D69F]" />
                <span className="text-[#00D69F]">Copied Link!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <a
            href={phantomDeepLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#146EF5] hover:bg-[#146EF5]/80 font-semibold text-xs text-white transition-all shadow-md shadow-[#146EF5]/30"
          >
            <span>Phantom Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
