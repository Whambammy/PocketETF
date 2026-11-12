import { NextRequest, NextResponse } from "next/server";
import {
  readJson,
  errorResponse,
  limitRequests,
  messageHash,
} from "@/lib/server";
import { decodeWire } from "@/lib/jupiter";
import { AppError } from "@/lib/amounts";
import { TOKEN_CATALOG } from "@/lib/constants";
import { rpc, publicKey } from "@/lib/solana";
import { getPythPricesForAssets, requireFreshPrice } from "@/lib/pyth";
import {
  address,
  getPublicKeyFromAddress,
  verifySignature,
  getBase58Decoder,
} from "@solana/kit";

// A signed-transaction relay, not an operator permission or custodial service.
// The user's Ed25519 signature is the authority to spend their funds.
export async function POST(request: NextRequest) {
  try {
    await limitRequests("submit", 30);
    const body = await readJson(request, 12000);
    const account = publicKey(body.account);
    if (
      typeof body.expectedMessageHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.expectedMessageHash)
    )
      throw new AppError("Invalid reviewed message hash.");
    if (
      typeof body.expiresAt !== "number" ||
      !Number.isFinite(body.expiresAt) ||
      body.expiresAt < Date.now()
    )
      throw new AppError(
        "Preview expired. Refresh it before signing.",
        409,
        "PREVIEW_EXPIRED",
      );
    if (
      body.expiresAt > Date.now() + 60000 ||
      typeof body.lastValidBlockHeight !== "number" ||
      !Number.isSafeInteger(body.lastValidBlockHeight) ||
      body.lastValidBlockHeight <= 0
    )
      throw new AppError("Invalid transaction lifetime.");
    const tx = decodeWire(body.transaction);
    if (
      messageHash(tx.messageBytes) !== body.expectedMessageHash ||
      Object.keys(tx.signatures).length !== 1 ||
      !tx.signatures[address(account)]
    )
      throw new AppError(
        "Signed transaction does not match the reviewed message or wallet.",
      );
    const signed = tx.signatures[address(account)]!;
    if (
      !(await verifySignature(
        await getPublicKeyFromAddress(address(account)),
        signed,
        tx.messageBytes,
      ))
    )
      throw new AppError("Invalid wallet signature.");
    if (
      !Array.isArray(body.mints) ||
      !body.mints.length ||
      body.mints.length > 8 ||
      body.mints.some(
        (m) =>
          typeof m !== "string" || !TOKEN_CATALOG.some((a) => a.mint === m),
      )
    )
      throw new AppError("Unverified transaction assets.");
    const assets = TOKEN_CATALOG.filter((a) =>
      (body.mints as string[]).includes(a.mint),
    );
    const prices = await getPythPricesForAssets(assets);
    assets.forEach((a) => requireFreshPrice(prices[a.ticker]));
    const height = await rpc<number>("getBlockHeight", [
      { commitment: "finalized" },
    ]);
    if (height > body.lastValidBlockHeight)
      throw new AppError(
        "Transaction expired. Refresh the preview.",
        409,
        "PREVIEW_EXPIRED",
      );
    const signature = await rpc<string>("sendTransaction", [
      body.transaction,
      {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "finalized",
        maxRetries: 2,
      },
    ]);
    if (signature !== getBase58Decoder().decode(signed))
      throw new AppError(
        "RPC returned an unexpected signature. Check your transaction in the explorer.",
        503,
      );
    return NextResponse.json(
      { success: true, signature },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
