export const DEFAULT_SITE_ORIGIN = "https://pocketetf.vercel.app";

function parseOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

// Vercel settings may contain a bare domain. Bad configuration must not crash
// module evaluation (including Next's /_not-found configuration collection).
export function normalizeSiteOrigin(
  value: string | undefined,
  fallback = DEFAULT_SITE_ORIGIN,
): string {
  return parseOrigin(value) ?? parseOrigin(fallback) ?? DEFAULT_SITE_ORIGIN;
}

export function getSiteOrigin(fallback = DEFAULT_SITE_ORIGIN): string {
  return normalizeSiteOrigin(process.env.NEXT_PUBLIC_BASE_URL, fallback);
}
