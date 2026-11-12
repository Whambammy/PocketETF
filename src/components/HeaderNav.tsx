"use client";
import Link from "next/link";
import { PocketLogo } from "./PocketLogo";
import { WalletControl } from "./WalletProvider";
export function HeaderNav() {
  return (
    <header className="sticky top-0 z-40 bg-[#0A1128]/95 backdrop-blur border-b border-blue-500/20">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" aria-label="PocketETF home">
          <PocketLogo imageClassName="h-9 w-auto" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex gap-4 text-xs sm:text-sm order-3 md:order-none w-full md:w-auto overflow-x-auto whitespace-nowrap"
        >
          <Link href="/">Explore</Link>
          <Link href="/studio">Creator Studio</Link>
          <Link href="/portfolio">Portfolio & history</Link>
          <Link href="/compare">How it works</Link>
        </nav>
        <WalletControl />
      </div>
    </header>
  );
}
