import { z } from "zod"
import { MBTI_TYPES } from "@/lib/mbti"
import { REGION_CONFIG, type NewsRegion } from "@/lib/region"

// Gemini reads both the natural-language prompt AND each JSON-schema
// property `description` as instructions — a language directive added to
// only one side gets fought by the other (see triagePrompt in events.ts,
// which learned this the hard way with strictness wording). Every builder
// below appends the same directive to both.
function languageSuffix(region: NewsRegion): string {
  const { promptLanguage } = REGION_CONFIG[region]
  return promptLanguage ? ` Write this field in ${promptLanguage}.` : ""
}

// Without a calibration rubric, confidence scores cluster tightly around a
// "safe" default (observed: ~85 on nearly every item) instead of actually
// tracking how well-evidenced the call is. Spelling out what each band means
// forces real differentiation.
const CONFIDENCE_RUBRIC =
  "0-100 confidence, calibrated against the strength of the evidence: " +
  "under 40 for a single thin data point or mostly inferred from role alone; " +
  "40-70 for a plausible read with some ambiguity or a limited public record; " +
  "70-90 for multiple consistent, well-documented behavioral signals; " +
  "90+ only for an extensively documented, textbook-clear pattern. Most real " +
  "calls should NOT land in the 80-90 band — use the full range."

// ============================================================
// Call 0 — category triage: drop trivial/no-named-driver stories,
// tag each survivor with its single primary decision maker + MBTI
// so the landing page card list can show it without a per-event
// ingest round trip.
// ============================================================
export function eventTriageJsonSchema(region: NewsRegion) {
  const lang = languageSuffix(region)
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "0-based index into the input list." },
            keep: {
              type: "boolean",
              description:
                "true only if a real named individual is behind it AND it's a genuine, " +
                "consequential decision or move with real stakes. False for routine " +
                "statements, minor personnel notes, generic \"X talks about Y\" coverage, " +
                "opinion pieces, investment-tip listicles, and roundups, even if a named " +
                "individual is technically mentioned. An empty result is a legitimate " +
                "outcome; do not keep a weak item just to avoid one.",
            },
            primary_maker_name: { type: "string", description: `Their real name.${lang}` },
            primary_maker_role: { type: "string", description: `Their role in this story.${lang}` },
            mbti: { type: "string", enum: MBTI_TYPES as unknown as string[] },
            confidence: { type: "integer", minimum: 0, maximum: 100, description: CONFIDENCE_RUBRIC },
            title_trim_at: {
              type: "integer",
              description:
                "Character count to keep from the START of this item's title, dropping " +
                "ONLY trailing site chrome scraped along with it — a site/section name " +
                "suffix like \" | Section | Site Name\" or \" - Category\". Set this to the " +
                "title's full character length (i.e. no trim) unless it clearly has such " +
                "chrome tacked on. This is a cut point, not a rewrite: never reword, " +
                "translate, or paraphrase any part of the title, and never trim real " +
                "headline content, only the trailing chrome.",
            },
          },
          required: ["index", "keep"],
        },
      },
    },
    required: ["items"],
  }
}

export const EventTriageResultSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      keep: z.boolean(),
      primary_maker_name: z.string().optional(),
      primary_maker_role: z.string().optional(),
      mbti: z.enum(MBTI_TYPES).optional(),
      confidence: z.number().int().min(0).max(100).optional(),
      title_trim_at: z.number().int().optional(),
    }),
  ),
})

export type EventTriageResult = z.infer<typeof EventTriageResultSchema>

// ============================================================
// Call 1 — event ingest: one-sentence summary + 2-5 decision
// makers, each with an MBTI assignment, reasoning, and confidence.
// Combined into a single Gemini call since both facets are
// consumed together and share the same source context.
// ============================================================
export function ingestJsonSchema(region: NewsRegion) {
  const lang = languageSuffix(region)
  return {
    type: "object",
    properties: {
      event_summary: {
        type: "string",
        description: `1-2 sentence neutral summary of the news event.${lang}`,
      },
      decision_makers: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string", description: `Their role in this event.${lang}` },
            mbti: { type: "string", enum: MBTI_TYPES as unknown as string[] },
            reasoning: {
              type: "string",
              description: `1-2 sentences grounding the MBTI call in public behavior.${lang}`,
            },
            confidence: { type: "integer", minimum: 0, maximum: 100, description: CONFIDENCE_RUBRIC },
          },
          required: ["name", "role", "mbti", "reasoning", "confidence"],
        },
      },
    },
    required: ["event_summary", "decision_makers"],
  }
}

export const IngestResultSchema = z.object({
  event_summary: z.string(),
  decision_makers: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        mbti: z.enum(MBTI_TYPES),
        reasoning: z.string(),
        confidence: z.number().int().min(0).max(100),
      }),
    )
    .min(2)
    .max(5),
})

export type IngestResult = z.infer<typeof IngestResultSchema>

// ============================================================
// Call 2 — 30-day predicted timeline. Accepts MBTI overrides so
// the same prompt path serves both the default prediction and
// what-if scenarios.
// ============================================================
export function timelineJsonSchema(region: NewsRegion) {
  const lang = languageSuffix(region)
  return {
    type: "object",
    properties: {
      overall_confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description: CONFIDENCE_RUBRIC,
      },
      reasoning_summary: {
        type: "string",
        description: `1-2 sentence summary of the overall timeline's reasoning.${lang}`,
      },
      nodes: {
        type: "array",
        minItems: 6,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            day_offset: { type: "integer", minimum: 0, maximum: 30 },
            headline: { type: "string", description: `Short headline for this event.${lang}` },
            summary: {
              type: "string",
              description: `1-2 sentence description of the predicted event.${lang}`,
            },
            driver_names: { type: "array", items: { type: "string" } },
            trait_reasoning: {
              type: "string",
              description: `How the drivers' MBTI traits shape this outcome.${lang}`,
            },
            confidence: { type: "integer", minimum: 0, maximum: 100, description: CONFIDENCE_RUBRIC },
          },
          required: [
            "day_offset",
            "headline",
            "summary",
            "driver_names",
            "trait_reasoning",
            "confidence",
          ],
        },
      },
    },
    required: ["overall_confidence", "reasoning_summary", "nodes"],
  }
}

export const TimelineResultSchema = z.object({
  overall_confidence: z.number().int().min(0).max(100),
  reasoning_summary: z.string(),
  nodes: z
    .array(
      z.object({
        day_offset: z.number().int().min(0).max(30),
        headline: z.string(),
        summary: z.string(),
        driver_names: z.array(z.string()),
        trait_reasoning: z.string(),
        confidence: z.number().int().min(0).max(100),
      }),
    )
    .min(6)
    .max(10),
})

export type TimelineResult = z.infer<typeof TimelineResultSchema>
