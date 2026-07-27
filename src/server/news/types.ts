import { z } from "zod"

// Verified against a live /search response (2026-07-25) — see plan Phase 1 probe.
export const NewsArticleSchema = z.object({
  article_id: z.string(),
  title: z.string(),
  link: z.string(),
  snippet: z.string().nullable(),
  photo_url: z.string().nullable().optional(),
  published_datetime_utc: z.string(),
  authors: z.array(z.string()).optional().default([]),
  source_url: z.string(),
  source_name: z.string(),
})

export type NewsArticle = z.infer<typeof NewsArticleSchema>

export const NewsSearchResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  data: z.array(NewsArticleSchema),
})
