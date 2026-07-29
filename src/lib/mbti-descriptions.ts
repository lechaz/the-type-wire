import type { MbtiType } from "@/lib/mbti"
import type { NewsRegion } from "@/lib/region"

type Description = { title: string; blurb: string }

const en: Record<MbtiType, Description> = {
  INTJ: {
    title: "The Architect",
    blurb: "Strategic, independent, plans three moves ahead.",
  },
  INTP: {
    title: "The Logician",
    blurb: "Curious theorist, chases ideas to their root.",
  },
  ENTJ: {
    title: "The Commander",
    blurb: "Decisive leader, builds systems out of ambition.",
  },
  ENTP: {
    title: "The Debater",
    blurb: "Quick-witted, argues any side to test the truth.",
  },
  INFJ: {
    title: "The Advocate",
    blurb: "Idealistic and insightful, plays the long game.",
  },
  INFP: {
    title: "The Mediator",
    blurb: "Values-driven dreamer, seeks meaning over rules.",
  },
  ENFJ: {
    title: "The Protagonist",
    blurb: "Charismatic mobilizer, leads by inspiring others.",
  },
  ENFP: {
    title: "The Campaigner",
    blurb: "Enthusiastic connector, sees possibility everywhere.",
  },
  ISTJ: {
    title: "The Logistician",
    blurb: "Methodical and dutiful, trusts what's proven.",
  },
  ISFJ: {
    title: "The Defender",
    blurb: "Quietly protective, loyal to people and process.",
  },
  ESTJ: {
    title: "The Executive",
    blurb: "Organized enforcer, gets things done by the book.",
  },
  ESFJ: {
    title: "The Consul",
    blurb: "Sociable caretaker, keeps the group in harmony.",
  },
  ISTP: {
    title: "The Virtuoso",
    blurb: "Pragmatic tinkerer, acts fast under pressure.",
  },
  ISFP: {
    title: "The Adventurer",
    blurb: "Gentle improviser, follows instinct over plans.",
  },
  ESTP: {
    title: "The Entrepreneur",
    blurb: "Bold dealmaker, thrives on immediate risk.",
  },
  ESFP: {
    title: "The Entertainer",
    blurb: "Spontaneous performer, reads the room instantly.",
  },
}

const zhHant: Record<MbtiType, Description> = {
  INTJ: { title: "建築師", blurb: "策略獨立，總是預先算好三步棋。" },
  INTP: { title: "邏輯學家", blurb: "好奇的理論家，追根究柢直到本質。" },
  ENTJ: { title: "指揮官", blurb: "果斷的領導者，用野心搭建體制。" },
  ENTP: { title: "辯論家", blurb: "反應敏捷，任何立場都能拿來檢驗真理。" },
  INFJ: { title: "提倡者", blurb: "理想而洞察，下的是長遠的棋。" },
  INFP: { title: "調停者", blurb: "價值驅動的夢想家，追求意義勝過規則。" },
  ENFJ: { title: "主人公", blurb: "魅力型的動員者，以鼓舞領導眾人。" },
  ENFP: { title: "競選者", blurb: "熱情的連結者，處處看見可能性。" },
  ISTJ: { title: "物流師", blurb: "有條理又盡責，只信任被證實的事。" },
  ISFJ: { title: "護衛者", blurb: "默默守護，忠於人與流程。" },
  ESTJ: { title: "總經理", blurb: "有組織的執行者，照規矩把事情做完。" },
  ESFJ: { title: "執政官", blurb: "善於社交的照顧者，維繫團體和諧。" },
  ISTP: { title: "鑑賞家", blurb: "務實的修補匠，壓力下反應迅速。" },
  ISFP: { title: "探險家", blurb: "溫和的即興者，跟著直覺而非計畫走。" },
  ESTP: { title: "企業家", blurb: "大膽的談判者，樂於承擔眼前風險。" },
  ESFP: { title: "表演者", blurb: "即興的表演者，瞬間就能讀懂全場氣氛。" },
}

export const MBTI_DESCRIPTIONS: Record<
  NewsRegion,
  Record<MbtiType, Description>
> = {
  us: en,
  tw: zhHant,
}
