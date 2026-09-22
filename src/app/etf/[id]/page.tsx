import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveETF } from '@/lib/etfResolver';
import ETFDetailClient from './ETFDetailClient';

interface Props {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

function buildSearchParams(searchParams?: { [key: string]: string | string[] | undefined }): URLSearchParams {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') {
        params.set(key, value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      }
    }
  }
  return params;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const sp = buildSearchParams(searchParams);
  const etf = resolveETF(params.id, sp);
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

  const iconUrl = etf.iconPath.startsWith('http') ? etf.iconPath : `${baseUrl}${etf.iconPath}`;
  const queryStr = params.id === 'custom' && sp.toString() ? `?${sp.toString()}` : '';

  return {
    title: `${title} | PocketETF`,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/etf/${etf.id}${queryStr}`,
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
      'solana-action': `${baseUrl}/api/actions/etf/${etf.id}${queryStr}`,
    },
  };
}

export default function ETFPage({ params, searchParams }: Props) {
  const sp = buildSearchParams(searchParams);
  const etf = resolveETF(params.id, sp);
  if (!etf) {
    notFound();
  }

  return <ETFDetailClient etf={etf} />;
}

