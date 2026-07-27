import type { NewsCategory } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

// Search query fed to the Currents API /search endpoint per region+category.
// TW queries use Chinese terms since the API matches against article text
// in the article's own language.
export const CATEGORY_QUERIES: Record<NewsRegion, Record<NewsCategory, string>> = {
  us: {
    ai: "artificial intelligence",
    finance: "finance markets economy",
    politics: "politics government",
    international: "international world news",
    technology: "technology",
  },
  // Currents' CJK "keywords" matching is inconsistent for multi-word
  // space-joined queries — some pairs return a full pool ("科技 AI"),
  // others return zero regardless of retries ("財經 股市", "政治 政府",
  // verified live 2026-07-26). Single common terms reliably return a full
  // pool, so those stay single-term; "科技" alone returns plenty of
  // results but almost none are actually about technology (verified: 2/20
  // passed the relevance filter), and "科技 AI" tested far better (7/12).
  tw: {
    ai: "人工智慧",
    finance: "財經",
    politics: "政治",
    international: "國際",
    technology: "科技 AI",
  },
}
