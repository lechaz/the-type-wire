import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { RouteProgress } from "@/components/route-progress"
import { Masthead } from "@/components/masthead"
import { LegendDrawer } from "@/components/legend-drawer"
import { BackToTop } from "@/components/back-to-top"
import { stringsFor } from "@/lib/i18n"
import { REGION_CONFIG, pickRegionFromMatches } from "@/lib/region"
import { useCurrentRegion } from "@/lib/use-current-region"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: (ctx) => {
    const region = pickRegionFromMatches(ctx.matches)
    const { tagline } = stringsFor(region)
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
          title: `The Type Wire | ${tagline}`,
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
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
