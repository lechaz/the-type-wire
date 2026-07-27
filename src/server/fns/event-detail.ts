import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDb } from "@/server/db"
import { generateStructured } from "@/server/gemini/client"
import { ingestJsonSchema, IngestResultSchema } from "@/server/gemini/schemas"
import { resolveCanonicalMbti } from "@/server/gemini/mbti-consistency"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

const GetEventDetailInput = z.object({
  eventId: z.string().uuid(),
})

function ingestPrompt(headline: string, sourceName: string, snippet: string, region: NewsRegion) {
  const { promptLanguage } = REGION_CONFIG[region]
  return [
    "You are analyzing a news event to identify its key real-world decision makers",
    "and assign each a Myers-Briggs (MBTI) personality type based on their well-known,",
    "publicly documented behavior and communication style.",
    "",
    `Headline: ${headline}`,
    `Source: ${sourceName}`,
    `Snippet: ${snippet || "(none provided)"}`,
    "",
    "Identify 2-5 named real people who are the key decision makers driving this",
    "event. For each, assign an MBTI type with a short reasoning grounded in their",
    "actual public behavior (not the news snippet alone), plus a 0-100 confidence.",
    "Also write a neutral 1-2 sentence summary of the event itself.",
    ...(promptLanguage ? ["", `Write every generated text field in ${promptLanguage}.`] : []),
  ].join("\n")
}

export const getEventDetail = createServerFn({ method: "GET" })
  .validator(GetEventDetailInput)
  .handler(async ({ data }) => {
    const db = getDb()

    const { data: event, error: eventError } = await db
      .from("events")
      .select("id, category, region, headline, source_name, source_url, published_at, summary")
      .eq("id", data.eventId)
      .single()

    if (eventError || !event) throw new Error(eventError?.message ?? "Event not found")

    const { data: existingMakers, error: makersError } = await db
      .from("decision_makers")
      .select("id, name, role, mbti, reasoning, confidence, sort_order")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true })

    if (makersError) throw new Error(makersError.message)
    // A single row here means it's just the landing-page primary-maker seed
    // (see getEvents) — expand to the full 2-5 roster instead of treating
    // it as already ingested.
    if (existingMakers && existingMakers.length > 1) {
      return { event, decisionMakers: existingMakers }
    }
    // Capture the landing-page seed's type before it's cleared below — its
    // row is about to be deleted, so it won't show up in the canonical
    // lookup after Gemini runs, but the primary maker's already-established
    // type still needs to carry forward into the full roster.
    const priorSeed =
      existingMakers && existingMakers.length === 1
        ? { name: existingMakers[0].name.trim(), mbti: existingMakers[0].mbti }
        : null

    if (priorSeed) {
      const { error: deleteError } = await db
        .from("decision_makers")
        .delete()
        .eq("event_id", event.id)
      if (deleteError) throw new Error(deleteError.message)
    }

    const ingest = await generateStructured({
      prompt: ingestPrompt(event.headline, event.source_name, event.summary, event.region),
      schema: ingestJsonSchema(event.region),
      parse: (raw) => IngestResultSchema.parse(raw),
    })

    const { error: updateError } = await db
      .from("events")
      .update({ summary: ingest.event_summary })
      .eq("id", event.id)

    if (updateError) throw new Error(updateError.message)

    // Same reasoning as events.ts's triage step: reuse whatever MBTI this
    // app already settled on for a given name instead of trusting each
    // independent Gemini call to agree with itself.
    const canonicalMbti = await resolveCanonicalMbti(
      db,
      ingest.decision_makers.map((m) => ({ name: m.name, mbti: m.mbti })),
    )
    if (priorSeed && !canonicalMbti.has(priorSeed.name)) {
      canonicalMbti.set(priorSeed.name, priorSeed.mbti)
    }

    const makerRows = ingest.decision_makers.map((m, i) => {
      const name = m.name.trim()
      return {
        event_id: event.id,
        name,
        role: m.role,
        mbti: canonicalMbti.get(name) ?? m.mbti,
        reasoning: m.reasoning,
        confidence: m.confidence,
        sort_order: i,
      }
    })

    const { data: insertedMakers, error: insertError } = await db
      .from("decision_makers")
      .insert(makerRows)
      .select("id, name, role, mbti, reasoning, confidence, sort_order")

    if (insertError) throw new Error(insertError.message)

    return {
      event: { ...event, summary: ingest.event_summary },
      decisionMakers: insertedMakers ?? [],
    }
  })
