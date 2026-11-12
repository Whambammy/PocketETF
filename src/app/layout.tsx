import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { WalletProvider } from "@/components/WalletProvider";
import { headers } from "next/headers";
import { getSiteOrigin } from "@/lib/siteUrl";
export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "PocketETF | Self-custodied baskets on Solana",
    template: "%s | PocketETF",
  },
  description:
    "Preview and trade baskets of verified Solana tokens. Exact allocations, wallet signing, simulated transactions and explicit price freshness.",
  icons: { icon: "/favicon.png" },
  openGraph: { images: ["/og-image.png"] },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers(); // Request-time rendering is required for per-request CSP nonces.
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-emerald-400 to-cyan-400" />
        <WalletProvider>
          <HeaderNav />
          <main className="flex-1">{children}</main>
        </WalletProvider>
        <footer className="border-t border-slate-700 mt-20 py-10 px-4 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto space-y-3">
            <p>
              PocketETF assembles baskets of tokens held in your wallet. It does
              not issue ETF shares or manage a pooled fund.
            </p>
            <p>
              Tokenized equities carry issuer, custody, liquidity and
              transfer-control risks. Review the terms of the specific assets
              and external providers. Quotes and oracle reference prices can
              differ. No return, execution speed or security guarantee is made.
            </p>
            <div className="flex gap-5 flex-wrap">
              <Link href="/portfolio">Portfolio & transaction history</Link>
              <a
                href="https://docs.xstocks.fi/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Issuer information
              </a>
              <a
                href="https://developers.jup.ag/docs/swap"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jupiter routing
              </a>
              <Link href="/actions.json">Solana Actions</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
