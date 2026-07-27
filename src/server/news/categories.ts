import type { NewsCategory } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

// Search query fed to the Real-Time News Data /search endpoint per
// region+category. TW queries use Chinese terms since the API matches
// against article text in the article's own language.
export const CATEGORY_QUERIES: Record<NewsRegion, Record<NewsCategory, string>> = {
  us: {
    ai: "artificial intelligence",
    finance: "finance markets economy",
    politics: "politics government",
    international: "international world news",
    technology: "technology",
  },
  tw: {
    ai: "人工智慧",
    finance: "財經 股市",
    politics: "政治 政府",
    international: "國際新聞",
    technology: "科技",
  },
}
