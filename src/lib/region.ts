export const NEWS_REGIONS = ["us", "tw"] as const
export type NewsRegion = (typeof NEWS_REGIONS)[number]

export const REGION_CONFIG: Record<
  NewsRegion,
  {
    label: string
    locale: string
    htmlLang: string
    timeZone: string
    promptLanguage: string
  }
> = {
  us: {
    label: "U.S.",
    locale: "en-US",
    htmlLang: "en",
    timeZone: "UTC",
    // Explicit, not blank — a reader-submitted Chinese article on the U.S.
    // edition would otherwise get its analysis back in Chinese.
    promptLanguage: "English",
  },
  tw: {
    label: "臺灣",
    locale: "zh-Hant-TW",
    htmlLang: "zh-Hant-TW",
    timeZone: "Asia/Taipei",
    promptLanguage: "繁體中文 (Traditional Chinese)",
  },
}

// Remember the reader's last edition and tab (wire vs. custom) so a fresh
// visit reopens where they left off. Cookies rather than localStorage so
// SSR can read them and redirect before rendering.
export const REGION_COOKIE = "edition"
export const TAB_COOKIE = "tab"

// Sentinel error message (plain Errors cross the server-fn boundary, so the
// client matches on the string) for a link that isn't English or Chinese.
export const UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"

// Courier Prime's uppercase+letter-spacing treatment reads fine on Latin
// datelines but looks wrong applied to Han characters — TW mono labels drop
// both instead of no-op'ing them.
export function monoLabelClass(region: NewsRegion): string {
  return region === "tw" ? "" : "uppercase tracking-wide"
}

// Shared by useCurrentRegion() (client-side, via useMatches()) and the root
// route's head() (via its own ctx.matches) — same resolution rule in both
// places: the event route's loaded event.region is the source of truth when
// present (an event's language shouldn't flip with the toggle), otherwise
// fall back to the "/" or "/custom" route's region search param, otherwise "us". Typed
// loosely since head()'s RouteMatch and useMatches()'s RouteMatch are
// distinct generic instantiations of the same shape.
type MatchLike = {
  routeId: string
  search?: unknown
  loaderData?: unknown
}

export function pickRegionFromMatches(
  matches: readonly MatchLike[]
): NewsRegion {
  const eventMatch = matches.find((m) => m.routeId === "/event/$eventId/")
  const eventRegion = (
    eventMatch?.loaderData as
      { detail?: { event?: { region?: NewsRegion } } } | undefined
  )?.detail?.event?.region
  if (eventRegion) return eventRegion

  const homeMatch = matches.find(
    (m) => m.routeId === "/" || m.routeId === "/custom"
  )
  const searchRegion = (
    homeMatch?.search as { region?: NewsRegion } | undefined
  )?.region
  return searchRegion ?? "us"
}

// Cache date in the region's own timezone — a TW edition should roll over
// at Taipei midnight, not UTC midnight.
export function cacheDateFor(region: NewsRegion): string {
  const { timeZone } = REGION_CONFIG[region]
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value
  return `${get("year")}-${get("month")}-${get("day")}`
}
