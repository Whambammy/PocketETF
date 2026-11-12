import {
  address,
  AccountRole,
  type Instruction,
  type Address,
  type AddressesByLookupTableAddress,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compressTransactionMessageUsingAddressLookupTables,
  setTransactionMessageConfig,
  compileTransaction,
  getTransactionEncoder,
  getTransactionDecoder,
} from "@solana/kit";
import {
  TOKEN_CATALOG,
  TOKEN_PROGRAM,
  USDC_MINT_ADDRESS,
  DEFAULT_SLIPPAGE_BPS,
  MAX_PRIORITY_FEE_LAMPORTS,
  QUOTE_LIFETIME_MS,
  type ETFAsset,
} from "./constants";
import {
  allocate,
  AppError,
  parseUnits,
  validateAssets,
  formatUnits,
  scaledUnits,
} from "./amounts";
import {
  rpc,
  ata,
  publicKey,
  verifyMints,
  walletBalances,
  type MintState,
} from "./solana";
import { fetchJson, messageHash } from "./server";
import {
  getPythPricesForAssets,
  requireFreshPrice,
  type PythPriceData,
} from "./pyth";

const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const COMPUTE = "ComputeBudget111111111111111111111111111111";
const SYSTEM = "11111111111111111111111111111111";
let nextKeylessRequestAt = 0;
async function paceKeylessJupiter() {
  if (process.env.JUPITER_API_KEY) return;
  const now = Date.now();
  const delay = Math.max(0, nextKeylessRequestAt - now);
  if (delay > 10000)
    throw new AppError("Routing is busy. Please retry shortly.", 429);
  nextKeylessRequestAt = Math.max(now, nextKeylessRequestAt) + 2100;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
}
interface RawInstruction {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}
interface BuildResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  transactionVersion: number;
  setupInstructions: RawInstruction[];
  swapInstruction: RawInstruction;
  cleanupInstruction?: RawInstruction | null;
  otherInstructions?: RawInstruction[];
  tipInstruction?: RawInstruction | null;
  addressesByLookupTableAddress?: Record<string, string[]>;
  computeUnitPrice?: string;
  computeBudgetInstructions?: RawInstruction[];
}
export interface TradeLeg {
  asset: ETFAsset;
  direction: "buy" | "sell";
  inputAtomic: bigint;
}
export interface TradeRequest {
  account: string;
  assets: ETFAsset[];
  mode: "buy" | "sell" | "rebalance";
  amount: string;
  version: 0 | 1;
  slippageBps: number;
}
export interface TradePreview {
  transaction: string;
  messageHash: string;
  account: string;
  mode: string;
  version: 0 | 1;
  expiresAt: number;
  lastValidBlockHeight: number;
  byteLength: number;
  computeUnits: number;
  networkFeeLamports: number;
  rentLamports: number;
  inputUsdc: string;
  minimumUsdc: string;
  slippageBps: number;
  legs: {
    ticker: string;
    mint: string;
    direction: string;
    input: string;
    inputAtomic: string;
    expectedOutput: string;
    minimumOutput: string;
    minimumOutputAtomic: string;
    outputSymbol: string;
    priceImpactPercent: number;
  }[];
  allocation: { ticker: string; target: number; current: number }[];
}
export function validateQuote(
  q: BuildResponse,
  leg: TradeLeg,
  version: 0 | 1,
  slippage: number,
  price: number,
  mint: MintState,
) {
  const input = leg.direction === "buy" ? USDC_MINT_ADDRESS : leg.asset.mint;
  const output = leg.direction === "buy" ? leg.asset.mint : USDC_MINT_ADDRESS;
  if (
    q.inputMint !== input ||
    q.outputMint !== output ||
    q.inAmount !== leg.inputAtomic.toString() ||
    q.swapMode !== "ExactIn" ||
    q.transactionVersion !== version ||
    q.slippageBps !== slippage
  )
    throw new AppError(
      "Unexpected route response. Trading blocked.",
      503,
      "INVALID_ROUTE",
    );
  const out = parseUnits(q.outAmount, 0);
  const min = parseUnits(q.otherAmountThreshold, 0);
  if (min !== out - (out * BigInt(slippage)) / 10000n)
    throw new AppError("Route exceeded the approved slippage.");
  const impact = Number(q.priceImpactPct);
  if (!Number.isFinite(impact) || Math.abs(impact) > 0.03)
    throw new AppError("Price impact exceeds the 3% safety limit.");
  const tokenQuantity =
    (Number(leg.direction === "buy" ? out : leg.inputAtomic) /
      10 ** leg.asset.decimals) *
    mint.multiplier;
  const usdc = Number(leg.direction === "buy" ? leg.inputAtomic : out) / 1e6;
  const executionPrice = usdc / tokenQuantity;
  if (
    !Number.isFinite(executionPrice) ||
    Math.abs(executionPrice / price - 1) > 0.03
  )
    throw new AppError("Route price differs from the oracle by more than 3%.");
  return { out, min, impact };
}
export function validateSwapInstruction(
  raw: RawInstruction,
  leg: TradeLeg,
  quote: BuildResponse,
  account: string,
  source: string,
  destination: string,
) {
  // Pin the current /build RouteV2 wire header. Unknown instruction layouts fail closed.
  // Independently enforce the encoded amounts, recipients and zero platform/capture fees;
  // simulation alone is insufficient when balances can change between RPC observations.
  const data = Buffer.from(raw.data, "base64");
  if (
    raw.programId !== JUPITER ||
    data.length < 34 ||
    data.subarray(0, 8).toString("hex") !== "bb64facc31c4af14" ||
    data.readBigUInt64LE(8) !== leg.inputAtomic ||
    data.readBigUInt64LE(16) !== BigInt(quote.outAmount) ||
    data.readUInt16LE(24) !== quote.slippageBps ||
    data.readUInt16LE(26) !== 0 ||
    data.readUInt16LE(28) !== 0 ||
    data.readUInt32LE(30) < 1 ||
    data.readUInt32LE(30) > 16
  )
    throw new AppError(
      "Unsupported swap instruction or encoded amount/fee mismatch.",
      503,
      "INVALID_ROUTE",
    );
  const a = raw.accounts;
  if (
    a[0]?.pubkey !== account ||
    !a[0]?.isSigner ||
    a[1]?.pubkey !== source ||
    !a[1]?.isWritable ||
    a[2]?.pubkey !== destination ||
    !a[2]?.isWritable ||
    a[3]?.pubkey !== quote.inputMint ||
    a[4]?.pubkey !== quote.outputMint
  )
    throw new AppError(
      "Swap instruction recipients differ from the reviewed route.",
      503,
      "INVALID_ROUTE",
    );
}
function convert(raw: RawInstruction, account: string): Instruction {
  if (
    !raw ||
    !Array.isArray(raw.accounts) ||
    raw.accounts.length > 64 ||
    typeof raw.data !== "string" ||
    raw.data.length > 6000
  )
    throw new AppError("Malformed swap instruction.", 503);
  return {
    programAddress: address(raw.programId),
    accounts: raw.accounts.map((a) => {
      if (a.isSigner && a.pubkey !== account)
        throw new AppError("Unexpected transaction signer.", 503);
      return {
        address: address(a.pubkey),
        role: a.isSigner
          ? a.isWritable
            ? AccountRole.WRITABLE_SIGNER
            : AccountRole.READONLY_SIGNER
          : a.isWritable
            ? AccountRole.WRITABLE
            : AccountRole.READONLY,
      };
    }),
    data: Buffer.from(raw.data, "base64"),
  };
}
export function computeInstructions(
  units: number,
  price: number,
): Instruction[] {
  const limit = Buffer.alloc(5);
  limit[0] = 2;
  limit.writeUInt32LE(units, 1);
  const fee = Buffer.alloc(9);
  fee[0] = 3;
  fee.writeBigUInt64LE(BigInt(price), 1);
  return [
    { programAddress: address(COMPUTE), data: limit },
    { programAddress: address(COMPUTE), data: fee },
  ];
}
export function compileWire(
  account: string,
  version: 0 | 1,
  instructions: Instruction[],
  tables: AddressesByLookupTableAddress,
  blockhash: string,
  lastValidBlockHeight: number,
  units: number,
  loaded: number,
  priority: number,
) {
  const lifetime = {
    blockhash: address(blockhash) as unknown as import("@solana/kit").Blockhash,
    lastValidBlockHeight: BigInt(lastValidBlockHeight),
  };
  if (version === 1) {
    const base = setTransactionMessageLifetimeUsingBlockhash(
      lifetime,
      setTransactionMessageFeePayer(
        address(account),
        createTransactionMessage({ version: 1 }),
      ),
    );
    const msg = setTransactionMessageConfig(
      {
        computeUnitLimit: units,
        loadedAccountsDataSizeLimit: loaded,
        priorityFeeLamports: BigInt(priority),
      },
      appendTransactionMessageInstructions(instructions, base),
    );
    return compileTransaction(msg);
  }
  const base = setTransactionMessageLifetimeUsingBlockhash(
    lifetime,
    setTransactionMessageFeePayer(
      address(account),
      createTransactionMessage({ version: 0 }),
    ),
  );
  const withInstructions = appendTransactionMessageInstructions(
    [
      ...computeInstructions(units, Math.floor((priority * 1e6) / units)),
      ...instructions,
    ],
    base,
  );
  return compileTransaction(
    compressTransactionMessageUsingAddressLookupTables(
      withInstructions,
      tables,
    ),
  );
}
async function lookupTables(
  responses: BuildResponse[],
): Promise<AddressesByLookupTableAddress> {
  const keys = [
    ...new Set(
      responses.flatMap((r) =>
        Object.keys(r.addressesByLookupTableAddress || {}),
      ),
    ),
  ];
  if (keys.length > 24) throw new AppError("Too many lookup tables.");
  const result: Record<string, Address[]> = {};
  for (const key of keys) {
    const data = await rpc<{
      value: {
        owner: string;
        data: {
          parsed: { info: { addresses: string[]; deactivationSlot: string } };
        };
      } | null;
    }>("getAccountInfo", [
      key,
      { encoding: "jsonParsed", commitment: "finalized" },
    ]);
    const info = data.value?.data?.parsed?.info;
    if (
      data.value?.owner !== "AddressLookupTab1e1111111111111111111111111" ||
      !Array.isArray(info?.addresses) ||
      info.deactivationSlot !== "18446744073709551615"
    )
      throw new AppError("A route lookup table could not be verified.", 503);
    result[key] = info.addresses.map(address);
  }
  return result;
}
export function planRebalance(
  assets: ETFAsset[],
  balances: Awaited<ReturnType<typeof walletBalances>>,
  mints: Record<string, MintState>,
  prices: Record<string, PythPriceData>,
) {
  const values = assets.map(
    (a) =>
      (Number(
        BigInt(
          balances.holdings.find((h) => h.mint === a.mint)?.spendableAtomic ||
            "0",
        ),
      ) /
        10 ** a.decimals) *
      mints[a.mint].multiplier *
      requireFreshPrice(prices[a.ticker]),
  );
  const total = values.reduce((s, v) => s + v, 0);
  if (total < 1)
    throw new AppError(
      "At least $1 of spendable basket holdings is required to rebalance.",
    );
  const sell: TradeLeg[] = [];
  const deficits: { asset: ETFAsset; dollars: number }[] = [];
  assets.forEach((a, i) => {
    const target = (total * a.weightPercent) / 100;
    const difference = values[i] - target;
    if (difference > 0.1) {
      const raw = BigInt(
        balances.holdings.find((h) => h.mint === a.mint)?.spendableAtomic ||
          "0",
      );
      const fraction = Math.min(1, difference / values[i]);
      const amount = (raw * BigInt(Math.floor(fraction * 1e8))) / 100000000n;
      if (amount > 0n)
        sell.push({ asset: a, direction: "sell", inputAtomic: amount });
    } else if (difference < -0.1)
      deficits.push({ asset: a, dollars: -difference });
  });
  if (!sell.length || !deficits.length)
    throw new AppError(
      "Your basket is already within the rebalance tolerance.",
    );
  return { sell, deficits, total, values };
}
export async function buildTrade(request: TradeRequest): Promise<TradePreview> {
  const { assets, mode, version, slippageBps } = request;
  const account = publicKey(request.account);
  validateAssets(assets);
  if (
    !["buy", "sell", "rebalance"].includes(mode) ||
    ![0, 1].includes(version) ||
    !Number.isInteger(slippageBps) ||
    slippageBps < 10 ||
    slippageBps > 100
  )
    throw new AppError("Invalid trade settings.");
  const genesis = await rpc<string>("getGenesisHash");
  if (genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
    throw new AppError(
      "RPC is not connected to Solana mainnet.",
      503,
      "WRONG_NETWORK",
    );
  const started = Date.now();
  const [balances, mints, prices] = await Promise.all([
    walletBalances(account),
    verifyMints(assets),
    getPythPricesForAssets(assets),
  ]);
  for (const a of assets) requireFreshPrice(prices[a.ticker]);
  const usdcAccount = await ata(account, USDC_MINT_ADDRESS);
  const tokenAccounts = await Promise.all(
    assets.map((a) => ata(account, a.mint, a.tokenProgram)),
  );
  const addresses = [account, usdcAccount, ...tokenAccounts];
  const before = [
    BigInt(balances.solLamports),
    BigInt(balances.usdcSpendableAtomic),
    ...assets.map((a) =>
      BigInt(
        balances.holdings.find((h) => h.mint === a.mint)?.spendableAtomic ||
          "0",
      ),
    ),
  ];
  const expectedDelta = new Map<string, bigint>(
    addresses.slice(1).map((a) => [a, 0n]),
  );
  let inputUsdc = 0n;
  let legs: TradeLeg[] = [];
  let rebalance: ReturnType<typeof planRebalance> | undefined;
  if (mode === "buy") {
    inputUsdc = parseUnits(request.amount, 6, 100000000000n);
    if (inputUsdc < 100000n) throw new AppError("Minimum purchase is $0.10.");
    if (BigInt(balances.usdcSpendableAtomic) < inputUsdc)
      throw new AppError(
        "Insufficient spendable USDC in your associated token account.",
      );
    legs = allocate(inputUsdc, assets).map((n, i) => ({
      asset: assets[i],
      direction: "buy",
      inputAtomic: n,
    }));
  } else if (mode === "sell") {
    const percent = parseUnits(request.amount, 2, 10000n);
    legs = assets
      .map((a) => ({
        asset: a,
        direction: "sell" as const,
        inputAtomic:
          (BigInt(
            balances.holdings.find((h) => h.mint === a.mint)?.spendableAtomic ||
              "0",
          ) *
            percent) /
          10000n,
      }))
      .filter((l) => l.inputAtomic > 0n);
    if (!legs.length)
      throw new AppError("No spendable basket holdings to sell.");
  } else {
    rebalance = planRebalance(assets, balances, mints, prices);
    legs = rebalance.sell;
  }
  const fetchLeg = async (leg: TradeLeg): Promise<BuildResponse> => {
    const destination =
      leg.direction === "buy"
        ? await ata(account, leg.asset.mint, leg.asset.tokenProgram)
        : usdcAccount;
    const query = new URLSearchParams({
      inputMint: leg.direction === "buy" ? USDC_MINT_ADDRESS : leg.asset.mint,
      outputMint: leg.direction === "buy" ? leg.asset.mint : USDC_MINT_ADDRESS,
      amount: leg.inputAtomic.toString(),
      taker: account,
      slippageBps: String(slippageBps),
      transactionVersion: String(version),
      wrapAndUnwrapSol: "false",
      destinationTokenAccount: destination,
      maxAccounts: String(
        Math.max(8, Math.floor(56 / Math.max(legs.length, 1))),
      ),
    });
    if (version === 0)
      query.set(
        "maxBytes",
        String(Math.max(400, Math.floor(1050 / Math.max(legs.length, 1)))),
      );
    await paceKeylessJupiter();
    const response = await fetchJson<BuildResponse>(
      "https://api.jup.ag/swap/v2/build?" + query,
      {
        headers: process.env.JUPITER_API_KEY
          ? { "x-api-key": process.env.JUPITER_API_KEY }
          : {},
      },
    );
    validateQuote(
      response,
      leg,
      version,
      slippageBps,
      requireFreshPrice(prices[leg.asset.ticker]),
      mints[leg.asset.mint],
    );
    return response;
  };
  // At most two upstream builds in flight; do not multiply retries under rate limits.
  const buildAll = async (items: TradeLeg[]) => {
    const result: BuildResponse[] = [];
    for (let i = 0; i < items.length; i += 2)
      result.push(...(await Promise.all(items.slice(i, i + 2).map(fetchLeg))));
    return result;
  };
  let responses = await buildAll(legs);
  if (rebalance) {
    const guaranteed = responses.reduce(
      (s, r) => s + BigInt(r.otherAmountThreshold),
      0n,
    );
    const deficit = rebalance.deficits.reduce((s, d) => s + d.dollars, 0);
    const purchases = rebalance.deficits
      .map((d) => ({
        asset: d.asset,
        direction: "buy" as const,
        inputAtomic:
          (guaranteed * BigInt(Math.floor((d.dollars / deficit) * 1e8))) /
          100000000n,
      }))
      .filter((l) => l.inputAtomic > 0n);
    if (!purchases.length)
      throw new AppError("Rebalance proceeds are too small.");
    // Buys spend only guaranteed sale proceeds. Any surplus stays in USDC.
    responses.push(...(await buildAll(purchases)));
    legs.push(...purchases);
  }
  const approved = new Set(addresses.slice(1));
  const unrelated = new Set(
    balances.tokenAccounts
      .filter((a) => !approved.has(a.address))
      .map((a) => a.address),
  );
  const instructions: Instruction[] = [];
  const setups = new Set<string>();
  for (const [i, response] of responses.entries()) {
    if (
      response.tipInstruction ||
      response.cleanupInstruction ||
      (response.otherInstructions?.length || 0) > 0
    )
      throw new AppError(
        "Route contains unsupported extra instructions.",
        503,
        "INVALID_ROUTE",
      );
    if (response.swapInstruction?.programId !== JUPITER)
      throw new AppError("Unexpected swap program.", 503);
    const leg = legs[i];
    const input =
      leg.direction === "buy"
        ? usdcAccount
        : tokenAccounts[assets.indexOf(leg.asset)];
    const output =
      leg.direction === "buy"
        ? tokenAccounts[assets.indexOf(leg.asset)]
        : usdcAccount;
    validateSwapInstruction(
      response.swapInstruction,
      leg,
      response,
      account,
      input,
      output,
    );
    for (const setup of response.setupInstructions || []) {
      // Only idempotent ATAs owned by this wallet, for the approved mints, may be created.
      const b = Buffer.from(setup.data, "base64");
      if (
        setup.programId !== ATA_PROGRAM ||
        b.length !== 1 ||
        b[0] !== 1 ||
        setup.accounts.length !== 6 ||
        setup.accounts[0]?.pubkey !== account ||
        setup.accounts[2]?.pubkey !== account ||
        !approved.has(setup.accounts[1]?.pubkey) ||
        setup.accounts[4]?.pubkey !== SYSTEM
      )
        throw new AppError("Unsupported route setup.", 503);
      const key = setup.accounts[1].pubkey;
      const atIndex = addresses.indexOf(key);
      const mint =
        atIndex === 1 ? USDC_MINT_ADDRESS : assets[atIndex - 2]?.mint;
      const program =
        atIndex === 1 ? TOKEN_PROGRAM : assets[atIndex - 2]?.tokenProgram;
      if (
        setup.accounts[3]?.pubkey !== mint ||
        setup.accounts[5]?.pubkey !== program
      )
        throw new AppError("Unexpected account setup identity.", 503);
      if (!setups.has(key)) {
        instructions.push(convert(setup, account));
        setups.add(key);
      }
    }
    for (const a of response.swapInstruction.accounts)
      if (a.isWritable && unrelated.has(a.pubkey))
        throw new AppError("Route accesses unrelated wallet tokens.", 503);
    instructions.push(convert(response.swapInstruction, account));
    expectedDelta.set(
      input,
      (expectedDelta.get(input) || 0n) - leg.inputAtomic,
    );
    expectedDelta.set(
      output,
      (expectedDelta.get(output) || 0n) + BigInt(response.otherAmountThreshold),
    );
  }
  const accounts = new Set<string>([
    account,
    ...instructions.flatMap((ix) => [
      ix.programAddress,
      ...(ix.accounts || []).map((a) => a.address),
    ]),
  ]);
  if (accounts.size > 64)
    throw new AppError(
      "Basket exceeds the 64-account limit. Reduce the number of assets.",
    );
  const tables = version === 0 ? await lookupTables(responses) : {};
  const latest = await rpc<{
    value: { blockhash: string; lastValidBlockHeight: number };
  }>("getLatestBlockhash", [{ commitment: "finalized" }]);
  let units = 1_400_000,
    loaded = 64 * 1024 * 1024;
  const feeSamples = await rpc<{ prioritizationFee: number }[]>(
    "getRecentPrioritizationFees",
    [[...accounts].slice(0, 64)],
  );
  const sorted = feeSamples
    .map((f) => f.prioritizationFee)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const price = Math.min(
    70000,
    Math.max(25000, sorted[Math.floor(sorted.length * 0.75)] || 0),
  );
  const encode = (u: number, l: number) => {
    const priority = Math.min(
      MAX_PRIORITY_FEE_LAMPORTS,
      Math.ceil((price * u) / 1e6),
    );
    const tx = compileWire(
      account,
      version,
      instructions,
      tables,
      latest.value.blockhash,
      latest.value.lastValidBlockHeight,
      u,
      l,
      priority,
    );
    const bytes = getTransactionEncoder().encode(tx);
    if (bytes.length > (version === 1 ? 4096 : 1232))
      throw new AppError(
        "This basket does not fit your wallet’s transaction format. Reduce assets or use a wallet advertising v1.",
        400,
        "TRANSACTION_TOO_LARGE",
      );
    return { tx, bytes, base64: Buffer.from(bytes).toString("base64") };
  };
  let encoded = encode(units, loaded);
  const simulate = async (wire: string) =>
    rpc<{
      value: {
        err: unknown;
        unitsConsumed?: number;
        loadedAccountsDataSize?: number;
        accounts?: ({
          lamports: number;
          owner: string;
          data: [string, string];
        } | null)[];
      };
    }>("simulateTransaction", [
      wire,
      {
        encoding: "base64",
        sigVerify: false,
        replaceRecentBlockhash: false,
        commitment: "finalized",
        accounts: { encoding: "base64", addresses },
      },
    ]);
  const first = await simulate(encoded.base64);
  if (first.value.err || !first.value.unitsConsumed)
    throw new AppError(
      "Basket simulation failed. No signature was requested.",
      400,
      "SIMULATION_FAILED",
    );
  units = Math.ceil(first.value.unitsConsumed * 1.15) + 10000;
  if (units > 1400000) throw new AppError("Basket exceeds the compute limit.");
  loaded = Math.max(
    32768,
    Math.ceil(((first.value.loadedAccountsDataSize || 0) + 32768) / 32768) *
      32768,
  );
  if (loaded > 64 * 1024 * 1024)
    throw new AppError("Basket exceeds the loaded-data limit.");
  encoded = encode(units, loaded);
  const final = await simulate(encoded.base64);
  if (
    final.value.err ||
    !final.value.accounts ||
    final.value.accounts.length !== addresses.length
  )
    throw new AppError("Final simulation failed.", 400, "SIMULATION_FAILED");
  for (let i = 1; i < addresses.length; i++) {
    const post = final.value.accounts[i];
    let after = 0n;
    if (post) {
      const data = Buffer.from(post.data[0], "base64");
      if (data.length < 165)
        throw new AppError("Unexpected token account after simulation.", 503);
      const mint = i === 1 ? USDC_MINT_ADDRESS : assets[i - 2].mint;
      const program = i === 1 ? TOKEN_PROGRAM : assets[i - 2].tokenProgram;
      const { getAddressDecoder } = await import("@solana/kit");
      if (
        post.owner !== program ||
        getAddressDecoder().decode(data.subarray(0, 32)) !== mint ||
        getAddressDecoder().decode(data.subarray(32, 64)) !== account
      )
        throw new AppError("Unexpected token recipient.", 503);
      // No token delegate or new close authority may be introduced.
      if (data.readUInt32LE(72) !== 0 || data.readUInt32LE(129) !== 0)
        throw new AppError("Unexpected token authority change.", 503);
      after = data.readBigUInt64LE(64);
    }
    if (after - before[i] < (expectedDelta.get(addresses[i]) || 0n))
      throw new AppError(
        "Simulated amounts differ from the approved trade.",
        503,
        "INVALID_ROUTE",
      );
  }
  const networkFee = await rpc<{ value: number | null }>("getFeeForMessage", [
    Buffer.from(encoded.tx.messageBytes).toString("base64"),
    { commitment: "finalized" },
  ]);
  if (networkFee.value === null)
    throw new AppError("Unable to estimate the network fee.", 503);
  const rent = addresses
    .slice(1)
    .reduce(
      (sum, a, i) =>
        sum +
        (balances.tokenAccounts.some((t) => t.address === a)
          ? 0
          : final.value.accounts?.[i + 1]?.lamports || 0),
      0,
    );
  if (rent > assets.length * 10000000 + 10000000)
    throw new AppError("Unexpected account rent.", 503);
  const finalSol = final.value.accounts[0]?.lamports;
  if (
    finalSol === undefined ||
    balances.solLamports - finalSol > networkFee.value + rent + 10000 ||
    balances.solLamports < networkFee.value + rent + 10000
  )
    throw new AppError(
      "Insufficient SOL for network fees and account rent, or unexpected SOL movement.",
    );
  for (const a of assets) requireFreshPrice(prices[a.ticker]);
  const expiresAt = Math.min(started + QUOTE_LIFETIME_MS, Date.now() + 30000);
  if (expiresAt - Date.now() < 5000)
    throw new AppError(
      "Quote expired during preparation. Please refresh.",
      409,
      "PREVIEW_EXPIRED",
    );
  return {
    transaction: encoded.base64,
    messageHash: messageHash(encoded.tx.messageBytes),
    account,
    mode,
    version,
    expiresAt,
    lastValidBlockHeight: latest.value.lastValidBlockHeight,
    byteLength: encoded.bytes.length,
    computeUnits: units,
    networkFeeLamports: networkFee.value,
    rentLamports: rent,
    inputUsdc: formatUnits(inputUsdc, 6),
    minimumUsdc: formatUnits(
      mode === "buy" ? 0n : expectedDelta.get(usdcAccount) || 0n,
      6,
    ),
    slippageBps,
    legs: legs.map((l, i) => ({
      ticker: l.asset.ticker,
      mint: l.asset.mint,
      direction: l.direction,
      inputAtomic: l.inputAtomic.toString(),
      input: scaledUnits(
        l.inputAtomic,
        l.direction === "buy" ? 6 : l.asset.decimals,
        l.direction === "buy" ? 1 : mints[l.asset.mint].multiplier,
      ),
      expectedOutput: scaledUnits(
        responses[i].outAmount,
        l.direction === "buy" ? l.asset.decimals : 6,
        l.direction === "buy" ? mints[l.asset.mint].multiplier : 1,
      ),
      minimumOutput: scaledUnits(
        responses[i].otherAmountThreshold,
        l.direction === "buy" ? l.asset.decimals : 6,
        l.direction === "buy" ? mints[l.asset.mint].multiplier : 1,
      ),
      minimumOutputAtomic: responses[i].otherAmountThreshold,
      outputSymbol: l.direction === "buy" ? l.asset.tokenSymbol : "USDC",
      priceImpactPercent: Number(responses[i].priceImpactPct) * 100,
    })),
    allocation: assets.map((a, i) => ({
      ticker: a.ticker,
      target: a.weightPercent,
      current: rebalance ? (rebalance.values[i] / rebalance.total) * 100 : 0,
    })),
  };
}
export function decodeWire(base64: unknown) {
  if (
    typeof base64 !== "string" ||
    base64.length > 6000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    throw new AppError("Invalid transaction encoding.");
  try {
    return getTransactionDecoder().decode(Buffer.from(base64, "base64"));
  } catch {
    throw new AppError("Invalid transaction.");
  }
}
