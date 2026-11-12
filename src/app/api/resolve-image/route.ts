import { NextRequest, NextResponse } from "next/server";
import { validateImageUrl } from "@/lib/imageResolver";
import { AppError } from "@/lib/amounts";
import { errorResponse, limitRequests } from "@/lib/server";
export async function GET(request: NextRequest) {
  try {
    await limitRequests("images", 120);
    const original = request.nextUrl.searchParams.get("url");
    let directUrl: string;
    try {
      directUrl = validateImageUrl(original);
    } catch {
      throw new AppError("Use an approved direct HTTPS image URL.");
    }
    return NextResponse.json(
      { directUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
