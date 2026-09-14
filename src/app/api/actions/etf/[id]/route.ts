import { NextRequest, NextResponse } from 'next/server';
import {
  CURATED_ETFS,
  PRE_BAKED_BASKETS,
  ACTIONS_CORS_HEADERS,
  STOCK_MINTS,
  ETFDefinition,
  ETFAsset,
  MAX_ETF_ASSETS,
} from '@/lib/constants';
import { buildBasketTransaction, RouteLiquidityError } from '@/lib/jupiter';

/**
 * Universal CORS preflight handler for Solana Actions
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: ACTIONS_CORS_HEADERS,
  });
}

/**
 * Parses ETF definition from curated ID or dynamic query parameters
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
        const { PublicKey } = require('@solana/web3.js');
        new PublicKey(mint);
      } catch {
        return null;
      }

      if (seenMints.has(mint)) {
        return null; // Duplicate mint address forbidden
      }
      seenMints.add(mint);

      targetAssets.push({
        ticker,
        name: `${ticker} Asset`,
        weightPercent: weight,
        mint,
        decimals: 6,
        color: '#10B981',
        category: 'Semiconductors & AI',
      });
    }

    return {
      id: 'custom',
      name,
      symbol: 'CUSTOM',
      tagline: 'Custom Multi-Asset PocketETF',
      description,
      iconPath: '/etfs/custom.svg',
      category: 'Broad Market',
      colorGradient: { from: '#10B981', to: '#9945FF' },
      targetAssets,
    };
  }

  return null;
}

/**
 * GET Handler: Returns Solana Action metadata compliant with Actions & Blinks Spec
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const etf = resolveETF(id, url.searchParams);

    if (!etf) {
      return NextResponse.json(
        { message: `PocketETF "${id}" not found.` },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Determine absolute HTTPS origin for the icon
    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      url.host;
    const proto =
      request.headers.get('x-forwarded-proto') ||
      (url.protocol.startsWith('https') ? 'https' : 'http');
    const absoluteIconUrl = `${proto}://${host}${etf.iconPath}`;

    const baseActionHref = url.pathname + url.search;

    const actionResponse = {
      type: 'action',
      icon: absoluteIconUrl,
      title: `PocketETF: ${etf.name}`,
      description: etf.description,
      label: 'Buy PocketETF',
      disabled: false,
      links: {
        actions: [
          {
            label: '$10 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=10`,
          },
          {
            label: '$50 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=50`,
          },
          {
            label: '$100 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=100`,
          },
          {
            label: 'Buy Custom Amount',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount={amount}`,
            parameters: [
              {
                name: 'amount',
                label: 'USDC Amount ($)',
                required: true,
              },
            ],
          },
        ],
      },
    };

    return NextResponse.json(actionResponse, {
      status: 200,
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[PocketETF Action GET Error]', error);
    return NextResponse.json(
      { message: error.message || 'Internal error resolving PocketETF Solana Action metadata.' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/**
 * POST Handler: Assembles and compiles the VersionedTransaction v0 for 1-Click Multi-Swap
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);

    // 1. Resolve ETF
    const etf = resolveETF(id, url.searchParams);
    if (!etf) {
      return NextResponse.json(
        { message: `PocketETF "${id}" not found.` },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 2. Parse request body for investor's wallet public key
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Invalid JSON body. Missing investor account address.' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const account = body?.account;
    if (!account || typeof account !== 'string' || account.length < 32 || account.length > 44) {
      return NextResponse.json(
        { message: 'Invalid request: "account" must be a valid Solana public key string.' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(account);
    } catch {
      return NextResponse.json(
        { message: 'Invalid Solana wallet address format.' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 3. Parse USDC amount from query params or body (fallback to $50)
    const amountParam = url.searchParams.get('amount') || body?.amount || '50';
    const usdcAmount = parseFloat(amountParam);

    if (isNaN(usdcAmount) || !Number.isFinite(usdcAmount) || usdcAmount < 0.1 || usdcAmount > 100_000) {
      return NextResponse.json(
        { message: 'Invalid amount: must be a positive dollar amount between $0.10 and $100,000 USDC.' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const isSimulation =
      url.searchParams.get('simulate') === 'true' || process.env.SIMULATION_MODE === 'true';

    // 4. Build Multi-Swap Versioned Transaction v0
    const { base64Tx, byteLength, allocations } = await buildBasketTransaction({
      userPublicKey: account,
      usdcAmount,
      assets: etf.targetAssets,
      isSimulation,
    });

    const assetSummary = allocations
      .map((a) => `${a.asset.weightPercent}% ${a.asset.ticker} ($${a.allocatedDollars})`)
      .join(', ');

    return NextResponse.json(
      {
        type: 'transaction',
        transaction: base64Tx,
        message: `PocketETF swap assembled successfully! Executing: ${assetSummary} (Serialized: ${byteLength}B / 1232B MTU).`,
      },
      {
        status: 200,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  } catch (err: unknown) {
    if (err instanceof RouteLiquidityError) {
      return NextResponse.json(
        { message: `Insufficient on-chain liquidity for ${err.ticker} route.` },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const error = err as Error;
    const msg = error.message || 'Failed to assemble PocketETF transaction.';
    console.error('[PocketETF Action POST Error]', error);

    if (/liquidity|route|cannot be parsed|invalid|exceeds/i.test(msg)) {
      return NextResponse.json(
        { message: msg },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { message: msg },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
