import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDb } from "@/server/db"
import { fetchTopArticles } from "@/server/news/client"
import { generateStructured } from "@/server/gemini/client"
import { eventTriageJsonSchema, EventTriageResultSchema } from "@/server/gemini/schemas"
import { resolveCanonicalMbti } from "@/server/gemini/mbti-consistency"
import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/mbti"
import { NEWS_REGIONS, REGION_CONFIG, cacheDateFor, type NewsRegion } from "@/lib/region"
import type { NewsArticle } from "@/server/news/types"
import type { MbtiTypeRow } from "@/server/db-types"

const GetEventsInput = z.object({
  category: z.enum(NEWS_CATEGORIES),
  region: z.enum(NEWS_REGIONS),
  forceRefresh: z.boolean().optional().default(false),
})

// A single status instead of separate unavailable/noNewUpdates booleans —
// those could disagree with each other (e.g. a genuine live-fetch failure
// with an existing older cache set unavailable:false and noNewUpdates:false,
// so it looked identical to a normal successful load; the refresh toast
// couldn't tell "nothing changed" from "the fetch actually failed" either).
// "ok": fresh cache hit, or a live fetch/triage that kept something new.
// "no_new": a live check ran with no error, but had nothing new to add —
//   cached content (today's or an older fallback) is shown as-is.
// "degraded": the live fetch/triage genuinely threw; cached content (if
//   any) is shown as a fallback. Combined with an empty events array, "ok"
//   and "no_new" both mean a legitimately quiet desk; "degraded" means the
//   feed itself is down.
export type EventsStatus = "ok" | "no_new" | "degraded"

// What each desk actually covers, as opposed to what its search query's
// keywords coincidentally match — e.g. a domestic tourism story that hits a
// target of "國際旅客" (international visitors) contains the international
// query's keyword but isn't international/foreign-affairs news at all. The
// search step can't tell the difference; triage is where a topical read
// actually happens, so it needs to be told what desk it's curating for.
const CATEGORY_FIT: Record<NewsCategory, string> = {
  ai: "Centers on artificial intelligence itself — an AI company, product, " +
    "policy, or research development — not a story that merely name-drops AI.",
  finance: "Centers on markets, monetary policy, or corporate finance — not a " +
    "story that just mentions a dollar figure or company name in passing.",
  politics: "Centers on domestic governance, elections, or policy-making — not " +
    "a foreign-affairs story (that's International) and not a human-interest " +
    "piece that merely involves a politician.",
  international: "Centers on cross-border affairs — foreign governments, " +
    "diplomacy, global conflicts, world events. Not a domestic story that " +
    "merely uses \"international\" as a scale descriptor — e.g. a domestic " +
    "tourism target, a local event with international guests, a company's " +
    "\"global\" branding.",
  technology: "Centers on a tech product, company, research, or industry " +
    "development — not a story that merely name-drops a tech term.",
}

function triagePrompt(articles: NewsArticle[], category: NewsCategory, region: NewsRegion) {
  const list = articles
    .map((a, i) => `${i}. "${a.title}" (${a.source_name})${a.snippet ? ` — ${a.snippet}` : ""}`)
    .join("\n")
  const { promptLanguage, label: editionLabel } = REGION_CONFIG[region]
  const languageLine = promptLanguage
    ? [`Write every generated text field (name, role) in ${promptLanguage}.`, ""]
    : []

  const criteria = [
    `It actually belongs on the ${category.toUpperCase()} desk: ${CATEGORY_FIT[category]}`,
    "A real, named individual is identifiably behind it — a sitting executive, " +
      "founder, official, or other public figure (not an anonymous source, not " +
      '"analysts say", not a company as an abstraction with nobody named).',
    "The story is a genuine, consequential decision or move — one that " +
      "plausibly shapes what happens next for the organization, market, or " +
      "public discourse, and gives real material for a 30-day forecast. The " +
      "individual doesn't need to be world-famous and the outcome doesn't need " +
      "to be historic, but it does need real stakes: a strategic pivot, a policy " +
      "move, a contested decision, a shakeup, a high-stakes bet.",
  ]
  // This edition's outlets routinely carry wire-service pickups of foreign
  // news (AFP/Reuters stories translated or republished verbatim) — those
  // aren't this edition's own reporting and don't belong on a desk that
  // isn't International, even though the outlet running them is local.
  // Skip this bar for the International desk itself, where foreign-affairs
  // coverage is exactly the point.
  if (category !== "international") {
    criteria.push(
      `It's substantively about ${editionLabel} — not a wire-service pickup of ` +
        `foreign news that a ${editionLabel} outlet merely carried or translated ` +
        "(that belongs on the International desk, not here).",
    )
  }

  return [
    `This is the ${editionLabel} edition. This list was pulled by keyword search`,
    `for the ${category.toUpperCase()} desk, so it will contain stories that only`,
    "coincidentally match the keyword. Keep an item only if it clears ALL of these:",
    ...criteria.map((c, i) => `${i + 1}. ${c}`),
    "",
    "Reject: routine statements or interviews with no real decision in them,",
    "minor personnel notes, generic \"X talks about Y\" coverage, opinion pieces,",
    "investment-tip listicles, roundups, and how-to content — even if a named",
    "individual is technically mentioned.",
    "",
    "Illustrative examples (not from the actual list below, just calibrating the bar):",
    '- KEEP: "Central bank chief cuts rates in surprise break with board consensus"',
    "  — a named official making a real, consequential call.",
    '- REJECT: "Central bank chief says economy remains strong in year-end interview"',
    "  — same kind of figure, but no actual decision, just a routine remark.",
    '- REJECT: "World leaders react to earthquake abroad" run by a local outlet under a',
    "  wire byline — a real event, but it's foreign news passing through a local outlet,",
    "  not this edition's own story.",
    '- KEEP: "Mayor abruptly fires police chief after leaked memo surfaces"',
    "  — genuinely local, genuinely consequential, a named figure at the center.",
    "",
    "This list is drawn from a wide pool, so an empty result is a completely",
    "legitimate outcome on a slow news day. Do not keep a weak item just to",
    "avoid returning an empty list — only keep what genuinely clears every bar above.",
    "",
    "For each item you KEEP, name its single primary decision maker or influencer,",
    "their role, and assign an MBTI type with a 0-100 confidence, grounded in",
    "their real public behavior.",
    "",
    "Some titles below were scraped straight from a page's raw <title> tag and carry",
    "trailing site chrome (a site/section name tacked on with \" | \" or \" - \"). Set",
    "title_trim_at to cut that off — a character count from the start of the title,",
    "not replacement text. This can only shorten the title, never reword any part of",
    "it; set it to the title's full length when there's no chrome to drop.",
    "",
    ...languageLine,
    list,
  ].join("\n")
}

// Trims trailing site chrome (e.g. GDELT's raw scraped <title> tags carrying
// " | Section | Site Name") off a headline using the triage LLM's own
// judgment of where the real title ends — but only ever as a cut point.
// Slicing the original string can shorten it, never reword, translate, or
// otherwise alter it, so this stays a mechanical trim even though the
// boundary itself came from the model.
//
// The model's character offset is occasionally off by one or two (observed
// live: cutting mid-tag, e.g. leaving a dangling "- 政" instead of "- 政治"
// or the full title). Treat it as a hint, not a literal index — search a
// small window around it for one of the actual chrome separators and cut
// there instead, so a slightly-wrong offset still lands on a clean boundary.
const CHROME_SEPARATORS = [" | ", " - ", "｜", " · "]
const TRIM_HINT_WINDOW = 6

function applyTitleTrim(title: string, trimAtHint: number | undefined): string {
  if (!trimAtHint || trimAtHint <= 0 || trimAtHint >= title.length) return title

  const windowStart = Math.max(0, trimAtHint - TRIM_HINT_WINDOW)
  const windowEnd = Math.min(title.length, trimAtHint + TRIM_HINT_WINDOW)
  const window = title.slice(windowStart, windowEnd)

  let cut = -1
  for (const sep of CHROME_SEPARATORS) {
    const idx = window.indexOf(sep)
    if (idx === -1) continue
    const candidate = windowStart + idx
    if (cut === -1 || Math.abs(candidate - trimAtHint) < Math.abs(cut - trimAtHint)) cut = candidate
  }

  const trimmed = (cut !== -1 ? title.slice(0, cut) : title.slice(0, trimAtHint)).trim()
  return trimmed.length >= 6 ? trimmed : title
}

async function loadCachedEvents(
  db: ReturnType<typeof getDb>,
  category: NewsCategory,
  region: NewsRegion,
  cacheDate?: string,
) {
  let query = db
    .from("events")
    .select("id, category, region, headline, source_name, source_url, published_at, summary, cache_date")
    .eq("category", category)
    .eq("region", region)
  if (cacheDate) query = query.eq("cache_date", cacheDate)

  const { data: events, error } = await query
    .order("cache_date", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(5)
  if (error) throw new Error(error.message)
  if (!events || events.length === 0) return []

  const ids = events.map((e) => e.id)
  const { data: makers, error: makersError } = await db
    .from("decision_makers")
    .select("event_id, name, mbti, sort_order")
    .in("event_id", ids)
    .order("sort_order", { ascending: true })
  if (makersError) throw new Error(makersError.message)

  const primaryByEvent = new Map<string, { name: string; mbti: MbtiTypeRow }>()
  for (const m of makers ?? []) {
    if (!primaryByEvent.has(m.event_id)) {
      primaryByEvent.set(m.event_id, { name: m.name, mbti: m.mbti })
    }
  }

  return events.map((e) => ({ ...e, primaryMaker: primaryByEvent.get(e.id) ?? null }))
}

export const getEvents = createServerFn({ method: "GET" })
  .validator(GetEventsInput)
  .handler(async ({ data }) => {
    const { category, region, forceRefresh } = data
    const db = getDb()
    const cacheDate = cacheDateFor(region)

    if (!forceRefresh) {
      const cached = await loadCachedEvents(db, category, region, cacheDate)
      if (cached.length > 0) return { events: cached, status: "ok" as const }
    }

    try {
      const articles = await fetchTopArticles(category, region)

      const kept = articles.length
        ? (
            await generateStructured({
              prompt: triagePrompt(articles, category, region),
              schema: eventTriageJsonSchema(region),
              parse: (raw) => EventTriageResultSchema.parse(raw),
            })
          ).items.filter((t) => t.keep && t.primary_maker_name && t.mbti && articles[t.index])
        : []

      // An empty kept set means either the fetch itself came back dry (a
      // thin news day, or the provider hiccuped) or triage rejected
      // everything on offer — either way there's no fresh signal to act on.
      // Leave the existing cache untouched and tell the caller nothing new
      // came in, instead of wiping today's rows and showing an empty page
      // where cached articles used to be.
      if (kept.length === 0) {
        const fallback = await loadCachedEvents(db, category, region)
        return { events: fallback, status: "no_new" as const }
      }

      if (forceRefresh) {
        // Re-triage can legitimately drop items a previous run kept (e.g.
        // after tightening the prompt). Clear only those dropped rows —
        // decision_makers/predictions/etc. cascade-delete with the event row
        // — so a dropped item can't linger just because it was never
        // removed. Deliberately scoped to rows NOT in the fresh kept set
        // (rather than wiping everything for this category+region+day) so a
        // story that survives re-triage unchanged keeps its existing row and
        // `id` — the upsert below updates it in place via onConflict instead
        // of deleting and recreating it, which would otherwise churn its
        // React key and flash the card out and back in on every refresh.
        // Also deliberately done AFTER the fetch/triage succeed, not before,
        // so a live-fetch failure can't wipe out a working cache.
        const keptUrls = kept.map((t) => articles[t.index].link)
        const urlList = keptUrls.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(",")
        const { error: clearError } = await db
          .from("events")
          .delete()
          .eq("category", category)
          .eq("region", region)
          .eq("cache_date", cacheDate)
          .not("source_url", "in", `(${urlList})`)
        if (clearError) throw new Error(clearError.message)
      }

      const rows = kept.map((t) => {
        const a = articles[t.index]
        return {
          category,
          region,
          headline: applyTitleTrim(a.title, t.title_trim_at),
          source_name: a.source_name,
          source_url: a.link,
          published_at: a.published_datetime_utc,
          summary: a.snippet ?? "",
          cache_date: cacheDate,
        }
      })

      const { data: upserted, error: upsertError } = await db
        .from("events")
        .upsert(rows, { onConflict: "region,category,source_url,cache_date" })
        .select("id, category, region, headline, source_name, source_url, published_at, summary, cache_date")
      if (upsertError) throw new Error(upsertError.message)

      const eventIds = (upserted ?? []).map((e) => e.id)
      const { data: existingMakers, error: existingError } = await db
        .from("decision_makers")
        .select("event_id")
        .in("event_id", eventIds)
      if (existingError) throw new Error(existingError.message)
      const alreadySeeded = new Set((existingMakers ?? []).map((m) => m.event_id))

      // Match triage results back to their upserted row by source_url — upsert
      // return order is not guaranteed to match input order.
      const triageByUrl = new Map(kept.map((t) => [articles[t.index].link, t]))

      // A person's MBTI should read as a stable personality call, not a
      // fresh guess every time their name comes up in a new story — reuse
      // whatever this app already assigned them (see mbti-consistency.ts)
      // instead of trusting each independent triage call to agree with
      // itself.
      const canonicalMbti = await resolveCanonicalMbti(
        db,
        kept
          .filter((t) => t.primary_maker_name && t.mbti)
          .map((t) => ({ name: t.primary_maker_name!, mbti: t.mbti! })),
      )

      const seedRows = (upserted ?? [])
        .filter((event) => !alreadySeeded.has(event.id))
        .map((event) => {
          const t = triageByUrl.get(event.source_url)
          if (!t) return null
          const name = t.primary_maker_name!.trim()
          return {
            event_id: event.id,
            name,
            role: t.primary_maker_role ?? "Key decision maker",
            mbti: canonicalMbti.get(name) ?? t.mbti!,
            reasoning: "Identified as the primary driver of this story.",
            confidence: t.confidence ?? 60,
            sort_order: 0,
          }
        })
        .filter((row) => row !== null)

      if (seedRows.length > 0) {
        const { error: seedError } = await db.from("decision_makers").insert(seedRows)
        if (seedError) throw new Error(seedError.message)
      }

      return {
        events: await loadCachedEvents(db, category, region, cacheDate),
        status: "ok" as const,
      }
    } catch (err) {
      // News API or Gemini quota/rate-limit hit (or any other live-fetch
      // failure) — degrade to whatever's cached instead of erroring the page.
      // Falls back across cache_date boundaries (not just today's) so a
      // multi-day outage still serves the most recent cached stories. If
      // there's no cache at all for this category+region (e.g. it's never
      // been seeded), surface an "unavailable" empty state instead of
      // throwing a raw error to the page — there's simply nothing to show.
      console.error(`[getEvents] live fetch failed for ${category}/${region}, serving cache:`, err)
      const fallback = await loadCachedEvents(db, category, region)
      return { events: fallback, status: "degraded" as const }
    }
  })
