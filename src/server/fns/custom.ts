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
// same as any wire story. Upserting on the events unique key makes a repeat
// analysis of the same link (same day, same edition) reuse its row.
export const analyzeCustomLink = createServerFn({ method: "POST" })
  .validator(AnalyzeInput)
  .handler(async ({ data }) => {
    const preview = await fetchLinkPreview(data.url)
    const { data: event, error } = await getDb()
      .from("events")
      .upsert(
        {
          category: "custom",
          region: data.region,
          headline: preview.title,
          source_name: preview.siteName,
          source_url: preview.url,
          published_at: preview.publishedAt ?? new Date().toISOString(),
          summary: preview.description,
          cache_date: cacheDateFor(data.region),
        },
        { onConflict: "region,category,source_url,cache_date" }
      )
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    return { eventId: event.id }
  })
