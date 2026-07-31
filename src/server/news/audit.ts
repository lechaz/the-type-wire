import { NEWS_CATEGORIES } from "@/lib/mbti"
import type { NewsCategory } from "@/lib/mbti"
import { NEWS_REGIONS } from "@/lib/region"
import type { NewsRegion } from "@/lib/region"
import { CATEGORY_QUERIES } from "./categories"
import { ALL_PROVIDERS, fetchFromProvider } from "./client"
import type { NewsProvider } from "./client"
import type { getDb } from "@/server/db"

type Db = ReturnType<typeof getDb>

function dayOfYear(now: Date): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  return Math.floor((now.getTime() - start) / 86_400_000)
}

// Rotate which category gets probed so a full week of daily runs
// eventually exercises all five — probing only "ai" every time would never
// catch a provider bug specific to another category's query (e.g. GDELT's
// gdeltSafeQuery in client.ts strips short Latin tokens and silently
// zeroed the TW technology query "科技 AI").
function probeCategory(now: Date): NewsCategory {
  return NEWS_CATEGORIES[dayOfYear(now) % NEWS_CATEGORIES.length]
}

export interface ProviderAuditResult {
  region: NewsRegion
  provider: NewsProvider
  ok: boolean
  articleCount: number
  error: string | null
}

async function probeProvider(
  provider: NewsProvider,
  category: NewsCategory,
  region: NewsRegion
): Promise<ProviderAuditResult> {
  const query = CATEGORY_QUERIES[region][category]
  try {
    const articles = await fetchFromProvider(provider, query, region)
    return {
      region,
      provider,
      ok: true,
      articleCount: articles.length,
      error: null,
    }
  } catch (err) {
    return {
      region,
      provider,
      ok: false,
      articleCount: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// Providers run concurrently — each has its own module-level throttle gate
// in client.ts, so probing all three doesn't hammer any one of them. That
// throttle is module-scoped, not distributed, so it only protects against
// concurrent calls within one lambda instance: a manual curl of the audit
// route racing the scheduled run (or two warm instances) can still trip
// GDELT's rate limit, and this audit would then record a 429 it caused
// itself. Not worth a lock for a diagnostic endpoint — it's part of why
// the health rule in client.ts tolerates a single bad probe (a 2-day
// window) instead of reacting to one.
export async function auditProviders(
  db: Db,
  now = new Date()
): Promise<ProviderAuditResult[]> {
  const category = probeCategory(now)

  const results = await Promise.all(
    NEWS_REGIONS.flatMap((region) =>
      ALL_PROVIDERS.map((provider) =>
        probeProvider(provider, category, region)
      )
    )
  )

  const { error } = await db.from("provider_audits").insert(
    results.map((r) => ({
      region: r.region,
      provider: r.provider,
      ok: r.ok,
      article_count: r.articleCount,
      error: r.error,
    }))
  )
  if (error) throw new Error(error.message)

  return results
}
