import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveETF, safeDecode } from '@/lib/etfResolver';
import { resolveDirectImageUrl } from '@/lib/imageResolver';
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? (process.env.NEXT_PUBLIC_BASE_URL.startsWith('http') ? process.env.NEXT_PUBLIC_BASE_URL : `https://${process.env.NEXT_PUBLIC_BASE_URL}`)
    : 'https://pocketetf.vercel.app';

  const sp = buildSearchParams(searchParams);
  const etf = resolveETF(params.id, sp);

  if (!etf) {
    return {
      metadataBase: new URL(baseUrl),
      title: 'PocketETF | The 1-Click Solana ETF Protocol',
      description: 'Diversified thematic stock & crypto portfolios on Solana.',
      openGraph: {
        title: 'PocketETF | The 1-Click Solana ETF Protocol',
        description: 'Diversified thematic stock & crypto portfolios on Solana.',
        images: [`${baseUrl}/og-image.png`],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'PocketETF | The 1-Click Solana ETF Protocol',
        description: 'Diversified thematic stock & crypto portfolios on Solana.',
        images: [`${baseUrl}/og-image.png`],
      },
    };
  }

  const title = `PocketETF: ${etf.name} (${etf.symbol})`;
  const description = etf.description;

  const BANNER_MAP: Record<string, string> = {
    'silicon-ai': '/etfs/silicon-ai-banner.png',
    'mag-titans': '/etfs/mag-titans-banner.png',
    'spy-benchmark': '/etfs/spy-benchmark-banner.png',
    'nasdaq-growth': '/etfs/nasdaq-growth-banner.png',
    'crypto-frontier': '/etfs/crypto-frontier-banner.png',
    'hard-assets': '/etfs/hard-assets-banner.png',
    'backpack-titans': '/etfs/backpack-titans-banner.png',
    'ai-chipset': '/etfs/silicon-ai-banner.png',
    'us-mega': '/etfs/mag-titans-banner.png',
    'index-proxy': '/etfs/spy-benchmark-banner.png',
    'custom': '/etfs/custom-banner.png',
  };

  let previewImage = `${baseUrl}/og-image.png`;
  if (params.id === 'custom') {
    const rawCustomImg = sp.get('image');
    let customImg = rawCustomImg ? safeDecode(rawCustomImg).trim() : null;
    if (customImg) {
      const resolved = await resolveDirectImageUrl(customImg);
      if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
        previewImage = resolved;
      } else if (resolved && resolved.startsWith('/')) {
        previewImage = `${baseUrl}${resolved}`;
      } else {
        previewImage = `${baseUrl}/etfs/custom-banner.png`;
      }
    } else {
      previewImage = `${baseUrl}/etfs/custom-banner.png`;
    }
  } else if (BANNER_MAP[params.id]) {
    previewImage = `${baseUrl}${BANNER_MAP[params.id]}`;
  } else if (etf.iconPath) {
    previewImage = etf.iconPath.startsWith('http') ? etf.iconPath : `${baseUrl}${etf.iconPath}`;
  }

  const queryStr = params.id === 'custom' && sp.toString() ? `?${sp.toString()}` : '';

  const isBanner = previewImage.includes('-banner.png') || previewImage.includes('og-image.png');

  return {
    metadataBase: new URL(baseUrl),
    title: `${title} | PocketETF`,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/etf/${etf.id}${queryStr}`,
      siteName: 'PocketETF Protocol',
      images: [
        {
          url: previewImage,
          secureUrl: previewImage,
          ...(isBanner ? { width: 1200, height: 630, type: 'image/png' } : {}),
          alt: `${etf.name} (${etf.symbol}) - PocketETF Protocol`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: isBanner ? 'summary_large_image' : 'summary',
      title,
      description,
      images: [previewImage],
      site: '@PocketETF',
      creator: '@PocketETF',
    },
    other: {
      'solana-action': `${baseUrl}/api/actions/etf/${etf.id}${queryStr}`,
    },
  };
}

export default async function ETFPage({ params, searchParams }: Props) {
  const sp = buildSearchParams(searchParams);
  const etf = resolveETF(params.id, sp);
  if (!etf) {
    notFound();
  }

  // Auto-resolve indirect image URLs (e.g. Postimages) to direct raw image for clean client display
  if (params.id === 'custom' && etf.iconPath) {
    etf.iconPath = await resolveDirectImageUrl(etf.iconPath);
  }

  const queryStr = sp.toString() ? `?${sp.toString()}` : '';
  return <ETFDetailClient etf={etf} queryStr={queryStr} />;
}
