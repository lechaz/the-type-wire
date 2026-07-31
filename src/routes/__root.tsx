import { useEffect } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { Analytics } from "@vercel/analytics/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { RouteProgress } from "@/components/route-progress"
import { Masthead } from "@/components/masthead"
import { LegendDrawer } from "@/components/legend-drawer"
import { BackToTop } from "@/components/back-to-top"
import { stringsFor } from "@/lib/i18n"
import { CATEGORY_LABELS } from "@/lib/mbti"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, pickRegionFromMatches } from "@/lib/region"
import { useCurrentRegion } from "@/lib/use-current-region"
import { buildMetaTags } from "@/lib/site-meta"

import appCss from "../styles.css?url"
import cjkCss from "../styles-cjk.css?url"

// This only covers what's known synchronously at match time (URL search
// params) — the "/" route's category, or the site-wide default. An event's
// own headline/summary is NOT handled here even though it's technically
// reachable via a descendant match's loaderData: root's head() runs once
// per navigation and isn't guaranteed to re-fire once that async loader
// later resolves, which is exactly why the event page's <title> used to
// stay frozen on the previous page's until a hard refresh. Each route owns
// its own head()/loaderData pairing instead (see event.$eventId.index.tsx).
export const Route = createRootRoute({
  head: (ctx) => {
    const region = pickRegionFromMatches(ctx.matches)
    const t = stringsFor(region)

    const matches = ctx.matches as ReadonlyArray<{
      routeId: string
      search?: unknown
    }>
    const homeMatch = matches.find((m) => m.routeId === "/")
    const category = (
      homeMatch?.search as { category?: NewsCategory } | undefined
    )?.category
    const pageTitle = category
      ? `${CATEGORY_LABELS[region][category]} — ${REGION_CONFIG[region].label}`
      : null

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        ...buildMetaTags({ pageTitle, description: t.tagline }),
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        // Noto Serif/Sans TC compile to 400+ subsetted @font-face rules —
        // ~200KB gzipped of render-blocking CSS text a US visitor would
        // otherwise download and parse for glyphs they'll never render.
        // Loaded only for the TW edition, and reactively on a client-side
        // region switch since head() re-runs per navigation (same
        // mechanism the event-page <title> fix relies on).
        ...(region === "tw" ? [{ rel: "stylesheet", href: cjkCss }] : []),
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

// Chunk hashes go stale the moment a new deploy ships — a tab left open
// (or a link into a page cached by a search engine/social preview) can
// still hold a route reference to a JS chunk Vercel no longer serves,
// which surfaces as "Failed to fetch dynamically imported module".
// vite:preloadError fires for exactly this case; reload once to pick up
// the current build instead of leaving the user on a dead page.
function useReloadOnStaleChunk() {
  useEffect(() => {
    const RELOAD_FLAG = "stale-chunk-reload"
    const handler = (event: Event) => {
      event.preventDefault()
      if (sessionStorage.getItem(RELOAD_FLAG)) return
      sessionStorage.setItem(RELOAD_FLAG, "1")
      window.location.reload()
    }
    window.addEventListener("vite:preloadError", handler)
    // Clear the guard only after this load has proven itself stable, so a
    // reload that lands on a build that's STILL stale (e.g. a CDN edge
    // that hasn't caught up yet) can't loop rapidly.
    const clearGuard = window.setTimeout(
      () => sessionStorage.removeItem(RELOAD_FLAG),
      5000
    )
    return () => {
      window.removeEventListener("vite:preloadError", handler)
      window.clearTimeout(clearGuard)
    }
  }, [])
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const region = useCurrentRegion()
  useReloadOnStaleChunk()

  return (
    <html lang={REGION_CONFIG[region].htmlLang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* timeout={0} disables base-ui's "grouped tooltip" behavior — by
            default, once one tooltip opens, adjacent ones open instantly
            for the next 400ms, which strobes when the pointer sweeps
            quickly across closely-packed triggers (e.g. prediction
            timeline nodes). Every tooltip open now honors the full delay,
            so a fast sweep shows nothing instead of flashing through each
            one; only lingering on a trigger opens its tooltip. */}
        <TooltipProvider delay={300} closeDelay={100} timeout={0}>
          <RouteProgress />
          <Masthead />
          {children}
          <BackToTop />
          <LegendDrawer />
          <Toaster theme="light" position="bottom-right" />
        </TooltipProvider>
        <Analytics />
        <Scripts />
      </body>
    </html>
  )
}
