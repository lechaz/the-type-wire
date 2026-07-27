import { Link } from "@tanstack/react-router"
import { stringsFor } from "@/lib/i18n"
import { NEWS_REGIONS, REGION_CONFIG, monoLabelClass } from "@/lib/region"
import { useCurrentRegion, useEventRouteData } from "@/lib/use-current-region"
import { cn } from "@/lib/utils"

const EDITION_START = new Date("2026-01-01T00:00:00Z")

function editionNumber(now: Date) {
  const days = Math.floor((now.getTime() - EDITION_START.getTime()) / 86_400_000)
  return Math.max(1, days + 1)
}

export function Masthead() {
  const region = useCurrentRegion()
  const eventRoute = useEventRouteData()
  const t = stringsFor(region)
  const now = new Date()
  const dateline = now.toLocaleDateString(REGION_CONFIG[region].locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <header className="border-b border-border px-6 pt-8 pb-3 text-center">
      {eventRoute && (
        <div className="mb-2 flex justify-start">
          <Link
            to="/"
            search={{ category: eventRoute.category, region }}
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground underline underline-offset-4 hover:text-wire-red",
              monoLabelClass(region),
            )}
          >
            {t.backToWire}
          </Link>
        </div>
      )}
      <Link
        to="/"
        search={(prev) => ({ category: prev.category ?? "ai", region })}
        className="inline-block"
      >
        <p className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          The Type Wire
        </p>
      </Link>
      <p className={cn("mt-1 font-mono text-[11px] text-muted-foreground", monoLabelClass(region))}>
        {t.tagline}
      </p>
      <p
        className={cn(
          "-mx-6 mt-3 border-t border-border px-6 pt-2 font-mono text-[11px] text-muted-foreground",
          monoLabelClass(region),
        )}
      >
        {dateline} · {t.edition(editionNumber(now))}
      </p>

      <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[11px] font-bold">
        {NEWS_REGIONS.map((r) => (
          <Link
            key={r}
            to="/"
            search={(prev) => ({ category: prev.category ?? "ai", region: r })}
            className={cn(
              "px-1.5 py-0.5 transition-colors",
              monoLabelClass(r),
              region === r
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {REGION_CONFIG[r].label}
          </Link>
        ))}
      </div>
    </header>
  )
}
