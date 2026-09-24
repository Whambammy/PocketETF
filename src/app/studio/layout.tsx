import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Studio | Build & Mint Custom Solana ETFs',
  description:
    'Design, weight, and deploy custom multi-asset tokenized stock ETFs on Solana with 1-click Blinks and Jupiter aggregation.',
  openGraph: {
    title: 'PocketETF Creator Studio | 1-Click Custom ETF Minting',
    description:
      'Design, weight, and deploy custom multi-asset tokenized stock ETFs on Solana with 1-click Blinks and Jupiter aggregation.',
    url: 'https://pocketetf.vercel.app/studio',
    siteName: 'PocketETF Protocol',
    images: [
      {
        url: 'https://pocketetf.vercel.app/og-image.png',
        secureUrl: 'https://pocketetf.vercel.app/og-image.png',
        width: 1024,
        height: 510,
        type: 'image/png',
        alt: 'PocketETF Creator Studio',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PocketETF Creator Studio | 1-Click Custom ETF Minting',
    description:
      'Design, weight, and deploy custom multi-asset tokenized stock ETFs on Solana with 1-click Blinks and Jupiter aggregation.',
    images: ['https://pocketetf.vercel.app/og-image.png'],
    site: '@PocketETF',
    creator: '@PocketETF',
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
