// Where the public site lives, for the "View" buttons.
//
// NEXT_PUBLIC_SITE_URL is the setting; it just is not set on Vercel, which is
// why those buttons were opening localhost. The default below is the live
// site rather than localhost, so an unset variable sends people somewhere real
// instead of nowhere. Set the variable to point a deployment at a different
// front end -- including when working locally, where it belongs in .env.local
// as http://localhost:3000.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://frontend.luxotel.com'
).replace(/\/+$/, '')

/**
 * Turns whatever is typed into a menu's URL field into something a browser can
 * open, or null when it is not an address at all.
 *
 * The field is free text and holds all sorts: "/contact", "luxotel.com/france",
 * "https://example.com", and in at least one case "Home Page". Gluing the site
 * URL onto the front of each of those produced things like
 * "http://localhost:3000Home Page", which the browser refused -- that refusal
 * is what "about:blank#blocked" was.
 */
export function resolveSiteHref(raw: string | null | undefined): string | null {
  const href = (raw || '').trim()
  if (!href) return null

  // Already absolute, or a link the browser handles on its own.
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href

  // A path on our own site.
  if (href.startsWith('/')) return `${SITE_URL}${href}`

  // A bare domain, e.g. "luxotel.com/france" or "www.luxotel.com/events".
  // Anything with a dot and no spaces before the first slash counts.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(href)) return `https://${href}`

  // Prose, a note to self, an empty anchor -- not an address.
  return null
}
