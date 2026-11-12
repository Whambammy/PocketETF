const LOCAL = /^\/etfs\/[a-z0-9-]+\.(png|webp|jpe?g)$/i;
const HOSTS = new Set([
  "i.imgur.com",
  "i.postimg.cc",
  "xstocks-metadata.backed.fi",
]);
export function validateImageUrl(input: unknown): string {
  if (typeof input !== "string" || input.length > 500)
    throw new Error("Invalid image URL.");
  if (LOCAL.test(input)) return input;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("Use a direct HTTPS image URL.");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !HOSTS.has(u.hostname) ||
    u.hash ||
    u.search ||
    !/^\/[a-zA-Z0-9/_-]+\.(png|webp|jpe?g)$/i.test(u.pathname)
  )
    throw new Error(
      "Use a direct PNG, JPEG or WebP URL from i.imgur.com or i.postimg.cc.",
    );
  return u.href;
}
// Deliberately never fetch user-supplied URLs on the server (including redirects).
export async function resolveDirectImageUrl(url: unknown): Promise<string> {
  if (!url) return "/etfs/custom.png";
  return validateImageUrl(url);
}
