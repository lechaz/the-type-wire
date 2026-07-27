import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { stringsFor } from "@/lib/i18n"
import { REGION_CONFIG, monoLabelClass, type NewsRegion } from "@/lib/region"
import { cn } from "@/lib/utils"

type Node = {
  id: string
  day_offset: number
  predicted_date: string
  headline: string
  summary: string
  driver_names: string[]
  trait_reasoning: string
  confidence: number
}

export function PredictionTimeline({
  label,
  branchColor,
  overallConfidence,
  reasoningSummary,
  nodes,
  region,
}: {
  label: string
  branchColor: string
  overallConfidence: number
  reasoningSummary: string
  nodes: Node[]
  region: NewsRegion
}) {
  const labelLines = label.split("\n")
  const t = stringsFor(region)
  const locale = REGION_CONFIG[region].locale

  return (
    <div>
      <div className="animate-card-in flex flex-wrap items-start gap-2">
        <span className="mt-1.5 size-2.5 shrink-0" style={{ backgroundColor: branchColor }} />
        <div className="flex min-w-0 flex-col">
          {labelLines.map((line, i) => (
            <span
              key={i}
              className="font-display text-base leading-tight font-bold text-foreground"
            >
              {line}
            </span>
          ))}
        </div>
        <span className="mt-1 font-mono text-[11px] text-muted-foreground">
          {overallConfidence}% {t.confidenceSuffix}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="mt-1 font-mono text-[10px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none"
              />
            }
          >
            {t.why}
          </TooltipTrigger>
          <TooltipContent className="max-w-64 rounded-none" sideOffset={6}>
            {reasoningSummary}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* A vertical spine, not a horizontal scroller — every node is on-page
          at every width via the page's own scroll, nothing nested. Dots sit
          on the spine at a fixed offset from each node's own left edge, so
          alignment can't drift the way a flex-stretch row's could. First node
          sits directly under the header row (no paragraph in between) so it
          reads as a continuation of "Default forecast," not a separate block. */}
      <div className="relative mt-2 flex flex-col gap-5 pl-7">
        <div
          className="absolute top-[7px] bottom-[7px] left-[6px] w-0.5"
          style={{ backgroundColor: `${branchColor}55` }}
          aria-hidden
        />
        {nodes.map((n, i) => (
          <Tooltip key={n.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="animate-card-in relative block w-full text-left focus-visible:outline-none"
                />
              }
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className="absolute top-1 -left-7 block size-3.5 border-2 border-background"
                style={{ backgroundColor: branchColor }}
                aria-hidden
              />
              <span
                className={cn(
                  "font-mono text-[10px] text-muted-foreground",
                  monoLabelClass(region),
                )}
              >
                {t.day(n.day_offset)} ·{" "}
                {new Date(n.predicted_date).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="mt-0.5 block text-balance font-display text-sm leading-snug font-bold text-foreground">
                {n.headline}
              </span>
              <span className="mt-0.5 block text-pretty font-serif text-xs text-muted-foreground">
                {n.summary}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 rounded-none" sideOffset={6}>
              <span className="font-mono">{n.driver_names.join(", ")}:</span> {n.trait_reasoning}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
