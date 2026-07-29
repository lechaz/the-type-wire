import { MBTI_TYPES } from "@/lib/mbti"
import type { MbtiType } from "@/lib/mbti"
import { cn } from "@/lib/utils"

export function MbtiFigurine({
  type,
  size = 64,
  className,
}: {
  type: MbtiType
  size?: number
  className?: string
}) {
  return (
    <img
      src={`/avatars/${type}.svg`}
      alt={`${type} illustration`}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  )
}

export { MBTI_TYPES }
