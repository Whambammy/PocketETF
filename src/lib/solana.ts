import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  SOLANA_RPC_ENDPOINT,
  COMPUTE_UNIT_LIMIT,
  COMPUTE_UNIT_PRICE_MICRO_LAMPORTS,
} from './constants';

export interface RawJupiterInstruction {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string;
}

/**
 * Safely sanitizes an RPC candidate URL.
 * Automatically prepends https:// if protocol was omitted (e.g. mainnet.helius-rpc.com/?api-key=xyz).
 * Filters out accidental non-RPC domains (e.g. vercel.app app domains).
 */
function sanitizeRpcUrl(raw?: string): string | null {
  if (!raw) return null;
  let trimmed = raw.trim();
  if (!trimmed) return null;

  // Prepend https:// if protocol is missing
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    // Discard accidental deployment domain inputs
    if (parsed.hostname.endsWith('vercel.app')) {
      console.warn(`[Solana RPC] Ignored deployment domain in RPC configuration: ${parsed.hostname}`);
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

const DEFAULT_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

function buildEndpointsList(): string[] {
  const candidates = [
    process.env.SOLANA_RPC_URL,
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  ];

  const valid = candidates
    .map(sanitizeRpcUrl)
    .filter((url): url is string => Boolean(url));

  if (!valid.includes(DEFAULT_MAINNET_RPC)) {
    valid.push(DEFAULT_MAINNET_RPC);
  }
  return valid;
}

let sharedConnection: Connection | null = null;
let currentRpcIndex = 0;

function createConnectionSafely(endpoint: string): Connection {
  try {
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  } catch (err) {
    console.error(`[Solana RPC] Failed to create connection for ${endpoint}, falling back to default:`, err);
    return new Connection(DEFAULT_MAINNET_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  }
}

/**
 * Returns a resilient Solana RPC Connection with fallback capability
 */
export function getSolanaConnection(): Connection {
  if (!sharedConnection) {
    const endpoints = buildEndpointsList();
    const endpoint = endpoints[currentRpcIndex] || DEFAULT_MAINNET_RPC;
    sharedConnection = createConnectionSafely(endpoint);
  }
  return sharedConnection;
}

/**
 * Rotates to the next available RPC endpoint if the current one experiences 429 rate limits or errors
 */
export function rotateRpcConnection(): Connection {
  const endpoints = buildEndpointsList();
  if (endpoints.length > 1) {
    currentRpcIndex = (currentRpcIndex + 1) % endpoints.length;
    const nextEndpoint = endpoints[currentRpcIndex];
    console.warn(`[Solana RPC] Switching to fallback RPC endpoint: ${nextEndpoint}`);
    sharedConnection = createConnectionSafely(nextEndpoint);
  }
  return getSolanaConnection();
}

/**
 * Converts a raw Jupiter JSON instruction into a Solana Web3 TransactionInstruction
 */
export function deserializeInstruction(raw: RawJupiterInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: Boolean(acc.isSigner),
      isWritable: Boolean(acc.isWritable),
    })),
    data: Buffer.from(raw.data, 'base64'),
  });
}

/**
 * Batch resolves Address Lookup Table accounts from Solana RPC
 */
export async function resolveAddressLookupTables(
  connection: Connection,
  altAddresses: string[]
): Promise<AddressLookupTableAccount[]> {
  if (!altAddresses || altAddresses.length === 0) {
    return [];
  }

  // Deduplicate address strings
  const uniqueAddresses = Array.from(new Set(altAddresses));

  const lookups = await Promise.all(
    uniqueAddresses.map(async (address) => {
      try {
        const pubkey = new PublicKey(address);
        const res = await connection.getAddressLookupTable(pubkey);
        return res.value;
      } catch (err) {
        console.warn(`[resolveAddressLookupTables] Failed to fetch ALT: ${address}`, err);
        return null;
      }
    })
  );

  return lookups.filter((acc): acc is AddressLookupTableAccount => acc !== null);
}

/**
 * Creates Compute Budget instructions (Limit: 1.2M CU, Price: 50k microLamports)
 */
export function createComputeBudgetInstructions(): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: COMPUTE_UNIT_LIMIT,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: COMPUTE_UNIT_PRICE_MICRO_LAMPORTS,
    }),
  ];
}

/**
 * Creates an Idempotent Associated Token Account creation instruction.
 * Safe to execute whether the ATA exists or not.
 */
export function createIdempotentAtaInstruction(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): { ata: PublicKey; instruction: TransactionInstruction } {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const instruction = createAssociatedTokenAccountIdempotentInstruction(
    payer,
    ata,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return { ata, instruction };
}

/**
 * Compiles an array of instructions into a VersionedTransaction v0 with ALTs,
 * and validates that the serialized byte size stays strictly within the 1232 MTU limit.
 */
export async function compileAndValidateV0Transaction(params: {
  connection: Connection;
  payerKey: PublicKey;
  instructions: TransactionInstruction[];
  lookupTableAccounts: AddressLookupTableAccount[];
}): Promise<{
  transaction: VersionedTransaction;
  serializedBase64: string;
  byteLength: number;
}> {
  const { connection, payerKey, instructions, lookupTableAccounts } = params;

  // Fetch recent blockhash with automatic fallback rotation
  let blockhash: string;
  try {
    const res = await connection.getLatestBlockhash('confirmed');
    blockhash = res.blockhash;
  } catch (primaryErr) {
    console.warn('[Solana RPC] Blockhash fetch failed on primary, retrying with fallback RPC...', primaryErr);
    const fallbackConn = rotateRpcConnection();
    const res = await fallbackConn.getLatestBlockhash('confirmed');
    blockhash = res.blockhash;
  }

  // Compile v0 Message
  const messageV0 = new TransactionMessage({
    payerKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  let transaction: VersionedTransaction;
  let serialized: Uint8Array;
  try {
    transaction = new VersionedTransaction(messageV0);
    serialized = transaction.serialize();
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message && error.message.includes('encoding overruns Uint8Array')) {
      throw new Error(
        `Transaction size limit exceeded: serialized transaction exceeds Solana 1232B MTU packet limit. Reduce basket asset count or instructions.`
      );
    }
    throw error;
  }
  const byteLength = serialized.length;

  // Strict 1232-byte MTU check
  if (byteLength > 1232) {
    throw new Error(
      `Transaction size limit exceeded: serialized message is ${byteLength} bytes (maximum allowed: 1232 bytes MTU). Reduce basket asset count or instructions.`
    );
  }

  const serializedBase64 = Buffer.from(serialized).toString('base64');

  return {
    transaction,
    serializedBase64,
    byteLength,
  };
}
