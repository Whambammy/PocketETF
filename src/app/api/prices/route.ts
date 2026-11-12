import { NextRequest, NextResponse } from "next/server";
import { TOKEN_CATALOG } from "@/lib/constants";
import { getPythPricesForAssets } from "@/lib/pyth";
import { errorResponse, limitRequests } from "@/lib/server";
export async function GET(request: NextRequest) {
  try {
    await limitRequests("prices", 180);
    const query = request.nextUrl.searchParams.get("tickers");
    const tickers = query?.split(",");
    const assets = tickers
      ? TOKEN_CATALOG.filter((a) => tickers.includes(a.ticker))
      : TOKEN_CATALOG;
    const prices = await getPythPricesForAssets(assets);
    return NextResponse.json(
      {
        success: true,
        source:
          "Pyth Hermes; underlying reference prices, not executable token quotes",
        prices,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
