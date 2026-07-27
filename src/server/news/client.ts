import { CATEGORY_QUERIES } from "./categories"
import { NewsSearchResponseSchema, type NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

const CURRENTS_API_BASE = "https://api.currentsapi.services/v1"

// Free Currents API plan is rate-limited to 20 req/min. Serialize calls
// through this module-level gate rather than firing 5 categories at once.
const MIN_INTERVAL_MS = 3100
let lastCallAt = 0

async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCallAt = Date.now()
}

async function searchOnce(query: string, region: NewsRegion): Promise<Response> {
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

export async function fetchTopArticles(
  category: NewsCategory,
  region: NewsRegion,
): Promise<NewsArticle[]> {
  const query = CATEGORY_QUERIES[region][category]

  await throttle()
  let res = await searchOnce(query, region)

  if (res.status === 429) {
    // one retry past the rate-limit window
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS))
    lastCallAt = Date.now()
    res = await searchOnce(query, region)
  }

  if (!res.ok) {
    throw new Error(`Currents API request failed: ${res.status}`)
  }

  const json = await res.json()
  const parsed = NewsSearchResponseSchema.parse(json)

  return parsed.news.slice(0, 20).map((a) => ({
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
