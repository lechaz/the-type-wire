import { createServerFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { fetchLinkPreview } from "@/server/news/link-preview"
import {
  NEWS_REGIONS,
  REGION_COOKIE,
  TAB_COOKIE,
  cacheDateFor,
} from "@/lib/region"

// The reader's last edition + tab, as written by the masthead.
export const getLastTab = createServerFn({ method: "GET" }).handler(() => ({
  region: getCookie(REGION_COOKIE) === "tw" ? "tw" : "us",
  custom: getCookie(TAB_COOKIE) === "custom",
}))

const PreviewInput = z.object({ url: z.string().url().max(2048) })

export const previewCustomLink = createServerFn({ method: "POST" })
  .validator(PreviewInput)
  .handler(({ data }) => fetchLinkPreview(data.url))

const AnalyzeInput = PreviewInput.extend({ region: z.enum(NEWS_REGIONS) })

// Re-scrapes server-side rather than trusting the client's preview — the
// resulting event page is public, so a client-supplied headline would let
// anyone file arbitrary text under the wire's masthead. Only creates the
// row; the event page's own loader runs ingest + prediction on first view,
// same as any wire story. A repeat analysis of the same link (same day, same
// edition) reuses the existing row untouched — overwriting it would replace
// the already-generated summary with the page's raw, source-language
// description, and ingest won't rerun to fix it (the roster already exists).
export const analyzeCustomLink = createServerFn({ method: "POST" })
  .validator(AnalyzeInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const cacheDate = cacheDateFor(data.region)
    const findEvent = async (sourceUrl: string) => {
      const { data: rows, error } = await db
        .from("events")
        .select("id")
        .eq("category", "custom")
        .eq("region", data.region)
        .eq("source_url", sourceUrl)
        .eq("cache_date", cacheDate)
        .limit(1)
      if (error) throw new Error(error.message)
      return rows[0]?.id
    }

    const existing = await findEvent(data.url)
    if (existing) return { eventId: existing }

    const preview = await fetchLinkPreview(data.url)
    const { error } = await db.from("events").upsert(
      {
        category: "custom",
        region: data.region,
        headline: preview.title,
        source_name: preview.siteName,
        source_url: preview.url,
        published_at: preview.publishedAt ?? new Date().toISOString(),
        summary: preview.description,
        cache_date: cacheDate,
      },
      {
        onConflict: "region,category,source_url,cache_date",
        ignoreDuplicates: true,
      }
    )
    if (error) throw new Error(error.message)
    const eventId = await findEvent(preview.url)
    if (!eventId) throw new Error("Filed story row not found")
    return { eventId }
  })
