import type { getDb } from "@/server/db"
import type { MbtiTypeRow } from "@/server/db-types"
import type { NewsRegion } from "@/lib/region"

// A named individual's MBTI is meant to read as a stable personality read,
// not a fresh coin-flip every time their name comes up in a new story —
// each triage/ingest call independently asks Gemini to assign one, and
// LLM output isn't perfectly deterministic, so the same real person can get
// a different type from one article to the next. Look up whether this app
// has already assigned this person a type before (scoped to region, since
// the same person's name is written in a different language per region)
// and reuse the earliest assignment instead of letting a fresh guess win.
export async function resolveCanonicalMbti(
  db: ReturnType<typeof getDb>,
  region: NewsRegion,
  candidates: { name: string; mbti: MbtiTypeRow }[],
): Promise<Map<string, MbtiTypeRow>> {
  const names = [...new Set(candidates.map((c) => c.name.trim()).filter(Boolean))]
  if (names.length === 0) return new Map()

  const { data: nameMatches, error: nameError } = await db
    .from("decision_makers")
    .select("event_id, name, mbti, created_at")
    .in("name", names)
    .order("created_at", { ascending: true })
  if (nameError) throw new Error(nameError.message)
  if (!nameMatches || nameMatches.length === 0) return new Map()

  const eventIds = [...new Set(nameMatches.map((m) => m.event_id))]
  const { data: eventsForIds, error: eventsError } = await db
    .from("events")
    .select("id, region")
    .in("id", eventIds)
  if (eventsError) throw new Error(eventsError.message)

  const regionByEventId = new Map((eventsForIds ?? []).map((e) => [e.id, e.region]))
  const canonical = new Map<string, MbtiTypeRow>()
  for (const m of nameMatches) {
    if (regionByEventId.get(m.event_id) !== region) continue
    if (!canonical.has(m.name)) canonical.set(m.name, m.mbti)
  }
  return canonical
}
