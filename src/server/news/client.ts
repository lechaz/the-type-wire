import { XMLParser } from "fast-xml-parser"
import { FEED_CONFIG } from "./categories"
import type { FeedSource } from "./categories"
import type { NewsArticle } from "./types"
import type { NewsCategory } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

const FEED_TIMEOUT_MS = 8000

// Several outlets (BBC, CNBC) serve a stripped or empty body to requests
// without a browser-like User-Agent.
const USER_AGENT =
  "Mozilla/5.0 (compatible; TheTypeWire/1.0; +https://the-type-wire.vercel.app)"

// htmlEntities decodes named HTML entities (&nbsp;, &rsquo;, etc.) that
// appear in feed descriptions but aren't part of the 5 standard XML
// entities processEntities already handles.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  htmlEntities: true,
})

interface RawRssItem {
  title?: unknown
  link?: unknown
  description?: unknown
  pubDate?: unknown
  guid?: unknown
  enclosure?: { "@_url"?: string }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// fast-xml-parser returns a plain string for a text-only element, but an
// object with a "#text" key once the element also carries attributes (e.g.
// <guid isPermaLink="false">...) — both shapes show up across these feeds.
function textOf(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (value && typeof value === "object" && "#text" in value) {
    return String(value["#text"] ?? "")
  }
  return ""
}

// Feed descriptions ship as plain text or lightly-HTML-tagged markup;
// strip tags so it reads like the plain-text snippet the triage prompt
// (events.ts) was written against.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parsePubDate(pubDate: string): string {
  const parsed = new Date(pubDate)
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString()
}

async function fetchFeed(source: FeedSource): Promise<NewsArticle[]> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`${source.name} feed request failed: ${res.status}`)
  }

  const xml = await res.text()
  const parsed = parser.parse(xml)
  const items = asArray<RawRssItem>(parsed?.rss?.channel?.item)

  const articles: NewsArticle[] = []
  for (const item of items) {
    const link = textOf(item.link)
    const title = stripHtml(textOf(item.title))
    if (!link || !title) continue

    const guid = textOf(item.guid)
    const description = textOf(item.description)

    articles.push({
      article_id: guid || link,
      title,
      link,
      snippet: description ? stripHtml(description) || null : null,
      photo_url: item.enclosure?.["@_url"] ?? null,
      published_datetime_utc: parsePubDate(textOf(item.pubDate)),
      authors: [],
      source_url: link,
      source_name: source.name,
    })
  }
  return articles
}

// Exported for the daily feed-health audit (audit.ts) to probe individual
// sources directly, independent of a category's other feeds.
export { fetchFeed }

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

// Same story often runs on two outlets with a trailing suffix appended
// (site name, section tag, byline) — treat titles as the same story once
// one is a long-enough prefix match of the other, not just when equal.
function isSameStory(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = Math.min(a.length, b.length)
  if (shorter < 10) return false // too short to fuzzy-match safely
  let common = 0
  while (common < shorter && a[common] === b[common]) common++
  return common / shorter >= 0.75
}

// Collapse cross-feed duplicates of the same story: same link, or a
// near-duplicate title (see isSameStory). Only categories with 2+
// configured feeds can actually produce duplicates.
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

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// CJK text has no spaces between words, so a compound term is almost always
// flanked by another CJK character — a letter-adjacency boundary check
// would reject nearly every real match. Boundary-check only Latin terms
// (where it prevents a short one like "AI" matching inside "said"); CJK
// terms use plain substring containment.
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

// A category desk's own feed can still carry a stray sports story (a
// business outlet's sports-finance crossover piece, a general-news feed's
// sports section bleeding into "world") — exclude them outright rather
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
  const sources = FEED_CONFIG[region][category]
  const results = await Promise.allSettled(sources.map(fetchFeed))

  const articles = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  )

  if (articles.length === 0) {
    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )?.reason
    throw firstError instanceof Error
      ? firstError
      : new Error(`All feeds for ${region}/${category} returned zero articles`)
  }

  return dedupeArticles(articles)
    .filter((a) => !isSportsNews(a))
    .slice(0, 20)
}
