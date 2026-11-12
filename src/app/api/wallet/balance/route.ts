import { NextRequest, NextResponse } from "next/server";
import { walletBalances, publicKey } from "@/lib/solana";
import { getPythPricesForAssets, portfolioValue } from "@/lib/pyth";
import { errorResponse, limitRequests } from "@/lib/server";
export async function GET(request: NextRequest) {
  try {
    await limitRequests("balance", 120);
    const account = publicKey(request.nextUrl.searchParams.get("account"));
    const [balances, prices] = await Promise.all([
      walletBalances(account),
      getPythPricesForAssets(),
    ]);
    const value = portfolioValue(balances.holdings, prices);
    const { tokenAccounts, ...publicBalances } = balances;
    void tokenAccounts;
    return NextResponse.json(
      {
        success: true,
        ...publicBalances,
        prices,
        valuation: {
          ...value,
          value: value.value === null ? null : value.value + balances.usdc,
          knownValue: value.knownValue + balances.usdc,
        },
        formattedUsdc: "$" + balances.usdc.toFixed(2),
        formattedSol: balances.sol.toFixed(4) + " SOL",
        observedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
