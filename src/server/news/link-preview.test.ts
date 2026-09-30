import { describe, expect, it } from "vitest"
import {
  detectLanguage,
  isPrivateAddress,
  parseLinkPreview,
  stripTitleChrome,
} from "./link-preview"
import { UNSUPPORTED_LANGUAGE } from "@/lib/region"

describe("stripTitleChrome", () => {
  it("drops site/section chrome seen on real links", () => {
    const cases: [string, string][] = [
      [
        "川習會後「對台政策不變」 美眾議員：軍售旨在嚇阻非挑釁 | ETtoday國際新聞 | ETtoday新聞雲",
        "川習會後「對台政策不變」 美眾議員：軍售旨在嚇阻非挑釁",
      ],
      [
        "工研院「擘畫2023淨零永續關鍵人才論壇」 強化布局淨零人才 | 中華日報|中華新聞雲",
        "工研院「擘畫2023淨零永續關鍵人才論壇」 強化布局淨零人才",
      ],
      [
        "國際公關協會「2020全球公關數位創新論壇」探討產業數位轉型｜廣告雜誌",
        "國際公關協會「2020全球公關數位創新論壇」探討產業數位轉型",
      ],
      [
        "工研院培育產業關鍵策略人才 榮獲2022國家人才發展獎-最新新聞-新聞室-新聞中心-工業技術研究院",
        "工研院培育產業關鍵策略人才 榮獲2022國家人才發展獎",
      ],
      [
        "Fed cuts rates in surprise move - BBC News",
        "Fed cuts rates in surprise move",
      ],
    ]
    for (const [raw, clean] of cases) expect(stripTitleChrome(raw)).toBe(clean)
  })

  it("leaves real headlines alone", () => {
    for (const t of [
      "刘欢63岁去世，金钱治病的上限就是100万",
      "AI-driven chip demand lifts TSMC outlook",
      "Senate passes bill - with a twist from the House minority leader's office",
      "Short - X",
    ])
      expect(stripTitleChrome(t)).toBe(t)
  })
})

describe("parseLinkPreview", () => {
  it("prefers og tags, handles attribute order, entities, relative images", () => {
    const html = `<head><title>Fallback | Site</title>
      <meta content="Chief &amp; Co. cut rates" property="og:title">
      <meta name="description" content='Plain desc'>
      <meta property="og:image" content="/img/a.jpg">
      <meta property="article:published_time" content="2026-09-28T10:00:00Z">
    </head>`
    const p = parseLinkPreview(html, "https://www.example.com/news/1", "en")
    expect(p.title).toBe("Chief & Co. cut rates")
    expect(p.description).toBe("Plain desc")
    expect(p.image).toBe("https://www.example.com/img/a.jpg")
    expect(p.siteName).toBe("example.com")
    expect(p.publishedAt).toBe("2026-09-28T10:00:00.000Z")
  })

  it("falls back to <title> and throws when there's no headline", () => {
    expect(
      parseLinkPreview("<title>只有標題</title>", "https://a.tw/", "zh").title
    ).toBe("只有標題")
    expect(() =>
      parseLinkPreview("<p>nothing</p>", "https://a.tw/", "zh")
    ).toThrow()
  })
})

describe("detectLanguage", () => {
  it("tells English from Chinese, rejects everything else", () => {
    expect(detectLanguage("Fed cuts rates", "en-us")).toBe("en")
    expect(detectLanguage("Fed cuts rates", "")).toBe("en")
    expect(detectLanguage("央行意外降息", "en")).toBe("zh")
    expect(detectLanguage("央行意外降息", "zh-tw")).toBe("zh")
    expect(detectLanguage("日銀が利下げを決定", "ja")).toBe(null)
    expect(detectLanguage("한국은행 금리 인하", "")).toBe(null)
    expect(detectLanguage("ЦБ снизил ставку", "")).toBe(null)
    expect(detectLanguage("La BCE baisse ses taux", "fr")).toBe(null)
  })

  it("blocks at parse time with the sentinel", () => {
    expect(() =>
      parseLinkPreview(
        '<html lang="es"><title>El banco central baja tipos</title>',
        "https://a.es/",
        "en"
      )
    ).toThrow(UNSUPPORTED_LANGUAGE)
  })

  it("only accepts the edition's own language", () => {
    const zh = '<html lang="zh-tw"><title>沈伯洋宣布啟動大洋流計畫</title>'
    const en = '<html lang="en"><title>Fed cuts rates in surprise move</title>'
    expect(parseLinkPreview(zh, "https://a.tw/", "zh").title).toBeTruthy()
    expect(parseLinkPreview(en, "https://a.com/", "en").title).toBeTruthy()
    expect(() => parseLinkPreview(zh, "https://a.tw/", "en")).toThrow(
      UNSUPPORTED_LANGUAGE
    )
    expect(() => parseLinkPreview(en, "https://a.com/", "zh")).toThrow(
      UNSUPPORTED_LANGUAGE
    )
  })
})

describe("isPrivateAddress", () => {
  it("blocks loopback, metadata, private ranges; allows public", () => {
    for (const a of [
      "127.0.0.1",
      "169.254.169.254",
      "10.1.2.3",
      "192.168.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fd00::1",
    ])
      expect(isPrivateAddress(a), a).toBe(true)
    for (const a of ["8.8.8.8", "2606:4700::1111"])
      expect(isPrivateAddress(a), a).toBe(false)
  })
})
