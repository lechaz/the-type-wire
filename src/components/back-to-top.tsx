import { useEffect, useState } from "react"
import { stringsFor } from "@/lib/i18n"
import { useCurrentRegion } from "@/lib/use-current-region"
import { cn } from "@/lib/utils"

const SHOW_AFTER_PX = 480

export function BackToTop() {
  const region = useCurrentRegion()
  const t = stringsFor(region)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label={t.backToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 bottom-14 z-30 flex size-9 items-center justify-center border border-border bg-foreground text-background transition-[opacity,transform] duration-200 ease-[var(--ease-out-strong)] hover:bg-wire-red",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <span aria-hidden className="text-base leading-none">
        ↑
      </span>
    </button>
  )
}
