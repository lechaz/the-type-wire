import { useRouterState } from "@tanstack/react-router"

// Live news/AI calls can take a few seconds; TanStack Router keeps the
// previous route's content on screen while the next one loads, so without
// this a slow navigation looks like a dead click. A thin sweeping bar is
// enough signal without blocking or replacing anything already rendered.
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading })

  if (!isLoading) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent">
      <div className="route-progress-sweep h-full w-2/5 bg-wire-red" />
    </div>
  )
}
