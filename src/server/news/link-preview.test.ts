import { describe, expect, it } from "vitest"
import {
  isEnglishOrChinese,
  isPrivateAddress,
  parseLinkPreview,
} from "./link-preview"
import { UNSUPPORTED_LANGUAGE } from "@/lib/region"

describe("parseLinkPreview", () => {
  it("prefers og tags, handles attribute order, entities, relative images", () => {
    const html = `<head><title>Fallback | Site</title>
      <meta content="Chief &amp; Co. cut rates" property="og:title">
      <meta name="description" content='Plain desc'>
      <meta property="og:image" content="/img/a.jpg">
      <meta property="article:published_time" content="2026-09-28T10:00:00Z">
    </head>`
    const p = parseLinkPreview(html, "https://www.example.com/news/1")
    expect(p.title).toBe("Chief & Co. cut rates")
    expect(p.description).toBe("Plain desc")
    expect(p.image).toBe("https://www.example.com/img/a.jpg")
    expect(p.siteName).toBe("example.com")
    expect(p.publishedAt).toBe("2026-09-28T10:00:00.000Z")
  })

  it("falls back to <title> and throws when there's no headline", () => {
    expect(
      parseLinkPreview("<title>只有標題</title>", "https://a.tw/").title
    ).toBe("只有標題")
    expect(() => parseLinkPreview("<p>nothing</p>", "https://a.tw/")).toThrow()
  })
})

describe("isEnglishOrChinese", () => {
  it("allows English and Chinese, blocks everything else", () => {
    expect(isEnglishOrChinese("Fed cuts rates", "en-us")).toBe(true)
    expect(isEnglishOrChinese("Fed cuts rates", "")).toBe(true)
    expect(isEnglishOrChinese("央行意外降息", "en")).toBe(true)
    expect(isEnglishOrChinese("央行意外降息", "zh-tw")).toBe(true)
    expect(isEnglishOrChinese("日銀が利下げを決定", "ja")).toBe(false)
    expect(isEnglishOrChinese("한국은행 금리 인하", "")).toBe(false)
    expect(isEnglishOrChinese("ЦБ снизил ставку", "")).toBe(false)
    expect(isEnglishOrChinese("La BCE baisse ses taux", "fr")).toBe(false)
  })

  it("blocks at parse time with the sentinel", () => {
    expect(() =>
      parseLinkPreview(
        '<html lang="es"><title>El banco central baja tipos</title>',
        "https://a.es/"
      )
    ).toThrow(UNSUPPORTED_LANGUAGE)
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
