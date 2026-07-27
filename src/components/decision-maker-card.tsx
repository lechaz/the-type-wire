import { MbtiFigurine } from "@/components/mbti-figurine"
import { mbtiFamily, type MbtiType } from "@/lib/mbti"
import { stringsFor } from "@/lib/i18n"
import type { NewsRegion } from "@/lib/region"

function SignalMeter({ confidence, suffix }: { confidence: number; suffix: string }) {
  const filled = Math.round(confidence / 20)
  return (
    <div
      className="flex shrink-0 items-end gap-0.5"
      role="img"
      aria-label={`${confidence}% ${suffix}`}
      title={`${confidence}% ${suffix}`}
    >
      {[1, 2, 3, 4, 5].map((bar) => (
        <span
          key={bar}
          className="w-1 bg-current"
          style={{
            height: `${bar * 3}px`,
            opacity: bar <= filled ? 1 : 0.2,
          }}
        />
      ))}
    </div>
  )
}

export function DecisionMakerCard({
  name,
  role,
  mbti,
  reasoning,
  confidence,
  index,
  region,
}: {
  name: string
  role: string
  mbti: MbtiType
  reasoning: string
  confidence: number
  index: number
  region: NewsRegion
}) {
  const family = mbtiFamily(mbti)
  const t = stringsFor(region)

  return (
    <details
      className="animate-card-in group border-b border-border py-2.5 last:border-b-0 open:pb-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <summary className="-mx-2 flex cursor-pointer list-none items-center gap-3 rounded-none px-2 py-0.5 transition-colors hover:bg-foreground/[0.04]">
        <MbtiFigurine type={mbti} size={40} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-sm font-semibold text-foreground">
            {name}
          </span>
          <span className="block truncate font-mono text-[10px] text-muted-foreground uppercase">
            {role}
          </span>
        </span>
        <span
          className="font-mono text-xs font-bold"
          style={{ color: `var(--color-mbti-${family})` }}
        >
          {mbti}
        </span>
        <span style={{ color: `var(--color-mbti-${family})` }}>
          <SignalMeter confidence={confidence} suffix={t.confidenceSuffix} />
        </span>
      </summary>
      <p className="mt-2 pl-[52px] font-serif text-sm text-muted-foreground">{reasoning}</p>
    </details>
  )
}
