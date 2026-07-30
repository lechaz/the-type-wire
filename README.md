# The Type Wire

> Current events, unfolded by type.

An entertainment/novelty news wire that ingests real daily headlines, has an LLM tag the key decision-maker in each story with an MBTI personality type, and generates a 30-day-out prediction of how the story unfolds — reasoned from that person's personality. Readers can branch into "what-if" alternate timelines to see how a different personality read changes the outcome.

Delivered in-character as a deadpan wire-service bulletin: total bureaucratic seriousness applied to admittedly speculative personality predictions — never hedged, never winking at the premise.

## How it works

1. **Ingest** — [Currents API](https://currentsapi.services/), [RapidAPI Real-Time News Data](https://rapidapi.com/), and [GDELT](https://www.gdeltproject.org/) are queried in parallel per category/region and deduped into one pool (by URL and normalized title); any can be forced alone via `FORCE_PROVIDER`, or excluded via `EXCLUDE_PROVIDER`, in `src/server/news/client.ts` for debugging.
2. **Triage** — Gemini (`gemini-3.5-flash-lite`) tags each story's primary decision-maker with an MBTI type and reasoning, dropping driver-less roundups and pure listicles.
3. **Predict** — Gemini reasons a 30-day forecast timeline from that person's personality read. The default timeline is wire-red; user-created what-if branches (swapping in a different MBTI type) take the ink color of that personality family.
4. **Serve** — Supabase caches ingested stories, triage results, and predictions per category/region/day; a manual "Refresh" re-triggers ingestion on demand. If an API quota is exhausted, cached articles are served instead of erroring out.

## Coverage

- **Categories:** AI, Finance, Politics, International, Technology
- **Editions:** U.S. (English) and Taiwan (繁體中文) — region picks the news source, the language of every generated field, and the UI chrome, with independent caches and cache-day rollover per region.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing) deployed to Vercel via the Nitro plugin
- Tailwind v4 + [shadcn/ui](https://ui.shadcn.com/) (`base-nova` preset, Base UI primitives)
- [Supabase](https://supabase.com/) (Postgres + migrations)
- [Gemini](https://ai.google.dev/) (`@google/genai`) for triage and prediction generation
- [Currents API](https://currentsapi.services/) + [RapidAPI Real-Time News Data](https://rapidapi.com/) + [GDELT](https://www.gdeltproject.org/) for headline ingestion

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
- `CURRENTS_API_KEY`, `CURRENTS_API_BASE`
- `RAPIDAPI_KEY`, `RAPIDAPI_HOST`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Design

Cream newsprint ground, warm-black ink, one wire-red accent. Zilla Slab (display), Source Serif 4 (body), Courier Prime (datelines/stamps/numbers). Flat, rule-bordered, zero shadows, near-zero radius. Full direction and tokens in [DESIGN.md](./DESIGN.md); product scope and principles in [PRODUCT.md](./PRODUCT.md).
