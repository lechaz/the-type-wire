import type { getDb } from "@/server/db"
import type { MbtiTypeRow } from "@/server/db-types"

// A named individual's MBTI is meant to read as a stable personality read,
// not a fresh coin-flip every time their name comes up in a new story —
// each triage/ingest call independently asks Gemini to assign one, and LLM
// output isn't perfectly deterministic, so the same real person can get a
// different type from one article to the next. Look up whether this app has
// already assigned this person a type before and reuse the earliest
// assignment instead of letting a fresh guess win.
//
// Matched globally by exact name string, not scoped to region — well-known
// figures (heads of state, tech executives) commonly get named in English
// regardless of which region's story it is (verified live: Gemini wrote
// "Donald Trump" in a Traditional Chinese TW article), so a region-scoped
// lookup missed exactly the cross-region collisions it needs to catch.
export async function resolveCanonicalMbti(
  db: ReturnType<typeof getDb>,
  candidates: { name: string; mbti: MbtiTypeRow }[],
): Promise<Map<string, MbtiTypeRow>> {
  const names = [...new Set(candidates.map((c) => c.name.trim()).filter(Boolean))]
  if (names.length === 0) return new Map()

  const { data: nameMatches, error: nameError } = await db
    .from("decision_makers")
    .select("name, mbti, created_at")
    .in("name", names)
    .order("created_at", { ascending: true })
  if (nameError) throw new Error(nameError.message)

  const canonical = new Map<string, MbtiTypeRow>()
  for (const m of nameMatches ?? []) {
    if (!canonical.has(m.name)) canonical.set(m.name, m.mbti)
  }
  return canonical
}
