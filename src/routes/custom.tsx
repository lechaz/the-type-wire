import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import type { ClipboardEvent, FormEvent } from "react"
import { toast } from "sonner"
import { z } from "zod"
import {
  analyzeCustomLink,
  getLastTab,
  previewCustomLink,
} from "@/server/fns/custom"
import type { LinkPreview } from "@/server/news/link-preview"
import {
  NEWS_REGIONS,
  UNSUPPORTED_LANGUAGE,
  monoLabelClass,
} from "@/lib/region"
import { stringsFor } from "@/lib/i18n"
import { buildMetaTags } from "@/lib/site-meta"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const searchSchema = z.object({
  region: z.enum(NEWS_REGIONS).optional().catch(undefined),
})

const STORAGE_KEY = "custom-link"

const isUnsupportedLanguage = (err: unknown) =>
  err instanceof Error && err.message === UNSUPPORTED_LANGUAGE

export const Route = createFileRoute("/custom")({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(search),
  // A bare /custom (bookmark, typed URL) opens in the reader's last
  // edition; in-app links always pass region explicitly.
  beforeLoad: async ({ search }) => {
    if (!search.region)
      throw redirect({
        to: "/custom",
        search: { region: (await getLastTab()).region },
        replace: true,
      })
  },
  head: ({ match }) => {
    const t = stringsFor(match.search.region ?? "us")
    return {
      meta: buildMetaTags({ pageTitle: t.customTab, description: t.tagline }),
    }
  },
  component: CustomPage,
})

function CustomPage() {
  const region = Route.useSearch({ select: (s) => s.region ?? "us" })
  const navigate = useNavigate()
  const t = stringsFor(region)
  const [url, setUrl] = useState("")
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const latestRequest = useRef(0)

  // localStorage only exists client-side — restore after mount so SSR and
  // the first client render agree.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
      if (saved?.url && saved.preview) {
        setUrl(saved.url)
        setPreview(saved.preview)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  async function loadPreview(raw: string) {
    const target = raw.trim()
    if (!target) return
    const request = ++latestRequest.current
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const result = await previewCustomLink({ data: { url: target } })
      if (request !== latestRequest.current) return
      setPreview(result)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ url: target, preview: result })
      )
    } catch (err) {
      if (request === latestRequest.current)
        setError(
          isUnsupportedLanguage(err)
            ? t.customUnsupportedLanguage
            : t.customPreviewFailed
        )
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim()
    if (!pasted) return
    e.preventDefault()
    setUrl(pasted)
    loadPreview(pasted)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    loadPreview(url)
  }

  async function handleAnalyze() {
    if (!preview) return
    setAnalyzing(true)
    try {
      const { eventId } = await analyzeCustomLink({
        data: { url: preview.url, region },
      })
      await navigate({ to: "/event/$eventId", params: { eventId } })
    } catch (err) {
      toast.error(
        isUnsupportedLanguage(err)
          ? t.customUnsupportedLanguage
          : t.customAnalyzeFailed
      )
      setAnalyzing(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-8 pb-14">
      <h1 className="font-display text-2xl font-bold text-foreground">
        {t.customUrlLabel}
      </h1>

      <form onSubmit={handleSubmit} className="mt-4">
        <label htmlFor="custom-url" className="sr-only">
          {t.customUrlPlaceholder}
        </label>
        <input
          id="custom-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          placeholder={t.customUrlPlaceholder}
          className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </form>

      <div className="mt-4" aria-live="polite">
        {loading && (
          <p
            className={cn(
              "font-mono text-[11px] text-muted-foreground",
              monoLabelClass(region)
            )}
          >
            {t.customFetching}
          </p>
        )}
        {error && (
          <p
            className={cn(
              "font-mono text-[11px] text-wire-red",
              monoLabelClass(region)
            )}
          >
            {error}
          </p>
        )}
        {preview && (
          <article className="overflow-hidden border border-border">
            {preview.image && (
              <img
                src={preview.image}
                alt=""
                referrerPolicy="no-referrer"
                className="aspect-[1.91/1] w-full border-b border-border object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <div className="px-4 py-3">
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                {preview.siteName}
              </p>
              <h2 className="mt-1 font-display text-lg leading-snug font-bold text-foreground">
                {preview.title}
              </h2>
              {preview.description && (
                <p className="mt-1 line-clamp-3 font-serif text-sm text-muted-foreground">
                  {preview.description}
                </p>
              )}
            </div>
          </article>
        )}
      </div>

      {preview && (
        <Button
          className="mt-4"
          onClick={handleAnalyze}
          disabled={analyzing || loading}
        >
          {analyzing ? t.customAnalyzing : t.customAnalyze}
        </Button>
      )}
    </main>
  )
}
