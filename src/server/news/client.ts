import { CATEGORY_QUERIES } from "./categories"
import { NewsSearchResponseSchema, RapidApiSearchResponseSchema, type NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

type NewsProvider = "currents" | "rapidapi"
const ALL_PROVIDERS: NewsProvider[] = ["currents", "rapidapi"]

// Dev override: set to a single provider to force it (debugging, cost
// control, isolating a provider-specific bug). Leave null to query both
// providers and dedupe — that's what gets 3-5+ articles/category reliably.
const FORCE_PROVIDER: NewsProvider | null = null //set null to query both providers, set "currents" or "rapidapi" to force one

// RapidAPI's Real-Time News Data 400s on the plain "zh" tag region.ts uses
// for TW — it wants the BCP47 tag zh-Hant specifically. Verified live.
const RAPIDAPI_LANG_OVERRIDE: Partial<Record<NewsRegion, string>> = { tw: "zh-Hant" }

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

async function searchCurrentsOnce(query: string, region: NewsRegion): Promise<Response> {
  const key = process.env.CURRENTS_API_KEY
  const base = process.env.CURRENTS_API_BASE
  if (!key || !base) {
    throw new Error("Missing CURRENTS_API_KEY or CURRENTS_API_BASE. Check .env.local.")
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
  })
}

async function searchCurrents(query: string, region: NewsRegion): Promise<NewsArticle[]> {
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

async function searchRapidApiOnce(query: string, region: NewsRegion): Promise<Response> {
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
  })
}

async function searchRapidApi(query: string, region: NewsRegion): Promise<NewsArticle[]> {
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

function fetchFromProvider(provider: NewsProvider, query: string, region: NewsRegion) {
  return provider === "currents" ? searchCurrents(query, region) : searchRapidApi(query, region)
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

// Both providers' "keyword search" is looser than the name implies — it can
// surface articles that never mention the query at all (wrong section tag
// upstream, fuzzy relevance scoring, etc). Require at least one query term
// to literally appear in the title or snippet before it reaches triage.
// Matched at term boundaries (not bare substring) so a short term like "AI"
// doesn't match inside "said" or "domain".
function isOnTopic(article: NewsArticle, category: NewsCategory, query: string): boolean {
  const haystack = `${article.title} ${article.snippet ?? ""}`
  const terms = `${query} ${RELEVANCE_TERM_ALIASES[category] ?? ""}`.split(/\s+/).filter(Boolean)

  return terms.some((term) => {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "iu")
    return pattern.test(haystack)
  })
}

export async function fetchTopArticles(
  category: NewsCategory,
  region: NewsRegion,
): Promise<NewsArticle[]> {
  const query = CATEGORY_QUERIES[region][category]
  const providers = FORCE_PROVIDER ? [FORCE_PROVIDER] : ALL_PROVIDERS

  const results = await Promise.allSettled(
    providers.map((provider) => fetchFromProvider(provider, query, region)),
  )

  const articles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))

  if (articles.length === 0) {
    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    )?.reason
    throw firstError instanceof Error ? firstError : new Error("All news providers returned zero articles")
  }

  return dedupeArticles(articles)
    .filter((a) => isOnTopic(a, category, query))
    .slice(0, 20)
}
