import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MbtiCodex } from "@/components/mbti-codex"
import { stringsFor } from "@/lib/i18n"
import { monoLabelClass } from "@/lib/region"
import { useCurrentRegion } from "@/lib/use-current-region"
import { cn } from "@/lib/utils"

export function LegendDrawer() {
  const region = useCurrentRegion()
  const t = stringsFor(region)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className={cn(
              "fixed inset-x-0 bottom-0 z-40 bg-wire-red py-2 text-center font-mono text-xs font-bold text-wire-red-foreground transition-colors hover:bg-foreground",
              monoLabelClass(region),
            )}
          />
        }
      >
        {t.legendTrigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-none border-t-2">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{t.legendTitle}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <MbtiCodex region={region} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
