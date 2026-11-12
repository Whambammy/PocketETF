import { NextRequest, NextResponse } from "next/server";
import { resolveETF } from "@/lib/etfResolver";
import { buildTrade } from "@/lib/jupiter";
import { AppError } from "@/lib/amounts";
import { limitRequests, readJson, errorResponse } from "@/lib/server";
export async function POST(request: NextRequest) {
  try {
    await limitRequests("prepare", 20);
    const body = await readJson(request);
    if (
      typeof body.id !== "string" ||
      body.id.length > 80 ||
      typeof body.query !== "string" ||
      body.query.length > 2500 ||
      typeof body.amount !== "string" ||
      typeof body.account !== "string"
    )
      throw new AppError("Invalid trade request.");
    const etf = resolveETF(body.id, new URLSearchParams(body.query));
    if (!etf) throw new AppError("Invalid basket or allocation.");
    if (
      body.mode !== "buy" &&
      body.mode !== "sell" &&
      body.mode !== "rebalance"
    )
      throw new AppError("Invalid trade mode.");
    if (body.version !== 0 && body.version !== 1)
      throw new AppError("Unsupported transaction version.");
    if (typeof body.slippageBps !== "number")
      throw new AppError("Invalid slippage.");
    const preview = await buildTrade({
      account: body.account,
      assets: etf.targetAssets,
      mode: body.mode,
      amount: body.amount,
      version: body.version,
      slippageBps: body.slippageBps,
    });
    return NextResponse.json(
      { success: true, preview },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
