import { z } from "zod"

// Normalized shape the rest of the app consumes, decoupled from any single
// feed's RSS field quirks so those stay local to client.ts instead of
// rippling through every caller.
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
