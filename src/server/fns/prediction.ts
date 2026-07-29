import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDb } from "@/server/db"
import { generateStructured } from "@/server/gemini/client"
import {
  timelineJsonSchema,
  TimelineResultSchema,
} from "@/server/gemini/schemas"
import type { TimelineResult } from "@/server/gemini/schemas"
import { MBTI_TYPES, mbtiFamily } from "@/lib/mbti"
import { REGION_CONFIG } from "@/lib/region"
import type { NewsRegion } from "@/lib/region"

// Wire Red (#C21725) is reserved for the default timeline (see
// DEFAULT_BRANCH_COLOR in the timeline route) — a what-if branch is colored
// by the ink tone of the personality family it substitutes in, so the color
// carries meaning instead of cycling through an arbitrary palette.
const FAMILY_INK: Record<string, string> = {
  analyst: "#2d457d",
  diplomat: "#2b6339",
  sentinel: "#565f65",
  explorer: "#b0540e",
}

type DecisionMaker = {
  id: string
  name: string
  role: string
  mbti: string
}

async function loadEventAndMakers(
  db: ReturnType<typeof getDb>,
  eventId: string
) {
  // Both queries key off eventId directly (not off each other's result), so
  // they run as one round trip instead of two sequential ones.
  const [
    { data: event, error: eventError },
    { data: makers, error: makersError },
  ] = await Promise.all([
    db
      .from("events")
      .select("id, headline, summary, region")
      .eq("id", eventId)
      .single(),
    db
      .from("decision_makers")
      .select("id, name, role, mbti")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ])
  if (eventError) throw new Error(eventError.message)
  if (makersError) throw new Error(makersError.message)
  if (makers.length === 0) {
    throw new Error(
      "Decision makers not found — open the event detail view first."
    )
  }

  return { event, makers: makers as DecisionMaker[] }
}

function timelinePrompt(params: {
  headline: string
  summary: string
  makers: DecisionMaker[]
  effectiveMbti: Map<string, string>
  region: NewsRegion
}) {
  const roster = params.makers
    .map(
      (m) =>
        `- ${m.name} (${m.role}): ${params.effectiveMbti.get(m.id) ?? m.mbti}`
    )
    .join("\n")
  const { promptLanguage } = REGION_CONFIG[params.region]

  return [
    "You are forecasting a plausible 30-day timeline of follow-on events for a",
    "news story, driven by the personality traits of its key decision makers.",
    "",
    `Event: ${params.headline}`,
    `Summary: ${params.summary}`,
    "",
    "Decision makers and their MBTI types (use these types exactly, even if they",
    "differ from the person's real known type — this may be a hypothetical):",
    roster,
    "",
    "Generate 6-10 timeline nodes spanning day 0 to day 30. Each node's",
    "trait_reasoning must explicitly connect a driver's MBTI traits (e.g. Ti, Fe,",
    "Ne) to the predicted action. Provide an overall_confidence and a short",
    "reasoning_summary for the whole timeline.",
    ...(promptLanguage
      ? ["", `Write every generated text field in ${promptLanguage}.`]
      : []),
  ].join("\n")
}

async function insertTimeline(params: {
  db: ReturnType<typeof getDb>
  eventId: string
  isDefault: boolean
  timeline: TimelineResult
}) {
  const { db, eventId, isDefault, timeline } = params

  const { data: prediction, error: predictionError } = await db
    .from("predictions")
    .insert({
      event_id: eventId,
      is_default: isDefault,
      overall_confidence: timeline.overall_confidence,
      reasoning_summary: timeline.reasoning_summary,
    })
    .select(
      "id, event_id, is_default, overall_confidence, reasoning_summary, created_at"
    )
    .single()

  if (predictionError) throw new Error(predictionError.message)

  const today = new Date()
  const nodeRows = timeline.nodes
    .sort((a, b) => a.day_offset - b.day_offset)
    .map((n, i) => {
      const predictedDate = new Date(today)
      predictedDate.setUTCDate(predictedDate.getUTCDate() + n.day_offset)
      return {
        prediction_id: prediction.id,
        day_offset: n.day_offset,
        predicted_date: predictedDate.toISOString().slice(0, 10),
        headline: n.headline,
        summary: n.summary,
        driver_names: n.driver_names,
        trait_reasoning: n.trait_reasoning,
        confidence: n.confidence,
        sort_order: i,
      }
    })

  const { data: nodes, error: nodesError } = await db
    .from("prediction_nodes")
    .insert(nodeRows)
    .select(
      "id, day_offset, predicted_date, headline, summary, driver_names, trait_reasoning, confidence, sort_order"
    )

  if (nodesError) throw new Error(nodesError.message)

  return { prediction, nodes }
}

const GetPredictionInput = z.object({ eventId: z.string().uuid() })

export const getPrediction = createServerFn({ method: "GET" })
  .validator(GetPredictionInput)
  .handler(async ({ data }) => {
    const db = getDb()

    const { data: existing, error: existingError } = await db
      .from("predictions")
      .select(
        "id, event_id, is_default, overall_confidence, reasoning_summary, created_at"
      )
      .eq("event_id", data.eventId)
      .eq("is_default", true)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)

    if (existing) {
      const { data: nodes, error: nodesError } = await db
        .from("prediction_nodes")
        .select(
          "id, day_offset, predicted_date, headline, summary, driver_names, trait_reasoning, confidence, sort_order"
        )
        .eq("prediction_id", existing.id)
        .order("sort_order", { ascending: true })
      if (nodesError) throw new Error(nodesError.message)
      return { prediction: existing, nodes }
    }

    const { event, makers } = await loadEventAndMakers(db, data.eventId)
    const effectiveMbti = new Map(makers.map((m) => [m.id, m.mbti]))

    const timeline = await generateStructured({
      prompt: timelinePrompt({
        headline: event.headline,
        summary: event.summary,
        makers,
        effectiveMbti,
        region: event.region,
      }),
      schema: timelineJsonSchema(event.region),
      parse: (raw) => TimelineResultSchema.parse(raw),
    })

    return insertTimeline({
      db,
      eventId: data.eventId,
      isDefault: true,
      timeline,
    })
  })

const RunScenarioInput = z.object({
  eventId: z.string().uuid(),
  label: z.string().min(1),
  overrides: z.record(z.string().uuid(), z.enum(MBTI_TYPES)),
})

export const runScenario = createServerFn({ method: "POST" })
  .validator(RunScenarioInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const { event, makers } = await loadEventAndMakers(db, data.eventId)
    const effectiveMbti = new Map<string, string>(
      makers.map((m) => [m.id, data.overrides[m.id] ?? m.mbti])
    )

    const timeline = await generateStructured({
      prompt: timelinePrompt({
        headline: event.headline,
        summary: event.summary,
        makers,
        effectiveMbti,
        region: event.region,
      }),
      schema: timelineJsonSchema(event.region),
      parse: (raw) => TimelineResultSchema.parse(raw),
    })

    const { prediction, nodes } = await insertTimeline({
      db,
      eventId: data.eventId,
      isDefault: false,
      timeline,
    })

    const [firstOverrideMbti] = Object.values(data.overrides)
    const branchColor = firstOverrideMbti
      ? (FAMILY_INK[mbtiFamily(firstOverrideMbti)] ?? "#565f65")
      : "#565f65"

    const { data: scenario, error: scenarioError } = await db
      .from("scenarios")
      .insert({
        event_id: data.eventId,
        user_id: null,
        label: data.label,
        overrides: data.overrides,
        prediction_id: prediction.id,
        branch_color: branchColor,
      })
      .select(
        "id, event_id, label, overrides, prediction_id, branch_color, created_at"
      )
      .single()

    if (scenarioError) throw new Error(scenarioError.message)

    return { scenario, prediction, nodes }
  })
