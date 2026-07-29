import { Link } from "@tanstack/react-router"
import { MbtiFigurine } from "@/components/mbti-figurine"
import { CATEGORY_LABELS, mbtiFamily } from "@/lib/mbti"
import type { MbtiType, NewsCategory } from "@/lib/mbti"
import { stringsFor } from "@/lib/i18n"
import { monoLabelClass } from "@/lib/region"
import type { NewsRegion } from "@/lib/region"
import { cn } from "@/lib/utils"

export function EventCard({
  id,
  headline,
  sourceName,
  publishedAt,
  category,
  region,
  primaryMaker,
  index,
}: {
  id: string
  headline: string
  sourceName: string
  publishedAt: string
  category: NewsCategory
  region: NewsRegion
  primaryMaker: { name: string; mbti: MbtiType } | null
  index: number
}) {
  const t = stringsFor(region)

  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: id }}
      className="group animate-card-in block border border-border bg-card p-4 transition-colors duration-160 hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-secondary"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p
        className={cn(
          "font-mono text-[11px] font-bold text-muted-foreground",
          monoLabelClass(region)
        )}
      >
        {CATEGORY_LABELS[region][category]} {t.desk} ·{" "}
        {new Date(publishedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </p>
      <h3 className="mt-1.5 font-display text-lg leading-snug text-foreground">
        {headline}
      </h3>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        {sourceName}
      </p>

      {primaryMaker && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <MbtiFigurine
            type={primaryMaker.mbti}
            size={28}
            className="shrink-0"
          />
          <span className="truncate text-xs text-muted-foreground">
            {primaryMaker.name}
          </span>
          <span
            className="ml-auto shrink-0 font-mono text-xs font-bold"
            style={{
              color: `var(--color-mbti-${mbtiFamily(primaryMaker.mbti)})`,
            }}
          >
            {primaryMaker.mbti}
          </span>
        </div>
      )}
    </Link>
  )
}
