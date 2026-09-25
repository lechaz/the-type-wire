import { NEWS_CATEGORIES } from "@/lib/mbti"
import type { NewsCategory } from "@/lib/mbti"
import { NEWS_REGIONS } from "@/lib/region"
import type { NewsRegion } from "@/lib/region"
import { FEED_CONFIG } from "./categories"
import type { FeedSource } from "./categories"
import { fetchFeed } from "./client"
import type { getDb } from "@/server/db"

type Db = ReturnType<typeof getDb>

export interface FeedAuditResult {
  region: NewsRegion
  category: NewsCategory
  provider: string
  feedUrl: string
  ok: boolean
  articleCount: number
  error: string | null
}

async function probeFeed(
  region: NewsRegion,
  category: NewsCategory,
  source: FeedSource
): Promise<FeedAuditResult> {
  try {
    const articles = await fetchFeed(source)
    return {
      region,
      category,
      provider: source.name,
      feedUrl: source.url,
      ok: true,
      articleCount: articles.length,
      error: null,
    }
  } catch (err) {
    return {
      region,
      category,
      provider: source.name,
      feedUrl: source.url,
      ok: false,
      articleCount: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// Unlike the quota-limited search APIs this replaced, an RSS fetch is free
// and unrate-limited — every configured feed gets probed daily, no need to
// rotate coverage across days.
export async function auditProviders(db: Db): Promise<FeedAuditResult[]> {
  const results = await Promise.all(
    NEWS_REGIONS.flatMap((region) =>
      NEWS_CATEGORIES.flatMap((category) =>
        FEED_CONFIG[region][category].map((source) =>
          probeFeed(region, category, source)
        )
      )
    )
  )

  const { error } = await db.from("provider_audits").insert(
    results.map((r) => ({
      region: r.region,
      category: r.category,
      provider: r.provider,
      feed_url: r.feedUrl,
      ok: r.ok,
      article_count: r.articleCount,
      error: r.error,
    }))
  )
  if (error) throw new Error(error.message)

  return results
}
