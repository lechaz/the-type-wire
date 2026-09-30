import { lookup } from "node:dns/promises"
import { BlockList, isIP } from "node:net"
import { UNSUPPORTED_LANGUAGE } from "@/lib/region"
import type { ContentLanguage } from "@/lib/region"

const FETCH_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
// Everything a link card needs lives in <head>; stop reading well before a
// huge article body finishes streaming in.
const MAX_BYTES = 512 * 1024

const USER_AGENT =
  "Mozilla/5.0 (compatible; TheTypeWire/1.0; +https://the-type-wire.vercel.app)"

export type LinkPreview = {
  url: string
  title: string
  description: string
  image: string | null
  siteName: string
  publishedAt: string | null
}

// A user-supplied URL is fetched server-side, so it must not be able to
// reach loopback, cloud metadata (169.254.169.254), or private networks.
const PRIVATE = new BlockList()
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv4")
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv6")

export function isPrivateAddress(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return PRIVATE.check(mapped[1], "ipv4")
  const family = isIP(address)
  if (family === 0) return true
  return PRIVATE.check(address, family === 4 ? "ipv4" : "ipv6")
}

// ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the
// resolved IP via a custom undici dispatcher if that ever matters here.
async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Only http(s) links are supported")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address)
  if (addresses.length === 0 || addresses.some(isPrivateAddress))
    throw new Error("That link points somewhere this wire can't reach")
}

async function readHead(res: Response): Promise<string> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let html = ""
  let bytes = 0
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    html += decoder.decode(value, { stream: true })
    if (/<\/head>/i.test(html)) break
  }
  await reader.cancel().catch(() => {})
  return html
}

// Redirects are followed by hand so every hop gets the same private-address
// check as the original URL.
async function fetchHtml(raw: string): Promise<{ url: string; html: string }> {
  let url = new URL(raw)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url)
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url)
      continue
    }
    if (!res.ok) throw new Error(`The page answered ${res.status}`)
    return { url: url.toString(), html: await readHead(res) }
  }
  throw new Error("Too many redirects")
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

// The headline's own script is the stronger signal — plenty of Chinese
// sites ship a template-default lang="en". Declared lang only decides the
// Latin-script case (English vs. French/Spanish/etc.).
// ponytail: an undeclared non-English Latin-script page passes as English;
// add a stopword check if that shows up.
export function detectLanguage(
  text: string,
  declaredLang: string
): ContentLanguage | null {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text))
    return null
  if (/\p{Script=Han}/u.test(text)) return "zh"
  if (/[^\P{L}\p{Script=Latin}]/u.test(text)) return null
  return !declaredLang || /^(en|zh)/.test(declaredLang) ? "en" : null
}

// Page titles carry site/section chrome that shouldn't become the filed
// headline. Observed live: "… | ETtoday國際新聞 | ETtoday新聞雲", "…｜廣告雜誌",
// "… - BBC News", "…-最新新聞-新聞室-新聞中心-工業技術研究院". Pipes never
// appear in real headlines; dashes do, so only a short trailing dash tail or
// an unspaced chain of short Han segments counts as chrome. Never cuts the
// title below MIN_HEADLINE chars.
const MIN_HEADLINE = 8
export function stripTitleChrome(title: string): string {
  const cut = (at: number) =>
    at >= MIN_HEADLINE ? title.slice(0, at).trim() : title
  const pipe = title.search(/\s*[|｜]/)
  if (pipe > 0) return stripTitleChrome(cut(pipe))
  const hanChain = title.search(/(?:-\p{Script=Han}{2,12}){2,}$/u)
  if (hanChain > 0) return cut(hanChain)
  const dash = title.search(/\s[-–—]\s[^-–—]{1,30}$/)
  if (dash > 0) return cut(dash)
  return title
}

// Each edition's Custom tab files only stories in its own language — the
// wire never translates a reader's link.
export function parseLinkPreview(
  html: string,
  pageUrl: string,
  language: ContentLanguage
): LinkPreview {
  const meta = new Map<string, string>()
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map<string, string>()
    for (const [, k, , v] of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))
      attrs.set(k.toLowerCase(), v)
    const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase()
    const content = attrs.get("content")
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content))
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const pick = (...keys: string[]) =>
    keys.map((k) => meta.get(k)).find(Boolean) ?? ""

  const title = stripTitleChrome(
    pick("og:title", "twitter:title") ||
      (titleTag ? decodeEntities(titleTag) : "")
  )
  if (!title) throw new Error("No headline found at that link")

  const description = pick(
    "og:description",
    "twitter:description",
    "description"
  )
  const declaredLang = (
    html.match(/<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/i)?.[1] ??
    pick("og:locale")
  ).toLowerCase()
  if (detectLanguage(`${title} ${description}`, declaredLang) !== language)
    throw new Error(UNSUPPORTED_LANGUAGE)

  const image = pick("og:image", "og:image:url", "twitter:image")
  const published = pick("article:published_time", "og:published_time")
  const publishedDate = published ? new Date(published) : null

  return {
    url: pageUrl,
    title,
    description,
    image: image ? new URL(image, pageUrl).toString() : null,
    siteName:
      pick("og:site_name") || new URL(pageUrl).hostname.replace(/^www\./, ""),
    publishedAt:
      publishedDate && !Number.isNaN(publishedDate.getTime())
        ? publishedDate.toISOString()
        : null,
  }
}

export async function fetchLinkPreview(
  raw: string,
  language: ContentLanguage
): Promise<LinkPreview> {
  const { url, html } = await fetchHtml(raw)
  return parseLinkPreview(html, url, language)
}
