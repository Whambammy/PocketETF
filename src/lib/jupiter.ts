import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  BasketAsset,
  USDC_MINT_ADDRESS,
  USDC_ATOMIC_PER_UNIT,
  DEFAULT_SLIPPAGE_BPS,
  JUPITER_API_URL,
  MAX_BASKET_ASSETS,
} from './constants';
import {
  getSolanaConnection,
  deserializeInstruction,
  resolveAddressLookupTables,
  createComputeBudgetInstructions,
  createIdempotentAtaInstruction,
  compileAndValidateV0Transaction,
  RawJupiterInstruction,
} from './solana';

export class RouteLiquidityError extends Error {
  ticker: string;
  constructor(ticker: string, message?: string) {
    super(message || `Insufficient on-chain liquidity for ${ticker} route.`);
    this.name = 'RouteLiquidityError';
    this.ticker = ticker;
  }
}

export interface AssetAllocation {
  asset: BasketAsset;
  subAmountAtomic: number;
  allocatedDollars: number;
}

/**
 * Calculates raw integer base units for USDC (6 decimals = 1,000,000 / $1),
 * applies floor allocations, and assigns any remaining residual dust to the highest-weighted asset.
 */
export function calculateAssetAllocations(
  usdcAmount: number,
  assets: BasketAsset[]
): {
  totalUsdcAtomic: number;
  allocations: AssetAllocation[];
} {
  if (usdcAmount <= 0) {
    throw new Error('USDC amount must be greater than 0.');
  }

  if (!assets || assets.length === 0) {
    throw new Error('Basket must contain at least 1 asset.');
  }

  if (assets.length > MAX_BASKET_ASSETS) {
    throw new Error(`Basket exceeds maximum limit of ${MAX_BASKET_ASSETS} assets for 1232B MTU safety.`);
  }

  const totalUsdcAtomic = Math.round(usdcAmount * USDC_ATOMIC_PER_UNIT);

  let allocatedSum = 0;
  let highestWeightIdx = 0;
  let highestWeight = -1;

  const rawSubAmounts = assets.map((asset, index) => {
    if (asset.weightPercent > highestWeight) {
      highestWeight = asset.weightPercent;
      highestWeightIdx = index;
    }
    const subAmount = Math.floor(totalUsdcAtomic * (asset.weightPercent / 100));
    allocatedSum += subAmount;
    return subAmount;
  });

  // Assign residual dust to highest-weighted asset
  const dustRemainder = totalUsdcAtomic - allocatedSum;
  if (dustRemainder > 0 && highestWeightIdx >= 0) {
    rawSubAmounts[highestWeightIdx] += dustRemainder;
  }

  const allocations: AssetAllocation[] = assets.map((asset, index) => ({
    asset,
    subAmountAtomic: rawSubAmounts[index],
    allocatedDollars: Number((rawSubAmounts[index] / USDC_ATOMIC_PER_UNIT).toFixed(4)),
  }));

  return {
    totalUsdcAtomic,
    allocations,
  };
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface JupiterSwapInstructionsResponse {
  tokenLedgerInstruction?: RawJupiterInstruction;
  computeBudgetInstructions?: RawJupiterInstruction[];
  setupInstructions?: RawJupiterInstruction[];
  swapInstruction: RawJupiterInstruction;
  cleanupInstruction?: RawJupiterInstruction;
  addressLookupTableAddresses?: string[];
  [key: string]: unknown;
}

function getJupiterEndpoints(): string[] {
  const custom = process.env.JUPITER_API_URL?.trim();
  const apiKey = process.env.JUPITER_API_KEY?.trim();

  // If a custom URL is provided AND it's not the public api.jup.ag (or an API key is provided)
  if (custom && (apiKey || !custom.includes('api.jup.ag/swap/v1'))) {
    return Array.from(new Set([custom, 'https://lite-api.jup.ag/swap/v1', 'https://api.jup.ag/swap/v1']));
  }

  // lite-api.jup.ag is Jupiter's high-throughput gateway without 5-req/10s burst limits
  return ['https://lite-api.jup.ag/swap/v1', 'https://api.jup.ag/swap/v1'];
}

/**
 * Resilient Jupiter API fetcher:
 * - Directs to lite-api.jup.ag (high throughput, no 5-req burst limit)
 * - Fails over across endpoints instantly if rate-limited (429) or unreachable
 * - Retries with backoff if all endpoints are congested
 * - Attaches x-api-key if JUPITER_API_KEY is configured
 */
async function fetchJupiterApi(
  path: string,
  options: RequestInit = {},
  maxPasses = 2
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const apiKey = process.env.JUPITER_API_KEY?.trim();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const endpoints = getJupiterEndpoints();
  let lastError: Error | null = null;
  let lastStatus: number | null = null;
  let lastStatusText = '';

  for (let pass = 0; pass < maxPasses; pass++) {
    for (const baseUrl of endpoints) {
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const fullUrl = `${cleanBase}${cleanPath}`;

      try {
        const res = await fetch(fullUrl, { ...options, headers });

        if (res.status !== 429) {
          return res;
        }

        lastStatus = 429;
        lastStatusText = res.statusText;
        console.warn(`[Jupiter 429] Rate limit hit on ${baseUrl}, instantly failing over to next endpoint...`);
      } catch (err: unknown) {
        lastError = err as Error;
        console.warn(`[Jupiter Fetch Error] ${fullUrl}: ${(err as Error).message}`);
      }
    }

    // If all endpoints were rate-limited in this pass, wait briefly before retrying
    if (pass < maxPasses - 1) {
      const waitMs = 1000 * (pass + 1);
      console.warn(`[Jupiter All Rate-Limited] Waiting ${waitMs}ms before retry pass...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`All Jupiter API endpoints failed or were rate-limited (HTTP ${lastStatus || 429}: ${lastStatusText || 'Too Many Requests'}).`);
}

/**
 * Fetches quote from Jupiter v6 / swap API with slippageBps = 100 (1%).
 * Returns clean RouteLiquidityError if no route is found.
 */
export async function getJupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amountAtomic: number;
  slippageBps?: number;
  ticker: string;
  maxAccounts?: number;
  onlyDirectRoutes?: boolean;
}): Promise<JupiterQuoteResponse> {
  const { inputMint, outputMint, amountAtomic, slippageBps = DEFAULT_SLIPPAGE_BPS, ticker, maxAccounts, onlyDirectRoutes } = params;

  let path = `/quote?inputMint=${encodeURIComponent(inputMint)}&outputMint=${encodeURIComponent(
    outputMint
  )}&amount=${amountAtomic}&slippageBps=${slippageBps}`;

  if (maxAccounts && maxAccounts > 0) {
    path += `&maxAccounts=${maxAccounts}`;
  }

  if (onlyDirectRoutes) {
    path += `&onlyDirectRoutes=true`;
  }

  let res: Response;
  try {
    res = await fetchJupiterApi(path, { method: 'GET' });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to contact Jupiter Quote API: ${error.message}`);
  }

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      // non-json error
    }

    const errorMessage = errorData.error || errorData.message || res.statusText;
    // Handle liquidity/route absence cleanly
    if (
      res.status === 400 ||
      res.status === 404 ||
      /route|liquidity|not found|cannot be parsed/i.test(errorMessage)
    ) {
      throw new RouteLiquidityError(ticker, `Insufficient on-chain liquidity for ${ticker} route.`);
    }

    throw new Error(`Jupiter Quote API failed (${res.status}): ${errorMessage}`);
  }

  const quoteData: JupiterQuoteResponse = await res.json();
  if (!quoteData || !quoteData.outAmount || quoteData.outAmount === '0') {
    throw new RouteLiquidityError(ticker, `Insufficient on-chain liquidity for ${ticker} route.`);
  }

  return quoteData;
}

/**
 * Requests serialized swap instructions from Jupiter API for a single leg quote
 */
export async function getJupiterSwapInstructions(params: {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
}): Promise<JupiterSwapInstructionsResponse> {
  const { quoteResponse, userPublicKey } = params;

  let res: Response;
  try {
    res = await fetchJupiterApi('/swap-instructions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: false,
        useSharedAccounts: true,
      }),
    });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to contact Jupiter Swap Instructions API: ${error.message}`);
  }

  if (!res.ok) {
    let errBody: any = {};
    try {
      errBody = await res.json();
    } catch {
      // ignore
    }
    const message = errBody.error || errBody.message || res.statusText;
    throw new Error(`Jupiter swap-instructions failed (${res.status}): ${message}`);
  }

  const data: JupiterSwapInstructionsResponse = await res.json();
  if (!data.swapInstruction) {
    throw new Error('Jupiter API did not return swapInstruction.');
  }

  return data;
}

export interface BuildBasketTxParams {
  userPublicKey: string;
  usdcAmount: number;
  assets: BasketAsset[];
  isSimulation?: boolean;
}

export interface BuildBasketTxResult {
  base64Tx: string;
  byteLength: number;
  allocations: AssetAllocation[];
  totalUsdcAtomic: number;
  altCount: number;
}

/**
 * Builds the complete 1-Click Multi-Swap VersionedTransaction (v0):
 * 1. Decimal Truncation & Dust Elimination across assets (Max 3 assets)
 * 2. Prepend ComputeBudget (1.2M CU limit + 50k microLamports priority)
 * 3. Prepend Idempotent ATA creation instructions for all target stock mints
 * 4. Fetch Jupiter quotes & swap instructions for each target asset leg
 * 5. Deduplicate Address Lookup Tables (ALTs) & resolve from RPC
 * 6. Compile into VersionedTransaction v0 Message with MTU <= 1232B validation
 * 7. Return base64-serialized transaction
 */
export async function buildBasketTransaction(
  params: BuildBasketTxParams
): Promise<BuildBasketTxResult> {
  const { userPublicKey: userPubkeyStr, usdcAmount, assets, isSimulation = false } = params;

  let payerKey: PublicKey;
  try {
    payerKey = new PublicKey(userPubkeyStr);
  } catch {
    throw new Error('Invalid user public key provided.');
  }

  if (assets.length > MAX_BASKET_ASSETS) {
    throw new Error(
      `Basket contains ${assets.length} assets. Solana 1232B MTU limit restricts baskets to a maximum of ${MAX_BASKET_ASSETS} assets.`
    );
  }

  // 1. Dust elimination and atomic allocation
  const { totalUsdcAtomic, allocations } = calculateAssetAllocations(usdcAmount, assets);

  // Helper to compile the entire multi-swap basket with a given maxAccounts limit
  const assembleBasket = async (maxAccountsLimit: number, preferDirectRoutes: boolean) => {
    const allInstructions: TransactionInstruction[] = [...createComputeBudgetInstructions()];
    const allAltAddresses: string[] = [];

    for (const item of allocations) {
      if (item.subAmountAtomic <= 0) continue;

      if (isSimulation) {
        allInstructions.push(
          new TransactionInstruction({
            programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
            keys: [{ pubkey: payerKey, isSigner: true, isWritable: true }],
            data: Buffer.from([0, 0, 0, 0]),
          })
        );
        continue;
      }

      let quote: JupiterQuoteResponse;
      if (allocations.length > 1) {
        if (preferDirectRoutes) {
          try {
            quote = await getJupiterQuote({
              inputMint: USDC_MINT_ADDRESS,
              outputMint: item.asset.mint,
              amountAtomic: item.subAmountAtomic,
              slippageBps: DEFAULT_SLIPPAGE_BPS,
              ticker: item.asset.ticker,
              onlyDirectRoutes: true,
            });
          } catch {
            quote = await getJupiterQuote({
              inputMint: USDC_MINT_ADDRESS,
              outputMint: item.asset.mint,
              amountAtomic: item.subAmountAtomic,
              slippageBps: DEFAULT_SLIPPAGE_BPS,
              ticker: item.asset.ticker,
              maxAccounts: maxAccountsLimit,
            });
          }
        } else {
          quote = await getJupiterQuote({
            inputMint: USDC_MINT_ADDRESS,
            outputMint: item.asset.mint,
            amountAtomic: item.subAmountAtomic,
            slippageBps: DEFAULT_SLIPPAGE_BPS,
            ticker: item.asset.ticker,
            maxAccounts: maxAccountsLimit,
          });
        }
      } else {
        quote = await getJupiterQuote({
          inputMint: USDC_MINT_ADDRESS,
          outputMint: item.asset.mint,
          amountAtomic: item.subAmountAtomic,
          slippageBps: DEFAULT_SLIPPAGE_BPS,
          ticker: item.asset.ticker,
        });
      }

      const swapIxs = await getJupiterSwapInstructions({
        quoteResponse: quote,
        userPublicKey: payerKey.toBase58(),
      });

      // Append setup instructions (if any)
      if (swapIxs.setupInstructions && swapIxs.setupInstructions.length > 0) {
        for (const rawSetup of swapIxs.setupInstructions) {
          allInstructions.push(deserializeInstruction(rawSetup));
        }
      }

      // Append main swap instruction
      allInstructions.push(deserializeInstruction(swapIxs.swapInstruction));

      // Append cleanup instruction (if any)
      if (swapIxs.cleanupInstruction) {
        allInstructions.push(deserializeInstruction(swapIxs.cleanupInstruction));
      }

      // Collect ALTs
      if (swapIxs.addressLookupTableAddresses && swapIxs.addressLookupTableAddresses.length > 0) {
        allAltAddresses.push(...swapIxs.addressLookupTableAddresses);
      }
    }

    const connection = getSolanaConnection();
    const lookupTableAccounts = await resolveAddressLookupTables(connection, allAltAddresses);

    const compiled = await compileAndValidateV0Transaction({
      connection,
      payerKey,
      instructions: allInstructions,
      lookupTableAccounts,
    });

    return {
      ...compiled,
      altCount: lookupTableAccounts.length,
    };
  };

  // Execution with automatic MTU auto-compression retry
  let result: {
    serializedBase64: string;
    byteLength: number;
    altCount: number;
  };

  try {
    // Attempt 1: Direct routes preferred, maxAccounts: 10
    result = await assembleBasket(10, true);
  } catch (err: any) {
    const isMtuError =
      err.message &&
      (err.message.includes('1232') ||
        err.message.includes('encoding overruns Uint8Array') ||
        err.message.includes('packet limit'));

    if (isMtuError && !isSimulation && allocations.length > 1) {
      console.warn('[Jupiter] Transaction exceeded 1232B MTU, auto-compressing with maxAccounts: 8...');
      // Attempt 2: Strict compact routes with maxAccounts: 8
      result = await assembleBasket(8, false);
    } else {
      throw err;
    }
  }

  return {
    base64Tx: result.serializedBase64,
    byteLength: result.byteLength,
    allocations,
    totalUsdcAtomic,
    altCount: result.altCount,
  };
}
