import { NextRequest, NextResponse } from "next/server";
import { errorResponse, limitRequests } from "@/lib/server";
import { rpc } from "@/lib/solana";
import { AppError } from "@/lib/amounts";
export async function GET(request: NextRequest) {
  try {
    await limitRequests("status", 600);
    const signature = request.nextUrl.searchParams.get("signature");
    if (!signature || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature))
      throw new AppError("Invalid transaction signature.");
    const data = await rpc<{
      value: ({ err: unknown; confirmationStatus: string } | null)[];
    }>("getSignatureStatuses", [
      [signature],
      { searchTransactionHistory: true },
    ]);
    const status = data.value[0];
    return NextResponse.json(
      {
        success: true,
        status: status?.err
          ? "failed"
          : status?.confirmationStatus === "finalized"
            ? "finalized"
            : status?.confirmationStatus === "confirmed"
              ? "confirmed"
              : "pending",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
