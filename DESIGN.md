---
name: The Type Wire
description: A deadpan wire-service bulletin that reports AI-inferred personality reads on real news and forecasts what happens next.
colors:
  newsprint: "oklch(0.965 0.012 85)"
  paper-card: "oklch(0.99 0.008 85)"
  ink: "oklch(0.20 0.015 55)"
  ink-muted: "oklch(0.45 0.02 60)"
  rule: "oklch(0.20 0.015 55 / 18%)"
  wire-red: "oklch(0.52 0.20 25)"
  wire-red-foreground: "oklch(0.99 0.005 85)"
  mbti-analyst: "oklch(0.40 0.10 265)"
  mbti-diplomat: "oklch(0.45 0.09 150)"
  mbti-sentinel: "oklch(0.48 0.015 240)"
  mbti-explorer: "oklch(0.55 0.14 50)"
typography:
  display:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
    lineHeight: 1.05
  body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontWeight: 400
    letterSpacing: "0.04em"
  ui:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontWeight: 500
rounded:
  none: "0px"
  sm: "2px"
spacing:
  clipping-pad: "16px"
  column-gap: "24px"
  section-gap: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    rounded: "{rounded.none}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.wire-red}"
  stamp-default:
    backgroundColor: "{colors.newsprint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  stamp-active:
    backgroundColor: "{colors.wire-red}"
    textColor: "{colors.wire-red-foreground}"
    rounded: "{rounded.none}"
---

# Design System: The Type Wire

<!--
DIRECTION CONTRACT
THESIS: Predictions from a personality-inference engine, delivered with the
total unblinking gravity of a wire-service bulletin — the joke is the
deadpan, not a punchline. Refuses both AI-mystic dark-oracle cosplay and
cutesy meme-app whimsy.
OWN-WORLD: Cream newsprint ground, warm-black ink, one alarm-red wire-stamp
accent. Zilla Slab masthead/headlines, Source Serif 4 body, Courier Prime
datelines/stamps. Flat rule-bordered clippings, zero shadows, near-zero radius.
STORY: Reader opens the wire, sees today's dispatches stamped by category,
scans a 16-type bento legend once, clicks a headline, gets a byline strip
plus one confident forecast line — no button to hunt for.
FIRST VIEWPORT: Masthead "THE TYPE WIRE" + dateline rule, a bento legend of
16 stamped MBTI tiles directly below (the "glorified legend"), then the
day's headline clippings.
FORM: Whole-site identity replacement, direction pinned directly by the
user's brief (deadpan wire-service tabloid) rather than a dice roll;
confirmed through one structured question round covering visual world, nav
structure, and naming.
-->

**Creative North Star: "The Wire Desk That Reports on Your Personality Like It's Breaking News"**

The Type Wire treats MBTI-flavored news speculation as hard-news dispatch, not mystical prophecy. Every prediction is typeset, stamped, and dated exactly like a real bulletin — the humor comes entirely from applying total bureaucratic seriousness to something admittedly silly (guessing a CEO's cognitive functions from a press release). Nothing winks at the reader; the deadpan itself is the joke, and undermining it with an emoji, a gradient, or a "just for fun!" disclaimer would kill it. Density is that of a real newspaper page: many small stamped facts, no filler prose, no hero illustration standing in for content. This replaces the prior "Arcane Almanac" world (midnight-indigo/gold, always-dark, mystical-oracle) entirely; that world is now anti-reference only — nothing from it (fantasy figurine art treated as illustration, always-dark lock, serif-fantasy display type) carries forward except the underlying data model.

**Key Characteristics:**
- Light newsprint ground, not dark — the material is paper, not a séance room.
- One accent only: wire-stamp red, reserved for the default forecast line, active states, and "stamped" badges.
- Flat, rule-bordered "clippings" instead of shadowed cards — depth comes from hairline rules, never blur.
- Illustration-over-words: the 16-type legend and the prediction timeline lead with icons/ink-stamps and short labels, full sentences only on demand (hover/expand).
- Bento-grid legend sits above the fold on every page that needs it, functioning as a live reference, not a footnote.

## Colors

Two neutrals (newsprint ground + paper-card surface), one ink, one accent, four muted "rubber-stamp" personality-family inks. Nothing else.

### Primary
- **Wire Red** (`oklch(0.52 0.20 25)` / `#C22A1E`-ish): the one saturated color in the system. Reserved for the default/gold-replacement forecast line, primary buttons, active tab underline, and "stamped" category badges. Never used decoratively — its rarity is what makes it read as urgent.

### Neutral
- **Newsprint** (`oklch(0.965 0.012 85)`): page background — warm cream, not stark white.
- **Paper Card** (`oklch(0.99 0.008 85)`): clipping/card surface, marginally lighter than the page so bordered rectangles still read as distinct sheets without a shadow.
- **Ink** (`oklch(0.20 0.015 55)`): primary text — warm near-black, never pure `#000`.
- **Ink Muted** (`oklch(0.45 0.02 60)`): datelines, captions, secondary metadata.
- **Rule** (`oklch(0.20 0.015 55 / 18%)`): all hairline borders and column dividers.

### Named Rules
**The One Red Rule.** Wire Red appears on ≤1 element per view at rest among *page content* (the default timeline spine, or the active nav underline). Two content-level red elements competing on screen is a bug, not emphasis. **Exception:** the legend-drawer's fixed trigger bar is persistent chrome, not page content — it's solid Wire Red at rest so it reads unmistakably as a menu handle (users flagged an earlier neutral-toned version as "hiding in plain sight"), and doesn't count against the one-red budget.

## Typography

**Display Font:** Zilla Slab (bold, for the masthead and headlines)
**Body Font:** Source Serif 4 (editorial body copy: reasoning, summaries)
**Label/Mono Font:** Courier Prime (datelines, stamps, confidence figures — literal teletype material)
**UI Font:** Inter Variable (buttons, form controls, nav labels — plain, unfussy, gets out of the way)

**Character:** A real newspaper's type crew — a bold slab for shouting the news, a workhorse serif for reading it, and a monospace teletype face for the mechanical bits (dates, stamps, numbers) that were always typewritten separately from the prose around them.

**CJK fallback:** none of the four faces ship Han glyphs. `Noto Serif TC` / `Noto Sans TC` sit at the end of every `--font-*` stack (`src/styles.css`) so the TW edition falls through cleanly for Traditional Chinese instead of hitting the OS default. MBTI codes and cognitive-function codes (INTJ, Ni, Te) stay Latin in both editions — they're the product's shared vocabulary, not translated content.

### Hierarchy
- **Display** (700, `clamp(2rem, 5vw, 3.25rem)`, 1.05): masthead wordmark and event headlines only.
- **Headline** (700, 1.375rem, 1.15): section/card headlines (event cards, forecast-line labels).
- **Body** (400, 1rem, 1.5): reasoning paragraphs, byline blurbs. Max measure ~68ch.
- **Label** (400, 0.75rem, 1.3, uppercase, tracking 0.04em, Courier Prime): datelines, category stamps, confidence readouts, day markers on the timeline.
- **UI** (500, 0.875rem, 1.2, Inter): buttons, tabs, form controls.

### Named Rules
**The Typewriter Rule.** Anything mechanically generated or numeric — dates, confidence %, MBTI codes as standalone labels — sets in Courier Prime. Anything written — headlines, reasoning, summaries — sets in Zilla Slab or Source Serif 4. Never mix the two roles.

**The Typewriter Rule, CJK exception.** `uppercase` + `tracking-wide` on Label-tier mono text is a no-op on Latin datelines but reads as broken spacing on Han characters. TW-edition mono labels drop both (`monoLabelClass()` in `src/lib/region.ts`) rather than applying them and hoping the browser no-ops gracefully.

## Layout

Single-column newspaper rhythm throughout — landing page is one full-width column (max ~64rem), event page narrower (~48rem). Sections separate with a full-width hairline rule and generous vertical space (`section-gap: 64px`), more above a heading than below it. Inside a section, density is tight — clippings sit in a `column-gap: 24px` grid with minimal internal padding (`clipping-pad: 16px`); the point is many small legible facts, not airy cards. Every page reserves bottom clearance (`pb-14` on the page `<main>`) for the fixed legend-drawer trigger bar. The legend itself lives outside normal page flow entirely — see Components → The Legend.

## Elevation & Depth

**The Flat-By-Default Rule.** No shadows anywhere. Every surface sits at the same physical plane; depth is drawn with a 1px `rule`-colored border and a marginal Paper Card vs. Newsprint tone shift, exactly like ink on paper. A card that needs to feel "selected" or "active" gets a Wire Red border or fill, never a lifted shadow.

## Shapes

Radius is functionally zero (`rounded.none`, 2px only where a truly sharp corner would look like a rendering bug — e.g. a tiny stamp badge). Rectangles throughout; no pills. Borders are always 1px solid Rule, doubled (two 1px rules with a 2px gap) under the masthead only, echoing a real newspaper's masthead rule.

## Components

### Buttons
- **Shape:** rectangular, `rounded.none`.
- **Primary:** Ink background, Newsprint text, uppercase Inter label, `10px 20px` padding.
- **Hover / Focus:** background shifts to Wire Red; focus ring is a 2px Wire Red outline offset 2px (no glow).
- **Ghost:** transparent background, 1px Rule border, Ink text; hover fills Paper Card.

### Stamps (badges, replaces pill-shaped chips)
- **Style:** rectangular, 1px Ink border, uppercase Courier Prime label, no fill at rest.
- **Active/selected state:** Wire Red fill, Wire-Red-Foreground text, border same as fill.

### Cards / Clippings
- **Corner Style:** `rounded.none`.
- **Background:** Paper Card on Newsprint.
- **Shadow Strategy:** none — see Elevation.
- **Border:** 1px Rule; a Wire Red left-border (3px) marks the item as "developing"/primary.
- **Internal Padding:** `clipping-pad` (16px).

### Inputs / Selects
- **Style:** 1px Rule border, `rounded.none`, Newsprint fill, Inter type.
- **Focus:** border shifts to Ink, no glow.

### Navigation
- **Style:** plain text section labels (Inter, uppercase, tracked) in a row under the masthead, exactly like a newspaper's section nav. Active section gets a 2px Wire Red underline, not a filled pill. Mobile: same row, horizontally scrollable, no hamburger.

### Region Toggle (US ⇄ TW editions)
Two small labels (`U.S.` / `臺灣`) under the masthead dateline, styled like an edition selector rather than a settings control — active edition gets an inverted (ink-fill) chip, the other stays muted text. Switching regions swaps three things at once: the news source (`country`/`lang` on the Real-Time News Data API — TW uses `country=TW&lang=zh-Hant`, **not** `zh-TW`, which 400s), the language of every Gemini-generated field (triage, decision-maker reasoning, timeline nodes — see the prompt+schema-description sync gotcha below), and the UI chrome (`src/lib/i18n.ts`, a flat string table, no i18n library). A TW event stays Chinese permanently once ingested — region is stored on the `events` row and read from there for the detail/prediction pages, not re-derived from whatever edition the reader currently has toggled, so a linked-to article never flips language underneath a reader. US and TW maintain fully independent daily caches (`unique (region, category, source_url, cache_date)`), and the TW cache day rolls over at Taipei midnight (`cacheDateFor()` in `src/lib/region.ts`), not UTC.

### The Legend (signature component, v2)
A sitewide sticky bottom drawer (`legend-drawer.tsx`, mounted in `__root.tsx` — present on every route, not just the landing page), not a sidebar. A slim fixed bar reading "The legend ▲" docks at the bottom of every viewport; clicking slides up a `Sheet side="bottom"` (max-height 85vh, internal scroll) containing the full codex. Structure: 4 family columns, each listing its 4 types as a rich card — **avatar + code + title + cognitive-function stack + blurb, all visible at once, no click-to-expand**. An earlier version used a downplayed sidebar with per-tile `<details>` disclosure and generic 4-pose family SVGs; both were replaced after user feedback that it wasn't robust/look-up-friendly enough and didn't cover the cognitive-function shorthand (Te, Ni, Se…) the prediction timeline actually cites. Freed the landing page back to a single full-width column.

### MBTI Figurine
`mbti-figurine.tsx` crops one distinct, hand-illustrated, full-color character per type from `public/mbti-sheet.png` (a 1170×552 sheet, 8 cols × 2 rows, one cell per type with a baked-in caption below — cropped out via `background-position`). The source `mbti-sheet.webp` was opaque white behind every character; a one-off flood-fill script (seeded from the sheet's border pixels, so enclosed white regions *inside* a character like a beard or collar survive) produced the transparent PNG now in use. Used everywhere a type needs a face: legend cards, event-card byline, decision-maker byline strip — rendered directly on the newsprint/paper-card ground with no boxing/background, since it's genuinely transparent now. Full color is a deliberate exception to the restrained ink palette — the one place the newsprint world allows it.

### Cognitive-Function Lookup
`src/lib/mbti-functions.ts` is a hierarchical, role-keyed lookup (`FUNCTION_STACK[type] = {dominant, auxiliary, tertiary, inferior}`, each a function code like `Ni`) plus `FUNCTION_NAMES` (code → full name) and a reverse lookup (`typesWithFunction`). The legend renders each type's stack as `Ni (Dom) · Te (Aux) · Fi (Ter) · Se (Inf)` — this is the glossary behind the function shorthand (Te, Ni, Se…) Gemini's prediction reasoning cites inline.

### Prediction Timeline (signature component, v2)
A vertical spine, not a horizontal scroller. Each node is a full-width row with a colored dot fixed at the same offset from its own left edge (`-left-7` on a `relative` button, spine at `left-[6px]` on the shared container) — alignment can't drift the way a flex-stretch horizontal row's did (an earlier version had dots at different heights depending on how much text a neighboring card had). Every node is on-page via the page's own scroll; there's no nested scroll container. Default forecast and every what-if branch render as **equal-weight side-by-side columns** (`w-[22rem]` each, `flex` row, `overflow-x-auto` only once branches accumulate past the viewport) — color (Wire Red for default, the substituted personality's family ink for a branch) is what tells them apart, not indentation; a branch is a peer to compare against, not a subordinate detail.

### What-If Popover
`what-if-panel.tsx` uses `ui/popover.tsx` (Base UI Popover), not an inline `<details>` — opening it floats over the page and never pushes content down. Lets the reader override **any number of decision-makers at once** (one `<select>` per maker, each defaulting to their current type; only entries that actually changed go into the `runScenario` overrides payload) rather than one swap at a time. A Reset button reverts every select to the original roster in one click; both Reset and Run are disabled until at least one maker's type actually differs from their default.

## Do's and Don'ts

### Do:
- **Do** keep Wire Red to one element per view at rest (The One Red Rule).
- **Do** set every date, confidence figure, and MBTI code in Courier Prime; every headline in Zilla Slab; every paragraph in Source Serif 4.
- **Do** draw depth with 1px rules and tone shifts only — never a shadow.
- **Do** lead the timeline and legend with icons/stamps over paragraphs; full sentences only on hover/expand ("don't make me think").
- **Do** keep the MBTI legend above the fold as a bento grid, not an accordion.

### Don't:
- **Don't** reintroduce the old Arcane Almanac world (indigo/gold, always-dark, Instrument Serif) — it's anti-reference only.
- **Don't** round corners beyond 2px, or use pill-shaped chips/badges.
- **Don't** add a second saturated accent color; MBTI family colors stay desaturated "ink" tones, not candy pastels.
- **Don't** ship a full-paragraph reasoning block as the default view on the timeline — summarize to a line + icon, expand on demand.
- **Don't** gate the default 30-day forecast behind a "Predict" button click; it loads with the page.
