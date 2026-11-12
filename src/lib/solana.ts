import {
  address,
  isOffCurveAddress,
  getProgramDerivedAddress,
  getAddressEncoder,
} from "@solana/kit";
import {
  TOKEN_CATALOG,
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  USDC_MINT_ADDRESS,
  type ETFAsset,
} from "./constants";
import { AppError } from "./amounts";
import { fetchJson } from "./server";
const ENDPOINTS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];
export function publicKey(value: unknown): string {
  try {
    if (typeof value !== "string") throw new Error();
    const p = address(value);
    if (isOffCurveAddress(p)) throw new Error();
    return p;
  } catch {
    throw new AppError("A valid signing wallet address is required.");
  }
}
export async function rpc<T>(
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const custom = process.env.SOLANA_RPC_URL;
  const endpoints = custom ? [custom, ...ENDPOINTS] : ENDPOINTS;
  for (const endpoint of endpoints) {
    try {
      const u = new URL(endpoint);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new AppError("RPC must use HTTPS.", 503);
      const data = await fetchJson<{ result?: T; error?: unknown }>(u.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (data.error || data.result === undefined) continue;
      return data.result;
    } catch {
      /* try the next read/submission endpoint; never log credentials */
    }
  }
  throw new AppError(
    "Solana RPC is unavailable. Your balance could not be verified.",
    503,
    "RPC_UNAVAILABLE",
  );
}
export async function ata(
  account: string,
  mint: string,
  program = TOKEN_PROGRAM,
): Promise<string> {
  const encode = getAddressEncoder();
  return (
    await getProgramDerivedAddress({
      programAddress: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      seeds: [
        encode.encode(address(account)),
        encode.encode(address(program)),
        encode.encode(address(mint)),
      ],
    })
  )[0];
}
export interface MintState {
  decimals: number;
  program: string;
  multiplier: number;
}
export async function verifyMints(
  assets: ETFAsset[],
): Promise<Record<string, MintState>> {
  const result: Record<string, MintState> = {};
  // Small batches work with conservative public RPC limits.
  for (let i = 0; i < assets.length; i += 5) {
    const batch = assets.slice(i, i + 5);
    await Promise.all(
      batch
        .filter((a) => a.kind === "equity")
        .map(async (a) => {
          const issuer = await fetchJson<{
            symbol: string;
            isTradingHalted: boolean;
            deployments: { network: string; address: string }[];
          }>(a.provenanceUrl);
          if (
            issuer.symbol !== a.tokenSymbol ||
            issuer.isTradingHalted !== false ||
            !issuer.deployments?.some(
              (d) => d.network === "Solana" && d.address === a.mint,
            )
          )
            throw new AppError(
              "Issuer verification failed or trading is halted for " +
                a.ticker +
                ".",
              503,
              "ASSET_UNVERIFIED",
            );
        }),
    );
    const response = await rpc<{
      value: ({
        owner: string;
        data: {
          parsed: {
            type: string;
            info: {
              decimals: number;
              isInitialized: boolean;
              extensions?: {
                extension: string;
                state: Record<string, unknown>;
              }[];
            };
          };
        };
      } | null)[];
    }>("getMultipleAccounts", [
      batch.map((a) => a.mint),
      { encoding: "jsonParsed", commitment: "finalized" },
    ]);
    for (const [index, a] of batch.entries()) {
      const value = response.value[index];
      const info = value?.data?.parsed?.info;
      if (
        !value ||
        value.owner !== a.tokenProgram ||
        value.data?.parsed?.type !== "mint" ||
        info?.decimals !== a.decimals ||
        !info.isInitialized
      )
        throw new AppError(
          "Mint metadata changed for " + a.ticker + ". Trading blocked.",
          503,
          "ASSET_UNVERIFIED",
        );
      const extensions = info.extensions || [];
      if (
        extensions.some(
          (e) => e.extension === "pausableConfig" && e.state.paused === true,
        )
      )
        throw new AppError(a.ticker + " transfers are paused.");
      if (
        extensions.some(
          (e) => e.extension === "transferHook" && e.state.programId !== null,
        )
      )
        throw new AppError("Unsupported token transfer hook.");
      if (
        extensions.some((e) =>
          [
            "transferFeeConfig",
            "nonTransferable",
            "confidentialTransferFeeConfig",
          ].includes(e.extension),
        )
      )
        throw new AppError("Unsupported token extension.");
      const scaled = extensions.find(
        (e) => e.extension === "scaledUiAmountConfig",
      )?.state;
      const multiplier = scaled
        ? Number(
            Number(scaled.newMultiplierEffectiveTimestamp) <= Date.now() / 1000
              ? scaled.newMultiplier
              : scaled.multiplier,
          )
        : 1;
      if (!Number.isFinite(multiplier) || multiplier <= 0)
        throw new AppError("Invalid token scaling.", 503);
      result[a.mint] = {
        decimals: a.decimals,
        program: a.tokenProgram,
        multiplier,
      };
    }
  }
  return result;
}
export interface Holding {
  mint: string;
  ticker: string;
  amountAtomic: string;
  quantity: number;
  spendableAtomic: string;
}
export async function walletBalances(account: string) {
  publicKey(account);
  const [sol, classic, extended] = await Promise.all([
    rpc<{ value: number }>("getBalance", [
      account,
      { commitment: "finalized" },
    ]),
    rpc<{ value: ParsedAccount[] }>("getTokenAccountsByOwner", [
      account,
      { programId: TOKEN_PROGRAM },
      { encoding: "jsonParsed", commitment: "finalized" },
    ]),
    rpc<{ value: ParsedAccount[] }>("getTokenAccountsByOwner", [
      account,
      { programId: TOKEN_2022_PROGRAM },
      { encoding: "jsonParsed", commitment: "finalized" },
    ]),
  ]);
  const map = new Map<string, Holding>();
  let usdc = 0n;
  let usdcSpendable = 0n;
  const associated = new Map(
    await Promise.all(
      TOKEN_CATALOG.map(
        async (a) =>
          [a.mint, await ata(account, a.mint, a.tokenProgram)] as const,
      ),
    ),
  );
  const usdcAta = await ata(account, USDC_MINT_ADDRESS);
  for (const entry of [...classic.value, ...extended.value]) {
    const info = entry.account.data.parsed.info;
    const amount = BigInt(info.tokenAmount.amount);
    if (
      info.mint === USDC_MINT_ADDRESS &&
      entry.account.owner === TOKEN_PROGRAM
    ) {
      usdc += amount;
      if (
        entry.pubkey === usdcAta &&
        info.state === "initialized" &&
        !info.delegate
      )
        usdcSpendable = amount;
    }
    const known = TOKEN_CATALOG.find(
      (a) => a.mint === info.mint && a.tokenProgram === entry.account.owner,
    );
    if (!known || amount === 0n) continue;
    const existing = map.get(known.mint);
    const quantity = Number(info.tokenAmount.uiAmountString);
    if (!Number.isFinite(quantity) || quantity < 0)
      throw new AppError("Invalid balance response.", 503);
    const spendable =
      entry.pubkey === associated.get(known.mint) &&
      info.state === "initialized" &&
      !info.delegate
        ? amount
        : 0n;
    map.set(known.mint, {
      mint: known.mint,
      ticker: known.ticker,
      quantity: (existing?.quantity || 0) + quantity,
      amountAtomic: (BigInt(existing?.amountAtomic || "0") + amount).toString(),
      spendableAtomic: (
        BigInt(existing?.spendableAtomic || "0") + spendable
      ).toString(),
    });
  }
  return {
    account,
    solLamports: sol.value,
    sol: sol.value / 1e9,
    usdc: Number(usdc) / 1e6,
    usdcAtomic: usdc.toString(),
    usdcSpendableAtomic: usdcSpendable.toString(),
    holdings: [...map.values()],
    tokenAccounts: [...classic.value, ...extended.value].map((a) => ({
      address: a.pubkey,
      mint: a.account.data.parsed.info.mint,
      amountAtomic: a.account.data.parsed.info.tokenAmount.amount,
    })),
  };
}
interface ParsedAccount {
  pubkey: string;
  account: {
    owner: string;
    data: {
      parsed: {
        info: {
          mint: string;
          state: string;
          delegate?: string;
          tokenAmount: { amount: string; uiAmountString: string };
        };
      };
    };
  };
}
