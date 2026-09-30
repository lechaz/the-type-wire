import { useEffect, useState } from "react"
import { Link, useMatches } from "@tanstack/react-router"
import { stringsFor } from "@/lib/i18n"
import type { NewsCategory } from "@/lib/mbti"
import {
  NEWS_REGIONS,
  REGION_CONFIG,
  REGION_COOKIE,
  TAB_COOKIE,
  monoLabelClass,
} from "@/lib/region"
import { useCurrentRegion, useEventRouteData } from "@/lib/use-current-region"
import { cn } from "@/lib/utils"

const EDITION_START = new Date("2026-01-01T00:00:00Z")

function editionNumber(now: Date) {
  const days = Math.floor(
    (now.getTime() - EDITION_START.getTime()) / 86_400_000
  )
  return Math.max(1, days + 1)
}

export function Masthead() {
  const region = useCurrentRegion()
  const eventRoute = useEventRouteData()
  const leafRoute = useMatches({ select: (matches) => matches.at(-1)?.routeId })
  // A custom story's event page still belongs to the Custom tab.
  const onCustom = leafRoute === "/custom" || eventRoute?.category === "custom"
  const t = stringsFor(region)
  const now = new Date()
  // The dateline is meant to read in the visitor's own local time, which
  // SSR can't know — the server only sees its own clock/zone (UTC on
  // Vercel). Rendering it there would either show the server's date (wrong
  // for the visitor) or fight the client's post-hydration value (the
  // flash this used to have). Computing it client-side only, after mount,
  // sidesteps both: SSR and the first client render agree on empty, then
  // this fills in once — an intentional, silent swap instead of an
  // unpredictable one.
  const [dateline, setDateline] = useState("")
  useEffect(() => {
    setDateline(
      new Date().toLocaleDateString(REGION_CONFIG[region].locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    )
  }, [region])

  // Remember edition + tab for the next visit (read server-side by the "/"
  // and "/custom" routes). Event pages keep whatever tab led to them. A page
  // with no known edition (a missing story, the 404) writes nothing — its
  // "us" fallback isn't the reader's choice.
  const onTabHome = leafRoute === "/" || leafRoute === "/custom"
  const editionKnown = onTabHome || eventRoute !== null
  useEffect(() => {
    const cookie = (name: string, value: string) =>
      (document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`)
    if (editionKnown) cookie(REGION_COOKIE, region)
    if (onTabHome)
      cookie(TAB_COOKIE, leafRoute === "/custom" ? "custom" : "wire")
  }, [region, leafRoute, onTabHome, editionKnown])

  return (
    <>
      <header className="border-b border-border px-6 pt-8 pb-3 text-center">
        {/* Home of whichever tab the reader is on. */}
        <Link
          {...(onCustom
            ? { to: "/custom", search: { region } }
            : {
                to: "/",
                search: (prev: { category?: NewsCategory }) => ({
                  category: prev.category ?? "ai",
                  region,
                }),
              })}
          className="inline-block"
        >
          <p className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The Type Wire
          </p>
        </Link>
        <p
          className={cn(
            "mt-1 font-mono text-[11px] text-muted-foreground",
            monoLabelClass(region)
          )}
        >
          {t.tagline}
        </p>
        <p
          className={cn(
            "-mx-6 mt-3 border-t border-border px-6 pt-2 font-mono text-[11px] text-muted-foreground",
            monoLabelClass(region)
          )}
        >
          {dateline && `${dateline} · `}
          {t.edition(editionNumber(now))}
        </p>

        <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[11px] font-bold">
          {NEWS_REGIONS.map((r) => (
            <Link
              key={r}
              to="/"
              search={(prev) => ({
                category: prev.category ?? "ai",
                region: r,
              })}
              className={cn(
                "px-1.5 py-0.5 transition-colors",
                monoLabelClass(r),
                region === r && !onCustom
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {REGION_CONFIG[r].label}
            </Link>
          ))}
          <Link
            to="/custom"
            search={{ region }}
            className={cn(
              "px-1.5 py-0.5 transition-colors",
              monoLabelClass(region),
              onCustom
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.customTab}
          </Link>
        </div>
      </header>
      {/* Always rendered (visibility toggled, not presence) so this row's
          height is reserved on every route — otherwise the page content
          below jumps up/down as you navigate between the event page and
          everywhere else. */}
      <div
        className={cn(
          "flex justify-start px-6 pt-6",
          !eventRoute && "invisible"
        )}
      >
        <Link
          {...(eventRoute?.category === "custom"
            ? { to: "/custom", search: { region } }
            : {
                to: "/",
                search: { category: eventRoute?.category ?? "ai", region },
              })}
          tabIndex={eventRoute ? 0 : -1}
          aria-hidden={!eventRoute}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground underline underline-offset-4 hover:text-wire-red",
            monoLabelClass(region)
          )}
        >
          {t.backToWire}
        </Link>
      </div>
    </>
  )
}
