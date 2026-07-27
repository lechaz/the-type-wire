import { CATEGORY_QUERIES } from "./categories"
import { NewsSearchResponseSchema, RapidApiSearchResponseSchema, type NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

type NewsProvider = "currents" | "rapidapi"
const ALL_PROVIDERS: NewsProvider[] = ["currents", "rapidapi"]

// Dev override: set to a single provider to force it (debugging, cost
// control, isolating a provider-specific bug). Leave null to query both
// providers and dedupe — that's what gets 3-5+ articles/category reliably.
const FORCE_PROVIDER: NewsProvider | null = null

const CURRENTS_API_BASE = "https://api.currentsapi.services/v1"

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

async function searchCurrentsOnce(query: string, region: NewsRegion): Promise<Response> {
  const key = process.env.CURRENTS_API_KEY
  if (!key) {
    throw new Error("Missing CURRENTS_API_KEY. Check .env.local.")
  }

  const { country, lang } = REGION_CONFIG[region]
  const url = new URL(`${CURRENTS_API_BASE}/search`)
  url.searchParams.set("keywords", query)
  url.searchParams.set("country", country)
  url.searchParams.set("language", lang)

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
  url.searchParams.set("time_published", "1d")
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

// Collapse cross-provider duplicates of the same story: same link, or same
// title once case/punctuation/whitespace differences are normalized away.
function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>()
  const deduped: NewsArticle[] = []
  for (const article of articles) {
    const titleKey = article.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
    if (seen.has(article.link) || seen.has(titleKey)) continue
    seen.add(article.link)
    seen.add(titleKey)
    deduped.push(article)
  }
  return deduped
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

  return dedupeArticles(articles).slice(0, 20)
}
