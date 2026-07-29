import { useMatches } from "@tanstack/react-router"
import type { NewsCategory } from "./mbti"
import { pickRegionFromMatches } from "./region"
import type { NewsRegion } from "./region"

type EventLoaderData = {
  detail?: { event?: { category?: NewsCategory; region?: NewsRegion } }
}

export function useCurrentRegion(): NewsRegion {
  const matches = useMatches()
  return pickRegionFromMatches(matches)
}

// Non-null only when the current route is an event detail page — used by
// the masthead to decide whether to show a "back to the wire" link at all.
export function useEventRouteData() {
  const matches = useMatches()
  const eventMatch = matches.find((m) => m.routeId === "/event/$eventId/")
  const event = (eventMatch?.loaderData as EventLoaderData | undefined)?.detail
    ?.event
  if (!event?.region || !event.category) return null
  return { category: event.category, region: event.region }
}
