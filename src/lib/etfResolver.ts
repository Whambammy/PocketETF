import { PublicKey } from '@solana/web3.js';
import {
  CURATED_ETFS,
  PRE_BAKED_BASKETS,
  STOCK_MINTS,
  TOKEN_CATALOG,
  ETFDefinition,
  ETFAsset,
  MAX_ETF_ASSETS,
} from '@/lib/constants';

/**
 * Universal resolver for both curated static PocketETFs and dynamic user-minted custom baskets
 */
export function resolveETF(id: string, searchParams: URLSearchParams): ETFDefinition | null {
  // 1. Check curated PocketETFs
  if (CURATED_ETFS[id]) {
    return CURATED_ETFS[id];
  }

  // 2. Check legacy alias
  if (PRE_BAKED_BASKETS[id]) {
    return PRE_BAKED_BASKETS[id];
  }

  // 3. Check dynamic custom ETF
  if (id === 'custom') {
    const rawAssets = searchParams.get('assets'); // e.g. "NVDA:40,TSM:30,AMD:30"
    const rawName = searchParams.get('name') || 'Custom Stock ETF';
    const rawDescription =
      searchParams.get('description') ||
      'Custom user-generated multi-asset equity ETF executed atomically via PocketETF and Jupiter DEX aggregation.';

    if (!rawAssets) {
      return null;
    }

    // Sanitize user-provided text to prevent XSS / injection attacks
    const name = rawName.replace(/[^a-zA-Z0-9 \-_().,]/g, '').trim().slice(0, 60) || 'Custom Stock ETF';
    const description =
      rawDescription.replace(/[^a-zA-Z0-9 \-_().,!?]/g, '').trim().slice(0, 250) ||
      'Custom equity ETF executed atomically via PocketETF.';

    const assetPairs = rawAssets.split(',').filter(Boolean);
    if (assetPairs.length === 0 || assetPairs.length > MAX_ETF_ASSETS) {
      return null;
    }

    const seenTickers = new Set<string>();
    const seenMints = new Set<string>();
    const targetAssets: ETFAsset[] = [];

    for (const pair of assetPairs) {
      const [tickerRaw, weightStr] = pair.split(':');
      const ticker = (tickerRaw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const weight = parseFloat(weightStr || '0');

      if (!ticker || ticker.length > 10 || isNaN(weight) || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
        return null;
      }

      if (seenTickers.has(ticker)) {
        return null; // Duplicate ticker forbidden
      }
      seenTickers.add(ticker);

      // Check if ticker is in known STOCK_MINTS or direct base58 pubkey
      let mint = STOCK_MINTS[ticker];
      if (!mint && ticker.length >= 32 && ticker.length <= 44) {
        mint = ticker;
      }
      if (!mint) {
        mint = STOCK_MINTS.NVDA; // fallback default
      }

      // Strict Base58 public key validation
      try {
        new PublicKey(mint);
      } catch {
        return null;
      }

      if (seenMints.has(mint)) {
        return null; // Duplicate mint address forbidden
      }
      seenMints.add(mint);

      const catalogMatch = TOKEN_CATALOG.find((t) => t.ticker === ticker || t.mint === mint);

      targetAssets.push({
        ticker,
        name: catalogMatch?.name || `${ticker} Asset`,
        weightPercent: weight,
        mint,
        decimals: catalogMatch?.decimals || 6,
        color: catalogMatch?.color || '#10B981',
        category: catalogMatch?.category || 'Semiconductors & AI',
        primaryDex: catalogMatch?.primaryDex || 'Whirlpool',
      });
    }

    // Optional custom badge/image URL or preset path
    const rawImage = searchParams.get('image');
    let iconPath = '/etfs/custom.png';
    if (rawImage) {
      const trimmed = rawImage.trim();
      if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        iconPath = trimmed.slice(0, 500);
      } else if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        iconPath = trimmed.slice(0, 500);
      }
    }

    return {
      id: 'custom',
      name,
      symbol: 'CUSTOM',
      tagline: 'Custom Multi-Asset PocketETF',
      description,
      iconPath,
      category: 'Broad Market',
      colorGradient: { from: '#10B981', to: '#9945FF' },
      targetAssets,
    };
  }

  return null;
}
