import { createHash } from "node:crypto";
import { AppError } from "./amounts";
import { NextResponse } from "next/server";
const buckets = new Map<string, { count: number; until: number }>();
export async function limitRequests(key: string, max = 60, seconds = 60) {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (endpoint && token) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new AppError("Invalid rate limiter configuration.", 503);
    const data = await fetchJson<{ result?: number; error?: string }[]>(
      new URL("/pipeline", url).href,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", "pocketetf:" + key],
          ["EXPIRE", "pocketetf:" + key, String(seconds), "NX"],
        ]),
      },
    );
    if (data.some((d) => d.error) || typeof data[0]?.result !== "number")
      throw new AppError("Rate limiter unavailable.", 503);
    if (data[0].result > max)
      throw new AppError(
        "Too many requests. Please wait a minute.",
        429,
        "RATE_LIMIT",
      );
    return;
  }
  // Global buckets cannot be bypassed by spoofing a forwarding header.
  const now = Date.now();
  const previous = buckets.get(key);
  const bucket =
    previous && previous.until > now
      ? previous
      : { count: 0, until: now + seconds * 1000 };
  bucket.count++;
  buckets.set(key, bucket);
  if (bucket.count > max)
    throw new AppError(
      "Too many requests. Please wait a minute.",
      429,
      "RATE_LIMIT",
    );
}
export async function readJson(
  request: Request,
  maxBytes = 16000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("Expected application/json.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Request body required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) throw new AppError("Request too large.", 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new AppError("Invalid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new AppError("Expected a JSON object.");
  return data;
}
export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  maxBytes = 2_000_000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(
      "An upstream service is unavailable. Please retry.",
      503,
      "UPSTREAM_UNAVAILABLE",
    );
  }
  if (!response.ok)
    throw new AppError(
      response.status === 429
        ? "Upstream service is busy. Please retry shortly."
        : "Upstream request failed.",
      503,
      "UPSTREAM_UNAVAILABLE",
    );
  const reader = response.body?.getReader();
  if (!reader) throw new AppError("Empty upstream response.", 503);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new AppError("Upstream response too large.", 503);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString()) as T;
  } catch {
    throw new AppError("Invalid upstream response.", 503);
  }
}
export function errorResponse(
  error: unknown,
  headers: Record<string, string> = {},
) {
  const e =
    error instanceof AppError
      ? error
      : new AppError(
          "Unable to complete this request. Please retry.",
          503,
          "SERVICE_ERROR",
        );
  return NextResponse.json(
    { success: false, message: e.message, code: e.code },
    {
      status: e.status,
      headers: {
        ...headers,
        "Cache-Control": "no-store",
        ...(e.status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
export function messageHash(bytes: ArrayLike<number>) {
  return createHash("sha256").update(Uint8Array.from(bytes)).digest("hex");
}
