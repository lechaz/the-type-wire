import { CATEGORY_QUERIES } from "./categories"
import { NewsSearchResponseSchema, type NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

// BASIC RapidAPI plan is rate-limited to 1 req/sec (confirmed by probing —
// requests 2+ within the same second come back 429). Serialize all calls
// through this module-level gate rather than firing 5 categories at once.
const MIN_INTERVAL_MS = 1100
let lastCallAt = 0

async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCallAt = Date.now()
}

async function searchOnce(query: string, region: NewsRegion): Promise<Response> {
  const host = process.env.RAPIDAPI_HOST
  const key = process.env.RAPIDAPI_KEY
  if (!host || !key) {
    throw new Error("Missing RAPIDAPI_HOST or RAPIDAPI_KEY. Check .env.local.")
  }

  const { country, lang } = REGION_CONFIG[region]
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

export async function fetchTopArticles(
  category: NewsCategory,
  region: NewsRegion,
): Promise<NewsArticle[]> {
  const query = CATEGORY_QUERIES[region][category]

  await throttle()
  let res = await searchOnce(query, region)

  if (res.status === 429) {
    // one retry past the per-second window
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS))
    lastCallAt = Date.now()
    res = await searchOnce(query, region)
  }

  if (!res.ok) {
    throw new Error(`Real-Time News Data request failed: ${res.status}`)
  }

  const json = await res.json()
  const parsed = NewsSearchResponseSchema.parse(json)
  return parsed.data
}
