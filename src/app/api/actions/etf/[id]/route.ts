import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import {
  CURATED_ETFS,
  PRE_BAKED_BASKETS,
  ACTIONS_CORS_HEADERS,
  STOCK_MINTS,
  TOKEN_CATALOG,
  ETFDefinition,
  ETFAsset,
  MAX_ETF_ASSETS,
  USDC_MINT_ADDRESS,
  getDEXConflictStatus,
} from '@/lib/constants';
import { getSolanaConnection, getOnChainTokenBalance } from '@/lib/solana';
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

import { resolveETF } from '@/lib/etfResolver';
export { resolveETF };

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
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
    let baseOrigin: string;

    if (envBaseUrl && envBaseUrl.trim()) {
      let trimmed = envBaseUrl.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = `https://${trimmed}`;
      }
      baseOrigin = trimmed.replace(/\/+$/, '');
    } else {
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        url.host;
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (url.protocol.startsWith('https') ? 'https' : 'http');
      baseOrigin = `${proto}://${host}`;
    }

    const absoluteIconUrl = `${baseOrigin}${etf.iconPath}`;

    const baseActionHref = `${baseOrigin}${url.pathname}${url.search}`;

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
            label: '$5 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=5`,
          },
          {
            label: '$10 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=10`,
          },
          {
            label: '$25 USDC',
            href: `${baseActionHref}${baseActionHref.includes('?') ? '&' : '?'}amount=25`,
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

    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(account);
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

    // 3.5 Upfront DEX Compatibility Guard (for 3-stock baskets)
    const conflictStatus = getDEXConflictStatus(etf.targetAssets);
    if (!conflictStatus.isCompatible) {
      return NextResponse.json(
        {
          message:
            conflictStatus.reason ||
            'Selected assets exceed Solana 1232B MTU packet limit. Please choose compatible DEX venues or reduce asset count.',
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const isSimulation =
      url.searchParams.get('simulate') === 'true' || process.env.SIMULATION_MODE === 'true';

    // 3.6 Zero-Gas Wallet Guardrail: On-chain USDC Balance Verification
    if (!isSimulation) {
      const connection = getSolanaConnection();
      const usdcMintPubkey = new PublicKey(USDC_MINT_ADDRESS);
      const { uiAmount } = await getOnChainTokenBalance(connection, userPublicKey, usdcMintPubkey);

      if (uiAmount < usdcAmount) {
        return NextResponse.json(
          {
            message: `Insufficient USDC: Your wallet currently holds $${uiAmount.toFixed(2)} USDC, but this ETF purchase requires $${usdcAmount.toFixed(2)} USDC. Please swap SOL to USDC in Phantom or select a smaller amount to avoid losing network gas fees.`,
          },
          { status: 400, headers: ACTIONS_CORS_HEADERS }
        );
      }
    }

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
