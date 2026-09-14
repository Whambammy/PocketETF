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
}): Promise<JupiterQuoteResponse> {
  const { inputMint, outputMint, amountAtomic, slippageBps = DEFAULT_SLIPPAGE_BPS, ticker } = params;

  const url = `${JUPITER_API_URL}/quote?inputMint=${encodeURIComponent(inputMint)}&outputMint=${encodeURIComponent(
    outputMint
  )}&amount=${amountAtomic}&slippageBps=${slippageBps}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
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

  const url = `${JUPITER_API_URL}/swap-instructions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

  // 2. Prepend Compute Budget instructions (1.2M CU + 50k priority fee)
  const allInstructions: TransactionInstruction[] = [...createComputeBudgetInstructions()];

  // 3. Prepend Idempotent ATA creation instructions for each target stock mint
  for (const item of allocations) {
    try {
      const outputMintPubkey = new PublicKey(item.asset.mint);
      const { instruction: ataIx } = createIdempotentAtaInstruction(
        payerKey,
        payerKey,
        outputMintPubkey
      );
      allInstructions.push(ataIx);
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Invalid mint address for asset ${item.asset.ticker}: ${error.message}`);
    }
  }

  const allAltAddresses: string[] = [];

  // 4. Fetch Jupiter quotes & swap instructions for each asset
  for (const item of allocations) {
    if (item.subAmountAtomic <= 0) continue;

    if (isSimulation) {
      // In simulation mode (e.g. for testing environments without pool liquidity),
      // we insert a lightweight mock instruction to test transaction compilation
      allInstructions.push(
        new TransactionInstruction({
          programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
          keys: [{ pubkey: payerKey, isSigner: true, isWritable: true }],
          data: Buffer.from([0, 0, 0, 0]),
        })
      );
      continue;
    }

    // Live Jupiter Route Query
    const quote = await getJupiterQuote({
      inputMint: USDC_MINT_ADDRESS,
      outputMint: item.asset.mint,
      amountAtomic: item.subAmountAtomic,
      slippageBps: DEFAULT_SLIPPAGE_BPS,
      ticker: item.asset.ticker,
    });

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

  // 5. Deduplicate and resolve Address Lookup Tables
  const connection = getSolanaConnection();
  const lookupTableAccounts = await resolveAddressLookupTables(connection, allAltAddresses);

  // 6. Compile to v0 and validate MTU limit <= 1232 bytes
  const { serializedBase64, byteLength } = await compileAndValidateV0Transaction({
    connection,
    payerKey,
    instructions: allInstructions,
    lookupTableAccounts,
  });

  return {
    base64Tx: serializedBase64,
    byteLength,
    allocations,
    totalUsdcAtomic,
    altCount: lookupTableAccounts.length,
  };
}
