import type { MbtiType } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

export type FunctionCode = "Ni" | "Ne" | "Si" | "Se" | "Ti" | "Te" | "Fi" | "Fe"
export type FunctionRole = "dominant" | "auxiliary" | "tertiary" | "inferior"

export const FUNCTION_ROLES: FunctionRole[] = [
  "dominant",
  "auxiliary",
  "tertiary",
  "inferior",
]

export const FUNCTION_NAMES: Record<
  NewsRegion,
  Record<FunctionCode, string>
> = {
  us: {
    Ni: "Introverted Intuition",
    Ne: "Extraverted Intuition",
    Si: "Introverted Sensing",
    Se: "Extraverted Sensing",
    Ti: "Introverted Thinking",
    Te: "Extraverted Thinking",
    Fi: "Introverted Feeling",
    Fe: "Extraverted Feeling",
  },
  tw: {
    Ni: "內傾直覺",
    Ne: "外傾直覺",
    Si: "內傾實感",
    Se: "外傾實感",
    Ti: "內傾思考",
    Te: "外傾思考",
    Fi: "內傾情感",
    Fe: "外傾情感",
  },
}

// The dominant->inferior cognitive-function stack per type — the same
// shorthand (Te, Ni, Se...) Gemini's prediction reasoning cites in
// trait_reasoning, so this doubles as the glossary behind it.
export const FUNCTION_STACK: Record<
  MbtiType,
  Record<FunctionRole, FunctionCode>
> = {
  INTJ: { dominant: "Ni", auxiliary: "Te", tertiary: "Fi", inferior: "Se" },
  INTP: { dominant: "Ti", auxiliary: "Ne", tertiary: "Si", inferior: "Fe" },
  ENTJ: { dominant: "Te", auxiliary: "Ni", tertiary: "Se", inferior: "Fi" },
  ENTP: { dominant: "Ne", auxiliary: "Ti", tertiary: "Fe", inferior: "Si" },
  INFJ: { dominant: "Ni", auxiliary: "Fe", tertiary: "Ti", inferior: "Se" },
  INFP: { dominant: "Fi", auxiliary: "Ne", tertiary: "Si", inferior: "Te" },
  ENFJ: { dominant: "Fe", auxiliary: "Ni", tertiary: "Se", inferior: "Ti" },
  ENFP: { dominant: "Ne", auxiliary: "Fi", tertiary: "Te", inferior: "Si" },
  ISTJ: { dominant: "Si", auxiliary: "Te", tertiary: "Fi", inferior: "Ne" },
  ISFJ: { dominant: "Si", auxiliary: "Fe", tertiary: "Ti", inferior: "Ne" },
  ESTJ: { dominant: "Te", auxiliary: "Si", tertiary: "Ne", inferior: "Fi" },
  ESFJ: { dominant: "Fe", auxiliary: "Si", tertiary: "Ne", inferior: "Ti" },
  ISTP: { dominant: "Ti", auxiliary: "Se", tertiary: "Ni", inferior: "Fe" },
  ISFP: { dominant: "Fi", auxiliary: "Se", tertiary: "Ni", inferior: "Te" },
  ESTP: { dominant: "Se", auxiliary: "Ti", tertiary: "Fe", inferior: "Ni" },
  ESFP: { dominant: "Se", auxiliary: "Fi", tertiary: "Te", inferior: "Ni" },
}

export function functionsFor(type: MbtiType, region: NewsRegion) {
  const stack = FUNCTION_STACK[type]
  return FUNCTION_ROLES.map((role) => ({
    role,
    code: stack[role],
    name: FUNCTION_NAMES[region][stack[role]],
  }))
}

// Reverse lookup: every type that carries a given function in a given role
// (or any role, when `role` is omitted) — e.g. "who has Te dominant".
export function typesWithFunction(
  code: FunctionCode,
  role?: FunctionRole
): MbtiType[] {
  return (Object.keys(FUNCTION_STACK) as MbtiType[]).filter((type) => {
    const stack = FUNCTION_STACK[type]
    return role ? stack[role] === code : Object.values(stack).includes(code)
  })
}
