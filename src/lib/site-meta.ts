export const SITE_URL = "https://the-type-wire.vercel.app"
export const SITE_NAME = "The Type Wire"

// Fixed to the site icon rather than a per-page screenshot — no per-page
// artwork exists to generate a real og:image from, and this site's live
// screenshots tend to capture whatever large MBTI figurine is in view,
// which reads as a random avatar in the share sheet.
export const SITE_OG_IMAGE = `${SITE_URL}/apple-touch-icon.png`

// Builds the meta tag list every route's head() shares — parent (root) and
// child (a specific route) meta entries are merged by matching key
// (name/property), so a child returning this with a more specific title
// and description overrides the root's site-wide defaults for that tag.
export function buildMetaTags({
  pageTitle,
  description,
}: {
  pageTitle: string | null
  description: string
}) {
  const ogTitle = pageTitle ?? SITE_NAME
  const documentTitle = pageTitle
    ? `${pageTitle} | ${SITE_NAME}`
    : `${SITE_NAME} | ${description}`

  return [
    { title: documentTitle },
    { name: "description", content: description },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: "website" },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: SITE_OG_IMAGE },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: SITE_OG_IMAGE },
  ]
}
