import type { NewsCategory } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

export interface FeedSource {
  url: string
  name: string
}

// Public RSS feeds from reputable outlets, one or more per desk. Verified
// live 2026-09-24: all return RSS 2.0 with same-day pubDates. Currents/
// RapidAPI/GDELT keyword search was replaced with these because free-tier
// API quotas and rate limits made ingestion unreliable and slow — RSS has
// neither.
//
// TW has no dedicated AI outlet/feed, so "ai" reuses the general CNA
// Technology feed — the existing triage prompt's CATEGORY_FIT["ai"] rule
// (events.ts) already rejects non-AI tech stories, so no separate
// classification step is needed here.
export const FEED_CONFIG: Record<
  NewsRegion,
  Record<NewsCategory, FeedSource[]>
> = {
  us: {
    ai: [
      {
        url: "https://techcrunch.com/category/artificial-intelligence/feed/",
        name: "TechCrunch",
      },
    ],
    finance: [
      {
        url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        name: "CNBC",
      },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", name: "BBC" },
    ],
    politics: [
      {
        url: "https://www.cnbc.com/id/10000113/device/rss/rss.html",
        name: "CNBC",
      },
      { url: "https://feeds.bbci.co.uk/news/politics/rss.xml", name: "BBC" },
    ],
    international: [
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC" },
      {
        url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        name: "The New York Times",
      },
    ],
    technology: [
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", name: "BBC" },
      { url: "https://techcrunch.com/feed/", name: "TechCrunch" },
    ],
  },
  tw: {
    ai: [
      { url: "https://feeds.feedburner.com/rsscna/technology", name: "中央社" },
    ],
    finance: [
      { url: "https://feeds.feedburner.com/rsscna/finance", name: "中央社" },
    ],
    politics: [
      { url: "https://feeds.feedburner.com/rsscna/politics", name: "中央社" },
    ],
    international: [
      { url: "https://feeds.feedburner.com/rsscna/intworld", name: "中央社" },
    ],
    technology: [
      { url: "https://feeds.feedburner.com/rsscna/technology", name: "中央社" },
    ],
  },
}
