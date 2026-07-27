import { z } from "zod"

// Currents API /v1/search response shape (currentsapi.services).
const CurrentsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  author: z.string(),
  image: z.string().nullable(),
  language: z.string(),
  category: z.array(z.string()).optional().default([]),
  published: z.string(),
})

export const NewsSearchResponseSchema = z.object({
  status: z.string(),
  news: z.array(CurrentsArticleSchema),
})

// Normalized shape the rest of the app consumes, decoupled from the
// upstream provider's field names so a future provider swap stays local
// to client.ts's mapping instead of rippling through every caller.
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
