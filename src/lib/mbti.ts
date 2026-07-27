import type { NewsRegion } from "./region"

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const

export type MbtiType = (typeof MBTI_TYPES)[number]

export type MbtiFamily = "analyst" | "diplomat" | "sentinel" | "explorer"

export function mbtiFamily(type: MbtiType): MbtiFamily {
  if (type.includes("NT")) return "analyst"
  if (type.includes("NF")) return "diplomat"
  if (type[1] === "S" && type[3] === "J") return "sentinel"
  return "explorer"
}

export const NEWS_CATEGORIES = [
  "ai",
  "finance",
  "politics",
  "international",
  "technology",
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<NewsRegion, Record<NewsCategory, string>> = {
  us: {
    ai: "AI",
    finance: "Finance",
    politics: "Politics",
    international: "International",
    technology: "Technology",
  },
  tw: {
    ai: "AI",
    finance: "財經",
    politics: "政治",
    international: "國際",
    technology: "科技",
  },
}
