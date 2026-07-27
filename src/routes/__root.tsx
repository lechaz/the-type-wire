import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { RouteProgress } from "@/components/route-progress"
import { Masthead } from "@/components/masthead"
import { LegendDrawer } from "@/components/legend-drawer"
import { BackToTop } from "@/components/back-to-top"
import { stringsFor } from "@/lib/i18n"
import { CATEGORY_LABELS, type NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, pickRegionFromMatches, type NewsRegion } from "@/lib/region"
import { useCurrentRegion } from "@/lib/use-current-region"

import appCss from "../styles.css?url"

const SITE_URL = "https://the-type-wire.vercel.app"
const SITE_NAME = "The Type Wire"

// Reuses the same cross-route match lookup as pickRegionFromMatches so the
// share-link preview (og:title/og:description) reflects whatever page is
// actually being shared — an event's own headline, or the active category —
// instead of a static site-wide tagline for every URL. There's no per-page
// og:image (no artwork exists to generate one from), so that stays fixed to
// the site icon rather than falling back to a live screenshot of the page,
// which on this site tends to capture whatever large MBTI figurine is in
// view and looks like a random avatar in the share sheet.
type HeadMatchLike = {
  routeId: string
  search?: unknown
  loaderData?: unknown
}

function pickHeadMetaFromMatches(matches: readonly HeadMatchLike[], region: NewsRegion) {
  const t = stringsFor(region)

  const eventMatch = matches.find((m) => m.routeId === "/event/$eventId/")
  const event = (eventMatch?.loaderData as { detail?: { event?: { headline?: string; summary?: string } } } | undefined)
    ?.detail?.event
  if (event?.headline) {
    return { pageTitle: event.headline, description: event.summary ?? t.tagline }
  }

  const homeMatch = matches.find((m) => m.routeId === "/")
  const category = (homeMatch?.search as { category?: NewsCategory } | undefined)?.category
  if (category) {
    const label = CATEGORY_LABELS[region][category]
    return { pageTitle: `${label} — ${REGION_CONFIG[region].label}`, description: t.tagline }
  }

  return { pageTitle: null, description: t.tagline }
}

export const Route = createRootRoute({
  head: (ctx) => {
    const region = pickRegionFromMatches(ctx.matches)
    const { pageTitle, description } = pickHeadMetaFromMatches(ctx.matches, region)
    const ogTitle = pageTitle ?? SITE_NAME
    const documentTitle = pageTitle ? `${pageTitle} | ${SITE_NAME}` : `${SITE_NAME} | ${description}`
    const ogImage = `${SITE_URL}/apple-touch-icon.png`
    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: documentTitle,
        },
        {
          name: "description",
          content: description,
        },
        {
          property: "og:site_name",
          content: SITE_NAME,
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:title",
          content: ogTitle,
        },
        {
          property: "og:description",
          content: description,
        },
        {
          property: "og:image",
          content: ogImage,
        },
        {
          name: "twitter:card",
          content: "summary",
        },
        {
          name: "twitter:title",
          content: ogTitle,
        },
        {
          name: "twitter:description",
          content: description,
        },
        {
          name: "twitter:image",
          content: ogImage,
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          href: "/favicon.ico",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/manifest.json",
        },
      ],
    }
  },
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const region = useCurrentRegion()

  return (
    <html lang={REGION_CONFIG[region].htmlLang}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider delay={300}>
          <RouteProgress />
          <Masthead />
          {children}
          <BackToTop />
          <LegendDrawer />
          <Toaster theme="light" position="bottom-right" />
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  )
}
