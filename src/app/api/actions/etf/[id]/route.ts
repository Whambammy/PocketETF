import { NextRequest, NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS } from "@/lib/constants";
import { resolveETF } from "@/lib/etfResolver";
import { buildTrade } from "@/lib/jupiter";
import { readJson, errorResponse, limitRequests } from "@/lib/server";
import { AppError } from "@/lib/amounts";
export { resolveETF };
type Context = { params: Promise<{ id: string }> };
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
}
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await limitRequests("action-metadata", 120);
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    const etf = resolveETF(id, sp);
    if (!etf)
      throw new AppError("Basket not found or invalid allocation.", 404);
    const origin = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const href = new URL("/api/actions/etf/" + encodeURIComponent(id), origin);
    href.search = sp.toString();
    href.searchParams.delete("amount");
    href.searchParams.delete("simulate");
    const actions = [5, 10, 25, 50, 100].map((amount) => {
      const u = new URL(href);
      u.searchParams.set("amount", String(amount));
      return {
        type: "transaction",
        label: "$" + amount + " USDC",
        href: u.href,
      };
    });
    return NextResponse.json(
      {
        type: "action",
        icon: new URL(etf.iconPath, origin).href,
        title: etf.name,
        description:
          etf.description +
          " Review token amounts and fees in your wallet. Routes depend on available liquidity and wallet compatibility.",
        label: "Buy basket",
        disabled: false,
        links: { actions },
      },
      { headers: ACTIONS_CORS_HEADERS },
    );
  } catch (e) {
    return errorResponse(e, ACTIONS_CORS_HEADERS);
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    await limitRequests("action-build", 20);
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    if (sp.has("simulate"))
      throw new AppError(
        "Demo transactions are not available on the live endpoint.",
      );
    if (sp.getAll("amount").length !== 1)
      throw new AppError("Specify one exact USDC amount.");
    const etf = resolveETF(id, sp);
    if (!etf) throw new AppError("Invalid basket.");
    const body = await readJson(request);
    if (typeof body.account !== "string")
      throw new AppError("Signing account required.");
    // External Action clients have not negotiated v1 with this endpoint: retain v0.
    const preview = await buildTrade({
      account: body.account,
      assets: etf.targetAssets,
      amount: sp.get("amount")!,
      mode: "buy",
      version: 0,
      slippageBps: 50,
    });
    return NextResponse.json(
      {
        type: "transaction",
        transaction: preview.transaction,
        message:
          "Buy " +
          preview.inputUsdc +
          " USDC of " +
          etf.name +
          ". Minimum outputs: " +
          preview.legs
            .map((l) => l.minimumOutput + " " + l.outputSymbol)
            .join(", ") +
          ". Estimated fee " +
          preview.networkFeeLamports +
          " lamports; account rent " +
          preview.rentLamports +
          " lamports. Assembly is not confirmation.",
      },
      { headers: ACTIONS_CORS_HEADERS },
    );
  } catch (e) {
    return errorResponse(e, ACTIONS_CORS_HEADERS);
  }
}
