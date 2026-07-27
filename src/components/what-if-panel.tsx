import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti"
import { stringsFor } from "@/lib/i18n"
import { monoLabelClass, type NewsRegion } from "@/lib/region"
import { cn } from "@/lib/utils"
import { runScenario } from "@/server/fns/prediction"

type Maker = { id: string; name: string; mbti: MbtiType }
type ScenarioResult = Awaited<ReturnType<typeof runScenario>>

export function WhatIfPanel({
  eventId,
  makers,
  region,
  onBranchCreated,
}: {
  eventId: string
  makers: Maker[]
  region: NewsRegion
  onBranchCreated: (result: ScenarioResult) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Record<string, MbtiType>>(() =>
    Object.fromEntries(makers.map((m) => [m.id, m.mbti])),
  )
  const t = stringsFor(region)

  const changed = makers.filter((m) => selected[m.id] !== m.mbti)

  function handleReset() {
    setSelected(Object.fromEntries(makers.map((m) => [m.id, m.mbti])))
  }

  async function handleRerun() {
    if (changed.length === 0) return
    setLoading(true)
    try {
      const label = changed.map((m) => `${m.name} → ${selected[m.id]}`).join("\n")
      const overrides = Object.fromEntries(changed.map((m) => [m.id, selected[m.id]]))
      const result = await runScenario({ data: { eventId, label, overrides } })
      onBranchCreated(result)
      toast.success(t.branchFiledToast)
      setOpen(false)
    } catch {
      toast.error(t.rerunFailedToast)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("font-mono text-xs font-bold", monoLabelClass(region))}
          />
        }
      >
        {t.whatIf}
      </PopoverTrigger>
      <PopoverContent className="rounded-none">
        <p className={cn("mb-2 font-mono text-[10px] text-muted-foreground", monoLabelClass(region))}>
          {t.swapAny}
        </p>
        <div className="flex flex-col gap-2">
          {makers.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-serif text-xs text-foreground">{m.name}</span>
              <select
                value={selected[m.id]}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [m.id]: e.target.value as MbtiType }))
                }
                className="shrink-0 border border-border bg-background px-1.5 py-1 font-mono text-[11px] uppercase focus-visible:border-foreground focus-visible:outline-none"
              >
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={loading || changed.length === 0}
          >
            {t.reset}
          </Button>
          <Button
            className="flex-1"
            size="sm"
            onClick={handleRerun}
            disabled={loading || changed.length === 0}
          >
            {loading ? t.rerunning : changed.length === 0 ? t.changeAtLeastOne : t.runIt(changed.length)}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
