import { MbtiFigurine } from "@/components/mbti-figurine"
import { MBTI_TYPES, mbtiFamily, type MbtiFamily } from "@/lib/mbti"
import { MBTI_DESCRIPTIONS } from "@/lib/mbti-descriptions"
import { functionsFor } from "@/lib/mbti-functions"
import { stringsFor } from "@/lib/i18n"
import type { NewsRegion } from "@/lib/region"
import { cn } from "@/lib/utils"

const ROLE_ABBR = { dominant: "Dom", auxiliary: "Aux", tertiary: "Ter", inferior: "Inf" } as const

const FAMILY_TEXT: Record<MbtiFamily, string> = {
  analyst: "text-mbti-analyst",
  diplomat: "text-mbti-diplomat",
  sentinel: "text-mbti-sentinel",
  explorer: "text-mbti-explorer",
}

const FAMILY_BORDER: Record<MbtiFamily, string> = {
  analyst: "border-mbti-analyst/40",
  diplomat: "border-mbti-diplomat/40",
  sentinel: "border-mbti-sentinel/40",
  explorer: "border-mbti-explorer/40",
}

const FAMILIES: MbtiFamily[] = ["analyst", "diplomat", "sentinel", "explorer"]

export function MbtiCodex({ region }: { region: NewsRegion }) {
  const t = stringsFor(region)
  const descriptions = MBTI_DESCRIPTIONS[region]

  const FAMILY_LABEL: Record<MbtiFamily, string> = {
    analyst: t.familyAnalysts,
    diplomat: t.familyDiplomats,
    sentinel: t.familySentinels,
    explorer: t.familyExplorers,
  }
  const ROLE_LABEL = {
    dominant: t.roleDominant,
    auxiliary: t.roleAuxiliary,
    tertiary: t.roleTertiary,
    inferior: t.roleInferior,
  } as const

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {FAMILIES.map((family) => (
        <div key={family}>
          <p className={cn("mb-2 font-display text-base font-bold", FAMILY_TEXT[family])}>
            {FAMILY_LABEL[family]}
          </p>
          <div className="flex flex-col gap-2">
            {MBTI_TYPES.filter((t) => mbtiFamily(t) === family).map((type) => {
              const info = descriptions[type]
              return (
                <div
                  key={type}
                  className={cn("flex items-start gap-3 border p-2", FAMILY_BORDER[family])}
                >
                  <MbtiFigurine type={type} size={56} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xs font-bold">{type}</span>
                      <span className="font-display text-sm font-bold text-foreground">
                        {info.title}
                      </span>
                    </p>
                    <p className="font-mono text-[10px] tracking-wide text-muted-foreground">
                      {functionsFor(type, region).map((f, i) => (
                        <span key={f.role}>
                          {i > 0 && " · "}
                          <span
                            title={`${f.code} · ${ROLE_LABEL[f.role]}: ${f.name}`}
                            className="cursor-help underline decoration-dotted underline-offset-2"
                          >
                            {f.code} ({ROLE_ABBR[f.role]})
                          </span>
                        </span>
                      ))}
                    </p>
                    <p className="mt-1 font-serif text-xs text-muted-foreground">{info.blurb}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
