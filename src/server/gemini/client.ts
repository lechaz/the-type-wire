import { GoogleGenAI } from "@google/genai"

// Verified working via probe (2026-07-25): interactions.create + response_format
// with an inline JSON schema. See plan Phase 1.
// Switched 2026-07-26 to the flash-lite tier — cheapest per-token cost and
// most generous rate limits in the current model list (probed live against
// /v1beta/models), and triage/prediction here is structured-JSON generation
// from a moderate prompt, not deep reasoning — flash-lite is plenty.
export const GEMINI_MODEL = "gemini-3.5-flash-lite"

let client: GoogleGenAI | null = null

export function getGemini() {
  if (client) return client

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Check .env.local.")
  }

  client = new GoogleGenAI({ apiKey })
  return client
}

export class GeminiStructuredOutputError extends Error {}

async function callOnce<T>(params: {
  prompt: string
  schema: object
  parse: (raw: unknown) => T
}): Promise<T> {
  const ai = getGemini()

  const interaction = await ai.interactions.create({
    model: GEMINI_MODEL,
    input: params.prompt,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: params.schema,
    },
  })

  if (!interaction.output_text) {
    throw new Error("Gemini returned no output_text")
  }
  const raw = JSON.parse(interaction.output_text)
  return params.parse(raw)
}

// One retry on schema-parse failure — a single reprompt recovers the vast
// majority of malformed responses; callers turn a second failure into a
// typed error the UI renders as an Empty state instead of a white screen.
export async function generateStructured<T>(params: {
  prompt: string
  schema: object
  parse: (raw: unknown) => T
}): Promise<T> {
  try {
    return await callOnce(params)
  } catch (err) {
    try {
      return await callOnce(params)
    } catch (retryErr) {
      throw new GeminiStructuredOutputError(
        `Gemini structured output failed twice: ${String(retryErr ?? err)}`
      )
    }
  }
}
