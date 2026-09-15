import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CURATED_ETFS } from '@/lib/constants';
import ETFDetailClient from './ETFDetailClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etf = CURATED_ETFS[params.id];
  if (!etf) {
    return {
      title: 'PocketETF | The 1-Click Solana ETF Protocol',
      description: 'Diversified thematic stock & crypto portfolios on Solana.',
    };
  }

  const title = `PocketETF: ${etf.name} (${etf.symbol})`;
  const description = etf.description;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? (process.env.NEXT_PUBLIC_BASE_URL.startsWith('http') ? process.env.NEXT_PUBLIC_BASE_URL : `https://${process.env.NEXT_PUBLIC_BASE_URL}`)
    : 'https://pocketetf.vercel.app';

  const iconUrl = `${baseUrl}${etf.iconPath}`;

  return {
    title: `${title} | PocketETF`,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/etf/${etf.id}`,
      siteName: 'PocketETF Protocol',
      images: [
        {
          url: iconUrl,
          width: 800,
          height: 800,
          alt: etf.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [iconUrl],
    },
    other: {
      'solana-action': `${baseUrl}/api/actions/etf/${etf.id}`,
    },
  };
}

export default function ETFPage({ params }: Props) {
  const etf = CURATED_ETFS[params.id];
  if (!etf) {
    notFound();
  }

  return <ETFDetailClient etf={etf} />;
}
