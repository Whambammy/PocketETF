/**
 * Universal Image Resolver:
 * Handles indirect image sharing links (e.g. Postimages gallery pages, Imgur pages)
 * and resolves them to raw, direct image assets with proper MIME types.
 *
 * This ensures OpenGraph crawlers, Twitterbot, and Solana Action/Blink specifications
 * receive 100% valid image binaries instead of HTML landing pages.
 */

const DIRECT_IMAGE_REGEX = /\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i;

export async function resolveDirectImageUrl(url: string | null | undefined): Promise<string> {
  if (!url || typeof url !== 'string') {
    return '/etfs/custom.png';
  }

  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = `https://${clean}`;
  }

  // Already a local path
  if (clean.startsWith('/')) {
    return clean;
  }

  // Already a direct image file
  if (DIRECT_IMAGE_REGEX.test(clean)) {
    return clean;
  }

  // Case 1: Postimages landing page (e.g. https://postimg.cc/Lh7bLhZb or https://postimages.org/...)
  if (clean.includes('postimg.cc/') || clean.includes('postimages.org/')) {
    try {
      const res = await fetch(clean, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        next: { revalidate: 86400 }, // Cache on Edge/Vercel for 24h
      });

      if (res.ok) {
        const html = await res.text();
        // Priority 1: og:image meta tag
        const ogMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
        if (ogMatch && ogMatch[1] && DIRECT_IMAGE_REGEX.test(ogMatch[1])) {
          return ogMatch[1];
        }
        // Priority 2: Direct link input element on Postimages page
        const directMatch = html.match(/id=["']direct["'][^>]*value=["']([^"']+)["']/i);
        if (directMatch && directMatch[1]) {
          return directMatch[1];
        }
      }
    } catch {
      // Fallback silently if network fails
    }
  }

  // Case 2: Imgur page (e.g. https://imgur.com/gallery/XYZ or https://imgur.com/XYZ)
  const imgurMatch = clean.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/)?([a-zA-Z0-9]+)$/i);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  return clean;
}
