import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { getEventDetail, EVENT_NOT_FOUND } from "@/server/fns/event-detail"
import type { runScenario } from "@/server/fns/prediction"
import { getPrediction } from "@/server/fns/prediction"
import { DecisionMakerCard } from "@/components/decision-maker-card"
import { PredictionTimeline } from "@/components/prediction-timeline"
import { WhatIfPanel } from "@/components/what-if-panel"
import { CATEGORY_LABELS } from "@/lib/mbti"
import { monoLabelClass } from "@/lib/region"
import { stringsFor } from "@/lib/i18n"
import { buildMetaTags } from "@/lib/site-meta"
import { cn } from "@/lib/utils"

const DEFAULT_BRANCH_COLOR = "#c21725"

export const Route = createFileRoute("/event/$eventId/")({
  loader: async ({ params }) => {
    let detail: Awaited<ReturnType<typeof getEventDetail>>
    try {
      detail = await getEventDetail({ data: { eventId: params.eventId } })
    } catch (err) {
      // A later refresh's re-triage can legitimately drop a story that used
      // to be on the wire, cascade-deleting its row — someone sitting on
      // this event's detail page hits a dead id on their next reload. Route
      // that to the not-found page instead of an unhandled loader crash.
      if (err instanceof Error && err.message === EVENT_NOT_FOUND)
        throw notFound()
      throw err
    }
    const prediction = await getPrediction({
      data: { eventId: params.eventId },
    })
    return { detail, prediction }
  },
  // Defined on this route (not aggregated at root) so it's tied to this
  // route's own loaderData — the framework re-runs a route's head() when
  // that same route's loader resolves, which is what makes the <title>
  // actually update on client-side navigation instead of staying frozen on
  // the previous page's until a hard refresh.
  head: (ctx) => ({
    meta: buildMetaTags({
      pageTitle: ctx.loaderData?.detail.event.headline ?? null,
      description: ctx.loaderData?.detail.event.summary ?? "",
    }),
  }),
  notFoundComponent: EventNotFound,
  component: EventPage,
})

function EventNotFound() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-14 text-center">
      <p className="font-mono text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        Story no longer on file
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        This dispatch has been pulled from the wire
      </h1>
      <p className="mx-auto mt-2 max-w-[50ch] font-serif text-sm text-muted-foreground">
        A later edition dropped it from today's coverage. It may still turn up
        in a future refresh, or it may be gone for good.
      </p>
      <Link
        to="/"
        search={{ category: "ai", region: "us" }}
        className="mt-4 inline-block font-mono text-xs font-bold text-foreground underline underline-offset-4 hover:text-wire-red"
      >
        ← Back to the wire
      </Link>
    </main>
  )
}

type ScenarioResult = Awaited<ReturnType<typeof runScenario>>

function EventPage() {
  const { detail, prediction } = Route.useLoaderData()
  const { eventId } = Route.useParams()
  const { event, decisionMakers } = detail
  const region = event.region
  const t = stringsFor(region)
  const [branches, setBranches] = useState<ScenarioResult[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  const makers = decisionMakers.map((m) => ({
    id: m.id,
    name: m.name,
    mbti: m.mbti,
  }))

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [branches.length])

  useEffect(() => {
    // Desktop already shows enough branches at once that a new one lands
    // in view without help. Below the `sm` breakpoint the row shows one
    // card at a time, so a newly run what-if would otherwise append off
    // to the right, invisible until the reader thinks to swipe.
    if (branches.length === 0 || window.innerWidth >= 640) return
    const last = scrollRef.current?.lastElementChild as
      HTMLElement | null | undefined
    last?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    })
  }, [branches.length])

  function handleScrollPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.button !== 0 || !overflowing) return
    const startX = e.clientX
    const startScrollLeft = el.scrollLeft
    let moved = false

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > 3) {
        moved = true
        setDragging(true)
      }
      if (moved) el!.scrollLeft = startScrollLeft - dx
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setDragging(false)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-14">
      <p
        className={cn(
          "font-mono text-[11px] font-bold text-muted-foreground",
          monoLabelClass(region)
        )}
      >
        {CATEGORY_LABELS[region][event.category]} {t.desk}
      </p>
      <h1 className="mt-1 font-display text-2xl leading-tight font-bold text-foreground sm:text-3xl">
        {event.headline}
      </h1>
      <p className="mt-2 max-w-[65ch] font-serif text-sm text-muted-foreground">
        {event.summary}
      </p>
      <a
        href={event.source_url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {event.source_name} ↗
      </a>

      <section
        aria-labelledby="byline-heading"
        className="mt-8 border border-border"
      >
        <h2
          id="byline-heading"
          className={cn(
            "border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground",
            monoLabelClass(region)
          )}
        >
          {t.byline}
        </h2>
        <div className="px-3">
          {decisionMakers.map((m, i) => (
            <DecisionMakerCard
              key={m.id}
              name={m.name}
              role={m.role}
              mbti={m.mbti}
              reasoning={m.reasoning}
              confidence={m.confidence}
              index={i}
              region={region}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="forecast-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="forecast-heading"
            className="font-display text-xl font-bold text-foreground"
          >
            {t.forecastHeading}
          </h2>
          <WhatIfPanel
            eventId={eventId}
            makers={makers}
            region={region}
            onBranchCreated={(result) =>
              setBranches((prev) => [...prev, result])
            }
          />
        </div>

        {/* Default + what-if branches sit side by side as equal-weight peers —
            color tells them apart, not indentation. Scrolls horizontally only
            once branches actually accumulate past what the viewport fits. */}
        <div
          ref={scrollRef}
          onPointerDown={handleScrollPointerDown}
          className={cn(
            "mt-4 flex items-start gap-6 overflow-x-auto pb-2",
            overflowing && "cursor-grab select-none [&_*]:cursor-grab",
            dragging && "cursor-grabbing [&_*]:cursor-grabbing"
          )}
        >
          <div className="w-[22rem] shrink-0">
            <PredictionTimeline
              label={t.defaultForecast}
              branchColor={DEFAULT_BRANCH_COLOR}
              overallConfidence={prediction.prediction.overall_confidence}
              reasoningSummary={prediction.prediction.reasoning_summary}
              nodes={prediction.nodes}
              region={region}
            />
          </div>

          {branches.map((b) => (
            <div key={b.scenario.id} className="w-[22rem] shrink-0">
              <PredictionTimeline
                label={b.scenario.label}
                branchColor={b.scenario.branch_color}
                overallConfidence={b.prediction.overall_confidence}
                reasoningSummary={b.prediction.reasoning_summary}
                nodes={b.nodes}
                region={region}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
