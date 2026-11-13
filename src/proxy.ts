import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(18)),
  ).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" +
      nonce +
      "' 'strict-dynamic'" +
      (dev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https://i.imgur.com https://i.postimg.cc https://xstocks-metadata.backed.fi",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'" + (dev ? " ws://localhost:* ws://127.0.0.1:*" : ""),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)",
  ],
};
