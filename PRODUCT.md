# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Casual readers browsing today's news for entertainment, curious what an AI personality lens says about it. They're not researchers or forecasters — they want a fun, quick read: skim headlines, see who's driving the story, get a deadpan-confident take on what happens next. Solo/pre-launch project — no confirmed secondary audience yet.

## Product Purpose
The Type Wire ingests real daily headlines, has an LLM tag the key decision-maker in each story with an MBTI personality type and reasoning, then generates a 30-day-out prediction of how the story unfolds — reasoned from that person's personality. Users can branch into "what-if" alternate timelines to see how a different personality read changes the outcome. Success = a reader finds it fun to check daily and trusts the personality reasoning even while knowing it's playful, not literal forecasting.

## Positioning
The mechanism a plain news aggregator can't copy: real news ingestion (Currents API) → AI-tagged decision-maker MBTI (Gemini triage) → personality-reasoned prediction with branching what-if timelines. It's an entertainment/novelty wire service — personality-flavored speculation, not serious forecasting — delivered with total straight-faced wire-bulletin conviction rather than hedging like a disclaimer-heavy tool.

## Operating Context
- Categories: AI, Finance, Politics, International, Technology (`NEWS_CATEGORIES` in `src/lib/mbti.ts`).
- Regions/editions: U.S. (English) and Taiwan (繁體中文), toggled from the masthead (`NEWS_REGIONS` in `src/lib/region.ts`, added 2026-07-26). Region selects the news source (`country`/`lang` on the Currents API call), the language of every Gemini-generated field, and the UI chrome (`src/lib/i18n.ts`). Caches, cache-day rollover (Taipei midnight for TW vs. UTC for US), and the MBTI/legend copy are all independent per region.
- Landing page: MBTI legend (bento grid, above the fold) + category tabs + headline "clippings" showing headline, source, primary decision-maker stamp.
- Event page (merged 2026-07-26, was split detail+timeline): decision-maker byline strip + the 30-day forecast timeline load together on one screen — no separate "Predict" click. What-if alternate timelines branch from the same screen.
- Manual "Refresh" per category re-triggers ingestion/triage on demand.

## Capabilities and Constraints
- Stack: TanStack Start + Tailwind v4 + shadcn (base-nova preset, Base UI primitives) + Supabase + Gemini (`gemini-3.5-flash-lite` via `@google/genai`) + Currents API (free plan).
- Hard constraint: Currents API free plan is rate-limited to 20 req/min — category fetches must stay serialized, not parallelized. Two regions double both Currents API call volume and Gemini token spend.
- Ingestion flow: category-level Gemini triage keeps stories with a real named individual behind a genuine decision/move, dropping only pure investment-tip listicles and driver-less roundups (tuned 2026-07-26, twice: first pass required "high-profile + market-moving," which proved too tight and could empty out a whole category; loosened same day to keep ordinary-but-real news while still cutting listicle filler, with an explicit "keep the strongest candidates rather than return nothing" instruction). Seeds one primary decision-maker (`sort_order: 0`) per kept story; the event page expands that seed into the full roster on first real view.
- No auth/accounts system currently — open, session-less browsing.

## Brand Commitments
- Name: "The Type Wire" (rebranded 2026-07-26 from "MBTI News Oracle" — full rebrand, name explicitly in scope).
- Tagline: "Today's News, Fit to Type." (changed 2026-07-26 from "All the News Fit to Type" — "all the news" overclaimed comprehensiveness for what's actually a curated, triaged subset) — a deliberate wink at the NYT masthead line, punning on MBTI "type."
- Art direction: deadpan wire-service/newspaper-bulletin world. Cream newsprint ground, warm-black ink, one wire-red accent; Zilla Slab display, Source Serif 4 body, Courier Prime for datelines/stamps/numbers. Light theme (newsprint), not dark — this **replaces** the prior "Arcane Almanac" always-dark lock. Full tokens and named rules live in `DESIGN.md`; the old indigo/gold/always-dark world is retired anti-reference only.
- Branch-color rule (carried forward, now in ink tones): wire-red is reserved for the default prediction timeline; what-if branches take the ink color of the personality family being substituted in, so branch color is meaningful, not arbitrary.
- Tone: Total bureaucratic seriousness applied to admittedly speculative personality predictions. The deadpan itself is the joke; never wink at the reader with disclaimers, emoji, or "just for fun" framing.

## Evidence on Hand
None. Solo, pre-launch project — no testimonials, real users, case studies, or press. Future work must not fabricate any.

## Product Principles
1. Personality reasoning is the product — every prediction and decision-maker tag should feel grounded in a specific MBTI read, not generic.
2. Stay in-character as a wire service: deadpan, confident, bureaucratically serious — never hedged, never winking at its own premise.
3. Respect the news source — headlines and sourcing are real; only the personality framing and forward prediction are speculative/entertainment.
4. Default timeline (wire-red) always stays visually distinct from user-created what-if branches.
5. Don't make the reader think: lead with icons/stamps/short labels; full sentences only on demand.
6. Solo-project scale: no invented social proof, accounts, or evidence beyond what's actually built.
