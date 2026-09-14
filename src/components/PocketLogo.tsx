'use client';

import React from 'react';
import Image from 'next/image';

interface PocketLogoProps {
  size?: number;
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  variant?: 'mark' | 'full';
}

export function PocketLogo({
  size = 38,
  className = '',
  imageClassName = '',
  showText = true,
  variant = 'full',
}: PocketLogoProps) {
  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
        {/* Official PocketETF Icon Mark */}
        <div
          style={{ width: size, height: size }}
          className="relative rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center bg-brand-surface p-[1px] border border-cobalt-500/30"
        >
          <img
            src="/favicon.png"
            alt="PocketETF Icon"
            className="w-full h-full object-contain rounded-[10px]"
          />
        </div>

        {/* Brand Typography in Bold Neo-Grotesque */}
        {showText && (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center">
                Pocket<span className="text-[#146EF5]">ETF</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mint-500/15 text-mint-400 border border-mint-500/30 font-mono font-semibold tracking-wider uppercase">
                Blink v2.1
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              1-Click Stock Baskets
            </span>
          </div>
        )}
      </div>
    );
  }

  // Official Full Logo Lockup (transparent dark-mode native)
  return (
    <div className={`inline-flex items-center group cursor-pointer ${className}`}>
      <div className="relative flex items-center">
        <img
          src="/logo-dark.png"
          alt="PocketETF Logo"
          className={`w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
            imageClassName || 'h-9 sm:h-10'
          }`}
        />
      </div>
    </div>
  );
}

export default PocketLogo;
