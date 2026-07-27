import { Link } from "@tanstack/react-router"
import { useLayoutEffect, useRef, useState } from "react"
import { NEWS_CATEGORIES, CATEGORY_LABELS, type NewsCategory } from "@/lib/mbti"
import { monoLabelClass, type NewsRegion } from "@/lib/region"
import { cn } from "@/lib/utils"

export function CategoryTabs({ active, region }: { active: NewsCategory; region: NewsRegion }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<NewsCategory, HTMLAnchorElement | null>>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number; top: number } | null>(
    null,
  )

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false

    const measure = () => {
      if (cancelled) return
      const el = tabRefs.current[active]
      if (!el) return
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      setIndicator({
        left: elRect.left - containerRect.left,
        width: elRect.width,
        top: elRect.bottom - containerRect.top,
      })
    }

    measure()

    // font-mono (Courier Prime / Noto Sans TC) loads async — if the first
    // paint measures tab widths before it swaps in, the indicator locks
    // onto stale fallback-font coordinates.
    document.fonts?.ready.then(measure)

    // Anything that reflows the tab row (wrap toggling on/off, a sibling
    // like the Refresh button changing width, viewport resize) has to
    // trigger a remeasure too — a single measure() at mount/active-change
    // goes stale the moment layout shifts afterward.
    const observer = new ResizeObserver(measure)
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [active, region])

  return (
    <nav
      ref={containerRef}
      aria-label="Section"
      className="relative flex flex-wrap gap-x-5 gap-y-1 border-b border-border"
    >
      {indicator && (
        <div
          className="absolute h-0.5 bg-wire-red transition-[left,width,top] duration-200 ease-[var(--ease-out-strong)]"
          style={{ left: indicator.left, width: indicator.width, top: indicator.top }}
        />
      )}
      {NEWS_CATEGORIES.map((c) => (
        <Link
          key={c}
          ref={(node) => {
            tabRefs.current[c] = node
          }}
          to="/"
          search={(prev) => ({ ...prev, category: c, region: prev.region ?? region })}
          className={cn(
            "relative z-10 pb-2 font-mono text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            monoLabelClass(region),
            active === c ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {CATEGORY_LABELS[region][c]}
        </Link>
      ))}
    </nav>
  )
}
