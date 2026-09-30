# The Type Wire

> Current events, unfolded by type.

An entertainment/novelty news wire that ingests real daily headlines, has an LLM tag the key decision-maker in each story with an MBTI personality type, and generates a 30-day-out prediction of how the story unfolds — reasoned from that person's personality. Readers can branch into "what-if" alternate timelines to see how a different personality read changes the outcome.

Delivered in-character as a deadpan wire-service bulletin: total bureaucratic seriousness applied to admittedly speculative personality predictions — never hedged, never winking at the premise.

## How it works

1. **Ingest** — each desk's public RSS feeds (`src/server/news/categories.ts`) are fetched in parallel. U.S.: TechCrunch, CNBC, BBC, The New York Times. Taiwan: 中央社 (CNA). Results are deduped by link and near-identical title, and sports stories are filtered out. No API keys and no rate limits. A daily cron (`src/server/news/audit.ts`, `/api/cron/provider-audit`) probes every feed and logs its health to `provider_audits` for monitoring.
2. **Triage** — Gemini (`gemini-3.5-flash-lite`) tags each story's primary decision-maker with an MBTI type and reasoning, dropping driver-less roundups and pure listicles.
3. **Predict** — Gemini reasons a 30-day forecast timeline from that person's personality read. The default timeline is wire-red; user-created what-if branches (swapping in a different MBTI type) take the ink color of that personality family.
4. **Serve** — Supabase caches ingested stories, triage results, and predictions per category/region/day; a manual "Refresh" re-triggers ingestion on demand. If a feed or Gemini call fails, cached articles are served instead of erroring out. A desk whose live check finds nothing new serves its cache for 30 minutes before checking again, instead of re-running fetch + triage on every page view.
5. **Custom (自選)** — readers paste any English or Chinese news link into the Custom tab. It renders a social-style link preview (Open Graph / meta tags, fetched server-side with private-network addresses blocked). Analysis only runs when the reader clicks the button: the page is fetched again on the server, saved as a `custom`-category event that never shows up on the wire desks, and opened on the normal event page for the analysis and 30-day prediction, written in the tab's language. The last preview is kept in localStorage.

## Coverage

- **Categories:** AI, Finance, Politics, International, Technology
- **Editions:** U.S. (English) and Taiwan (繁體中文) — region picks the news source, the language of every generated field, and the UI chrome, with independent caches and cache-day rollover per region.
- **Tabs:** U.S. / 臺灣 / Custom (自選). The last edition and tab are remembered in cookies, so opening the bare site address brings a returning reader back to where they left off.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing) deployed to Vercel via the Nitro plugin
- Tailwind v4 + [shadcn/ui](https://ui.shadcn.com/) (`base-nova` preset, Base UI primitives)
- [Supabase](https://supabase.com/) (Postgres + migrations)
- [Gemini](https://ai.google.dev/) (`@google/genai`) for triage and prediction generation
- Public RSS feeds (parsed with `fast-xml-parser`) for headline ingestion

## Development

```bash
npm install
npm run dev         # vite dev --port 3000
npm run build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format      # prettier --write
npm run check       # prettier --check
npm test            # vitest run
```

Requires the following environment variables (`.env.local` for local dev, or provisioned in Vercel for deployed environments):

- `GEMINI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; all DB access goes through server functions)
- `CRON_SECRET` — authenticates the daily `/api/cron/provider-audit` run (Vercel sends it automatically once set; see `vercel.json`)

Database migrations live in `supabase/migrations/` and are run by hand in the Supabase SQL Editor, in order. `0007_custom_category.sql` (adds the `custom` news category) must be applied before the Custom tab can run an analysis.

## Design

Cream newsprint ground, warm-black ink, one wire-red accent. Zilla Slab (display), Source Serif 4 (body), Courier Prime (datelines/stamps/numbers). Flat, rule-bordered, zero shadows, near-zero radius. Full direction and tokens in [DESIGN.md](./DESIGN.md); product scope and principles in [PRODUCT.md](./PRODUCT.md).
