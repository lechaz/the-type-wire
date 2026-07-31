import { CATEGORY_QUERIES } from "./categories"
import {
  NewsSearchResponseSchema,
  RapidApiSearchResponseSchema,
  GdeltSearchResponseSchema,
} from "./types"
import type { NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG } from "@/lib/region"
import type { NewsRegion } from "@/lib/region"
import { getDb } from "@/server/db"

export type NewsProvider = "currents" | "rapidapi" | "gdelt"
// Every provider this app knows how to query, in priority order. Currents
// and GDELT lead — RapidAPI's Real-Time News Data is left wired up (below)
// but its BASIC plan's monthly quota has been running dry, so it's last in
// line and only gets used if MAX_SOURCES is raised to include it.
export const ALL_PROVIDERS: NewsProvider[] = ["currents", "gdelt", "rapidapi"]

// Dev knob: how many providers to actually query per fetch, taken in
// priority order from ALL_PROVIDERS (after EXCLUDE_PROVIDER is removed).
// Clamped to [2, ALL_PROVIDERS.length] — below 2 there's no dedup/fallback
// if one provider has a bad day, and above ALL_PROVIDERS.length there's
// nothing more to add.
const MAX_SOURCES = 2

// Env override: set to a provider name to drop it from rotation entirely
// (debugging, cost control, isolating a provider-specific bug). An env var
// rather than a constant on purpose — a constant here caused a multi-day
// outage (2026-07-30): it got left pointing at the wrong provider after a
// debugging session and shipped. Unset in normal operation; the DB-backed
// health audit below is the real source of truth.
const EXCLUDE_PROVIDER = process.env.NEWS_EXCLUDE_PROVIDER as
  | NewsProvider
  | undefined

// A provider is healthy for a region if it has a recent audit row (written
// by the daily cron, src/routes/api.cron.provider-audit.ts) with enough
// articles. Window is time-based, not a row count — Vercel Hobby cron
// delivery is best-effort and can both skip a day and double-deliver the
// same run, so counting rows would let a duplicate distort the lookback.
// 2 days, not 3: this rule is asymmetric (promotion is instant, eviction
// takes the full window), so widening it re-introduces a multi-day blind
// spot — the exact failure this mechanism exists to prevent. Keep this
// coupled to the cron's daily cadence if that schedule ever changes.
const HEALTH_WINDOW_DAYS = 2
const MIN_ARTICLES = 5

async function healthyProviders(region: NewsRegion): Promise<NewsProvider[]> {
  const since = new Date(
    Date.now() - HEALTH_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await getDb()
    .from("provider_audits")
    .select("provider")
    .eq("region", region)
    .eq("ok", true)
    .gte("article_count", MIN_ARTICLES)
    .gte("checked_at", since)

  if (error) throw new Error(error.message)

  // Validate against ALL_PROVIDERS: fetchFromProvider's dispatch below has
  // no default case (unrecognized providers fall through to RapidAPI), so
  // an unrecognized string reaching this app would silently route to the
  // quota-exhausted provider — the same class of failure this replaces.
  const healthy = new Set(
    data
      .map((r) => r.provider)
      .filter((p): p is NewsProvider => (ALL_PROVIDERS as string[]).includes(p))
  )
  return ALL_PROVIDERS.filter((p) => healthy.has(p))
}

async function activeProviders(region: NewsRegion): Promise<NewsProvider[]> {
  const pool = ALL_PROVIDERS.filter((p) => p !== EXCLUDE_PROVIDER)

  let healthy: NewsProvider[] = []
  try {
    healthy = (await healthyProviders(region)).filter((p) => p !== EXCLUDE_PROVIDER)
  } catch (err) {
    console.warn(
      `[activeProviders] health lookup failed for ${region}, falling back to priority order:`,
      err
    )
  }

  // Fewer than 2 healthy providers (including "no audit data yet") backfills
  // from the static priority order — never fewer than MAX_SOURCES providers
  // in rotation just because the audit table is empty or briefly stale.
  const selected =
    healthy.length >= 2
      ? healthy
      : [...healthy, ...pool.filter((p) => !healthy.includes(p))]

  if (healthy.length < 2) {
    console.warn(
      `[activeProviders] only ${healthy.length} healthy provider(s) for ${region}, backfilled from priority order`
    )
  }

  const max = Math.max(2, Math.min(MAX_SOURCES, ALL_PROVIDERS.length))
  return selected.slice(0, max)
}

// RapidAPI's Real-Time News Data 400s on the plain "zh" tag region.ts uses
// for TW — it wants the BCP47 tag zh-Hant specifically. Verified live.
const RAPIDAPI_LANG_OVERRIDE: Partial<Record<NewsRegion, string>> = {
  tw: "zh-Hant",
}

// Free Currents plan: 20 req/min. RapidAPI BASIC plan: 1 req/sec (confirmed
// by probing — requests 2+ within the same second come back 429). Each
// provider gets its own gate so one's cadence doesn't throttle the other.
const CURRENTS_MIN_INTERVAL_MS = 3100
const RAPIDAPI_MIN_INTERVAL_MS = 1100
let currentsLastCallAt = 0
let rapidApiLastCallAt = 0

async function throttleCurrents() {
  const wait = currentsLastCallAt + CURRENTS_MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  currentsLastCallAt = Date.now()
}

async function throttleRapidApi() {
  const wait = rapidApiLastCallAt + RAPIDAPI_MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  rapidApiLastCallAt = Date.now()
}

const LOOKBACK_DAYS = 3

async function searchCurrentsOnce(
  query: string,
  region: NewsRegion
): Promise<Response> {
  const key = process.env.CURRENTS_API_KEY
  const base = process.env.CURRENTS_API_BASE
  if (!key || !base) {
    throw new Error(
      "Missing CURRENTS_API_KEY or CURRENTS_API_BASE. Check .env.local."
    )
  }

  const { country, lang } = REGION_CONFIG[region]
  const startDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const url = new URL(`${base}/search`)
  url.searchParams.set("keywords", query)
  url.searchParams.set("country", country)
  url.searchParams.set("language", lang)
  // Verified live: Currents wants exactly Date#toISOString()'s format
  // (trailing ".000Z") — the RFC 3339 "+00:00" offset form its own error
  // message asks for gets rejected as "Must be RFC 3339 format".
  url.searchParams.set("start_date", startDate.toISOString())

  return fetch(url, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(8000),
  })
}

async function searchCurrents(
  query: string,
  region: NewsRegion
): Promise<NewsArticle[]> {
  await throttleCurrents()
  let res = await searchCurrentsOnce(query, region)

  if (res.status === 429) {
    // one retry past the rate-limit window
    await new Promise((r) => setTimeout(r, CURRENTS_MIN_INTERVAL_MS))
    currentsLastCallAt = Date.now()
    res = await searchCurrentsOnce(query, region)
  }

  if (!res.ok) {
    throw new Error(`Currents API request failed: ${res.status}`)
  }

  const json = await res.json()
  const parsed = NewsSearchResponseSchema.parse(json)

  return parsed.news.map((a) => ({
    article_id: a.id,
    title: a.title,
    link: a.url,
    snippet: a.description,
    photo_url: a.image && a.image !== "None" ? a.image : null,
    published_datetime_utc: new Date(a.published).toISOString(),
    authors: [],
    source_url: a.url,
    source_name: a.author,
  }))
}

async function searchRapidApiOnce(
  query: string,
  region: NewsRegion
): Promise<Response> {
  const host = process.env.RAPIDAPI_HOST
  const key = process.env.RAPIDAPI_KEY
  if (!host || !key) {
    throw new Error("Missing RAPIDAPI_HOST or RAPIDAPI_KEY. Check .env.local.")
  }

  const { country } = REGION_CONFIG[region]
  const lang = RAPIDAPI_LANG_OVERRIDE[region] ?? REGION_CONFIG[region].lang
  const url = new URL(`https://${host}/search`)
  url.searchParams.set("query", query)
  url.searchParams.set("limit", "20")
  // "1d" was too narrow a lookback for thin-news days; broadened to match
  // Currents' LOOKBACK_DAYS=3. RapidAPI's time_published takes discrete
  // buckets, not arbitrary day counts, and "1w" is the nearest one ≥3
  // days — unverified live since the BASIC plan's monthly quota is
  // currently exhausted (confirmed via 429 on 2026-07-26).
  url.searchParams.set("time_published", "1w")
  url.searchParams.set("country", country)
  url.searchParams.set("lang", lang)

  return fetch(url, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": host },
    signal: AbortSignal.timeout(8000),
  })
}

async function searchRapidApi(
  query: string,
  region: NewsRegion
): Promise<NewsArticle[]> {
  await throttleRapidApi()
  let res = await searchRapidApiOnce(query, region)

  if (res.status === 429) {
    // one retry past the per-second window
    await new Promise((r) => setTimeout(r, RAPIDAPI_MIN_INTERVAL_MS))
    rapidApiLastCallAt = Date.now()
    res = await searchRapidApiOnce(query, region)
  }

  if (!res.ok) {
    throw new Error(`Real-Time News Data request failed: ${res.status}`)
  }

  const json = await res.json()
  const parsed = RapidApiSearchResponseSchema.parse(json)
  return parsed.data
}

// GDELT DOC 2.0 (api.gdeltproject.org) — free, no API key, no monthly quota.
// Rate-limited to protect their infra; their own notice says "one every 5
// seconds" but that's been unreliable in practice, so this waits longer.
const GDELT_MIN_INTERVAL_MS = 6000
let gdeltLastCallAt = 0

async function throttleGdelt() {
  const wait = gdeltLastCallAt + GDELT_MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  gdeltLastCallAt = Date.now()
}

// GDELT tags each article with the English name of its outlet's country and
// its source language (e.g. "Taiwan", "Chinese") — not this app's ISO
// codes, and not something worth passing as a query operator: GDELT's query
// parser is documented as unreliable with compound boolean expressions, so
// this filters the plain-keyword search results client-side instead, the
// same defensive approach isOnTopic() already takes for topical relevance.
const GDELT_EXPECTED_COUNTRY: Record<NewsRegion, string> = {
  us: "United States",
  tw: "Taiwan",
}
const GDELT_EXPECTED_LANGUAGE: Record<NewsRegion, string> = {
  us: "English",
  tw: "Chinese",
}

// "20260726T143000Z" -> "2026-07-26T14:30:00Z"
function parseGdeltDate(seendate: string): string {
  const iso =
    `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}` +
    `T${seendate.slice(9, 11)}:${seendate.slice(11, 13)}:${seendate.slice(13, 15)}Z`
  return new Date(iso).toISOString()
}

// GDELT titles are pulled straight from each page's raw <title> tag, not a
// clean headline field — outlets append a trailing "| Section | Site Name"
// chain, and CJK titles come back with stray spaces around brackets that
// real Chinese typography doesn't have. Both are safe, mechanical cleanups;
// anything messier (mixed separators, embedded ads) is left alone rather
// than guessed at.
function cleanGdeltTitle(title: string): string {
  return title
    .replace(/\s*(\|[^|]+){1,3}$/, "")
    .replace(/\s*([「」『』（）()：:])\s*/g, "$1")
    .trim()
}

// GDELT's DOC API rejects a query outright ("...keyword that was too
// short") if it contains a bare Latin token under ~4 characters — verified
// live: "科技 AI" (this app's TW technology query) was rejected over the
// 2-letter "AI", silently zeroing out that category's GDELT contribution.
// CJK tokens aren't affected regardless of length (verified: "政治" alone
// works fine), so this only strips short Latin ones, falling back to the
// original query untouched if that would empty it out entirely.
function gdeltSafeQuery(query: string): string {
  const cjk = /[㐀-鿿]/
  const terms = query
    .split(/\s+/)
    .filter((term) => term.length >= 4 || cjk.test(term))
  return terms.length > 0 ? terms.join(" ") : query
}

async function searchGdeltOnce(query: string) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc")
  url.searchParams.set("query", gdeltSafeQuery(query))
  url.searchParams.set("mode", "artlist")
  url.searchParams.set("format", "json")
  url.searchParams.set("maxrecords", "50")
  url.searchParams.set("timespan", `${LOOKBACK_DAYS}d`)

  const res = await fetch(url, {
    // GDELT sometimes serves a plain-text rate-limit notice with a 200
    // status, not even an error code, to requests that don't look like a
    // real client.
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TheTypeWire/1.0; +https://the-type-wire.vercel.app)",
    },
    signal: AbortSignal.timeout(8000),
  })
  // GDELT signals its rate limit two different ways depending on load: a
  // genuine 429, or (see above) a 200 with a plain-text notice instead of
  // JSON. Both are worth the one retry below — only a different non-2xx
  // status is treated as a real, non-retryable failure.
  if (res.status === 429) return null
  if (!res.ok) throw new Error(`GDELT request failed: ${res.status}`)

  const text = await res.text()
  try {
    return GdeltSearchResponseSchema.parse(JSON.parse(text))
  } catch {
    return null
  }
}

async function searchGdelt(
  query: string,
  region: NewsRegion
): Promise<NewsArticle[]> {
  await throttleGdelt()
  let parsed = await searchGdeltOnce(query)

  if (!parsed) {
    await new Promise((r) => setTimeout(r, GDELT_MIN_INTERVAL_MS))
    gdeltLastCallAt = Date.now()
    parsed = await searchGdeltOnce(query)
  }
  if (!parsed) throw new Error("GDELT request failed: rate-limited after retry")

  const expectedCountry = GDELT_EXPECTED_COUNTRY[region]
  const expectedLanguage = GDELT_EXPECTED_LANGUAGE[region]

  return parsed.articles
    .filter(
      (a) =>
        a.sourcecountry === expectedCountry && a.language === expectedLanguage
    )
    .map((a) => ({
      article_id: a.url,
      title: cleanGdeltTitle(a.title),
      link: a.url,
      snippet: null,
      photo_url: a.socialimage && a.socialimage !== "" ? a.socialimage : null,
      published_datetime_utc: parseGdeltDate(a.seendate),
      authors: [],
      source_url: a.url,
      source_name: a.domain.replace(/^www\./, ""),
    }))
}

export function fetchFromProvider(
  provider: NewsProvider,
  query: string,
  region: NewsRegion
) {
  if (provider === "currents") return searchCurrents(query, region)
  if (provider === "gdelt") return searchGdelt(query, region)
  return searchRapidApi(query, region)
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

// Same outlet often runs the same story through both providers with a
// trailing suffix appended (site name, section tag, byline) — e.g.
// "...拜會陳建仁 產業" vs "...拜會陳建仁｜聯合新聞網". Exact-match on the
// normalized title misses these, so treat titles as the same story once one
// is a long-enough prefix match of the other, not just when they're equal.
function isSameStory(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = Math.min(a.length, b.length)
  if (shorter < 10) return false // too short to fuzzy-match safely
  let common = 0
  while (common < shorter && a[common] === b[common]) common++
  return common / shorter >= 0.75
}

// Collapse cross-provider duplicates of the same story: same link, or a
// near-duplicate title (see isSameStory).
function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const deduped: NewsArticle[] = []
  const seenLinks = new Set<string>()
  const seenTitleKeys: string[] = []

  for (const article of articles) {
    if (seenLinks.has(article.link)) continue
    const titleKey = normalizeTitle(article.title)
    if (seenTitleKeys.some((seen) => isSameStory(seen, titleKey))) continue

    seenLinks.add(article.link)
    seenTitleKeys.push(titleKey)
    deduped.push(article)
  }
  return deduped
}

// Relevance-check-only terms, additional to what's actually sent as the
// provider search query. Real headlines almost never spell out "artificial
// intelligence" — they say "AI" — so checking only the literal search
// phrase rejects genuine AI stories while they slip through under whatever
// other category's query happens to match a stray word in their text.
// Not merged into CATEGORY_QUERIES because it's untested whether the
// providers treat a multi-word "keywords"/"query" param as an AND-phrase or
// an OR-relevance search — safer to leave the provider-facing query alone.
const RELEVANCE_TERM_ALIASES: Partial<Record<NewsCategory, string>> = {
  ai: "AI",
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// CJK text has no spaces between words, so a compound term is almost always
// flanked by another CJK character — a letter-adjacency boundary check
// would reject nearly every real match (e.g. "球界" inside "球界性別歧視").
// Boundary-check only Latin terms (where it prevents a short one like "AI"
// matching inside "said"); CJK terms use plain substring containment.
const CJK_PATTERN = /[㐀-鿿]/

function matchesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => {
    if (CJK_PATTERN.test(term)) return haystack.includes(term)
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`,
      "iu"
    )
    return pattern.test(haystack)
  })
}

// Both providers' "keyword search" is looser than the name implies — it can
// surface articles that never mention the query at all (wrong section tag
// upstream, fuzzy relevance scoring, etc). Require at least one query term
// to literally appear in the title or snippet before it reaches triage.
function isOnTopic(
  article: NewsArticle,
  category: NewsCategory,
  query: string
): boolean {
  const haystack = `${article.title} ${article.snippet ?? ""}`
  const terms = `${query} ${RELEVANCE_TERM_ALIASES[category] ?? ""}`
    .split(/\s+/)
    .filter(Boolean)
  return matchesAnyTerm(haystack, terms)
}

// NEWS_CATEGORIES has no "sports" entry, but keyword search (especially
// Currents' loose CJK matching) regularly surfaces sports stories under
// other categories anyway — a coincidental keyword hit, an outlet's sports
// section getting tagged generically, etc. Exclude them outright rather
// than let them compete with genuinely on-topic stories for a slot.
const SPORTS_EXCLUSION_TERMS = [
  "sports",
  "football",
  "soccer",
  "basketball",
  "baseball",
  "tennis",
  "olympic",
  "olympics",
  "nba",
  "nfl",
  "mlb",
  "nhl",
  "fifa",
  "world cup",
  "棒球",
  "籃球",
  "足球",
  "網球",
  "奧運",
  "世界盃",
  "球員",
  "球隊",
  "球界",
]

function isSportsNews(article: NewsArticle): boolean {
  const haystack = `${article.title} ${article.snippet ?? ""}`
  return matchesAnyTerm(haystack, SPORTS_EXCLUSION_TERMS)
}

export async function fetchTopArticles(
  category: NewsCategory,
  region: NewsRegion
): Promise<NewsArticle[]> {
  const query = CATEGORY_QUERIES[region][category]
  const providers = await activeProviders(region)

  const results = await Promise.allSettled(
    providers.map((provider) => fetchFromProvider(provider, query, region))
  )

  const articles = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  )

  if (articles.length === 0) {
    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )?.reason
    throw firstError instanceof Error
      ? firstError
      : new Error("All news providers returned zero articles")
  }

  return dedupeArticles(articles)
    .filter((a) => isOnTopic(a, category, query))
    .filter((a) => !isSportsNews(a))
    .slice(0, 20)
}
