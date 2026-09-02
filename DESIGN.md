# DESIGN.md — sonwork.org

version: 1.0 · name: **instrument** · 2026-09-02

Sơn Lê's personal site and the private archive of reports his agent fleet files.
Dark by default because it is read at night; a bright theme exists for daylight.
The system has exactly one idea, and everything else serves it:

> **Cool is the machines. Warm is Sơn.**
> Cyan marks anything an agent produced. The warm tone is reserved for his own
> voice, his notes and his writing, and nothing else may use it.

A living version of this document renders from the real tokens at `/kit/`.

## Mark

A document with a note in its margin: a rounded square with three text lines in
`--lume`, and one dot in `--human` at its top-right edge. It is the one rule drawn.
Used at 17px in the header (tilts 6° on hover), as the favicon, at 360px and 14%
opacity as the ornament behind the hero, and on `/kit/`. Never recoloured.

## Delight (one thesis)

The machines write, Sơn argues. The only celebrated action is keeping a note: the
status says "Kept.", the new card settles with a warm ring, its ✎ marker pings once
beside the section, and the document's stamp gains "read by Sơn" in his colour.
Nothing else on the site celebrates anything.

## Colour

All colour is authored in OKLCH. Roles, not hues, are what components reference.

| Token | Dark (default) | Bright | Role |
|---|---|---|---|
| `--void` | `oklch(0.115 0.022 256)` | `oklch(0.985 0.004 250)` | page ground |
| `--ground` | `oklch(0.150 0.026 255)` | `oklch(0.962 0.008 250)` | section ground, header |
| `--raise` | `oklch(0.195 0.028 254)` | `oklch(0.935 0.012 250)` | hover, raised surfaces |
| `--line` | `oklch(0.290 0.030 254)` | `oklch(0.820 0.016 250)` | rules, strong |
| `--line-2` | `oklch(0.235 0.028 254)` | `oklch(0.885 0.012 250)` | rules, quiet |
| `--ink` | `oklch(0.965 0.006 250)` | `oklch(0.190 0.030 256)` | text |
| `--ink-2` | `oklch(0.760 0.014 250)` | `oklch(0.380 0.028 254)` | secondary text |
| `--ink-3` | `oklch(0.560 0.020 252)` | `oklch(0.540 0.024 252)` | labels, muted |
| `--lume` | `oklch(0.800 0.135 222)` | `oklch(0.520 0.150 236)` | **machine accent** |
| `--lume-2` | `oklch(0.640 0.120 226)` | `oklch(0.440 0.130 238)` | machine accent, deep |
| `--human` | `oklch(0.820 0.095 55)` | `oklch(0.560 0.130 48)` | **Sơn's accent** |

Strategy: **Restrained**. Neutrals carry the page; the two accents together cover
well under 10% of any screen. Colour never fills regions; it marks things.

Contrast floor: body text ≥ 4.5:1, labels ≥ 4.5:1, large display ≥ 3:1, on both
themes. The bright accents were darkened until they pass as text on paper.

Where each accent may appear:

- `--lume`: report type, bylines, links, search, filters (pressed), the status
  line's "online", the mark beside the wordmark, hero emphasis, the aurora.
- `--human`: note cards, note markers (✎), "n notes from me", and Sơn's own
  writing on hover. **Nowhere else.**

Never: gradient text, glass as default, coloured left borders, a third accent,
category-per-colour legends (type is a word, not a hue).

## Typography

Two families on a contrast axis, and the second one only where there is data.

- **Sora** — every word. Display 600 at `clamp(36px, 5.6vw, 66px)`, tracking
  `-0.045em`, line-height 1.02. Titles 500, `-0.025em`. Body 300 at 17px / 1.7.
  UI 400–500 at 13–14px. Vietnamese diacritics render natively.
- **JetBrains Mono** — dates, revisions, counts, the status line, labels, footer.
  Never for prose, never as a "technical" costume. If it is not data, it is Sora.

Measure 66ch. `text-wrap: balance` on headings. Tabular numerals on all numbers.
Dates display as `2026.09.01` in indexes and `1 September 2026` in stamps,
locale-aware (`vi-VN` for Vietnamese documents).

## Space and surface

- **Ground**: near-black with one static body of light, high and left. Nothing
  in the background moves. (Option 1 of the quieter pass, 2026-09-02.) No grid.
- One **aurora** of `--lume` at 14–16% opacity, centred above the fold. It is the
  only glow.
- Rules are 1px. Corners are 4–6px. Nothing is a card; rows are separated by
  rules and lift to `--raise` on hover.
- Reading column 66ch; site width 1080px (1180px on reading pages with the notes
  margin at 260px).
- Section rhythm: 72px between sections, 34px above a section head, 22px below.

## Feel: cinematic (added after the levo-studio / atalanta references)

- **Hero at scale**: Sora 500 up to 96px, tracking -0.045em, line-height 1. Line
  two is muted (`--ink-3`), the key phrase is `--lume`. A mono locator line above
  (`● SƠN LÊ / HỒ CHÍ MINH CITY / date`), a pill CTA and a text link below, a
  "scroll" hint with a breathing rule bottom-right. The hero fills the viewport.
- **The statement** (`Statement.astro`): a near-full-viewport paragraph at up to
  58px whose words sharpen from muted-and-blurred to ink as it scrolls into view,
  each word offset by its index; `*phrases*` set in the accent. A progress rule
  draws beneath it. CSS scroll timelines; fully visible without support.
- **Chapters**: every home section opens with a mono rail marker
  (`■ 02 — THE READINGS`) and a large light statement (Sora 300 up to 46px) with
  one muted span, then the list. Sections take ~14vh of air above.
- **Frame**: two 1px vertical rules bound the column at every width above 640px.
- **No grid.** Removed once the sea existed; it only added noise.

## Pictures and interaction

- **The field** (`Field.astro`): the archive drawn as a map under the intro. x is
  time, rows are kinds, node size is revision count, dashed hairlines join reports
  by the same agent. Nodes breathe slowly; hover or focus lifts one and reveals its
  title; click opens it. Server-rendered SVG, complete without JavaScript.
- **Kind glyphs** (`lib/glyphs.ts`): one drawn line icon per kind, 1.6 stroke,
  round joins, beside every row and stamp. They tilt on hover.
- **Row peek**: title and dek slide 4px and the dek brightens on hover.
- **Intro cadence**: the three lines of the headline and the two paragraphs arrive
  in sequence from a visible base (opacity floor 35%).

## Components

- **Contact** — three rows (work mail, personal mail, LinkedIn) with an arrow that travels on hover.
- **Status line** — mono, under the header on the home page. Real numbers from
  the build: agents filing, reports, this week, build time. Numbers count up once.
- **Ledger row** (`.r`) — 118px mono index column (date, type, `vi`) beside title,
  dek, and meta. The archive is a log; it should look like one.
- **Stamp** — the mono metadata line under a document title: type, byline, date,
  language, revision (linked to git history), Public/Private.
- **Notes margin** — sticky at 260px on wide screens, below the document on
  narrow. Warm. Section markers appear beside annotated headings.
- **Filters** — mono pills; pressed state is solid `--lume`.
- **Search** — a dialog on ⌘K; Pagefind UI themed through its CSS variables.
- **Theme toggle** — in the nav; stored preference wins, otherwise the system.

## Motion

Grammar: exponential ease-out (`cubic-bezier(.16,1,.3,1)`), transform and
opacity first, **one authored moment per surface**, and everything already
visible without any of it. `prefers-reduced-motion: reduce` disables all motion.

- Home: the hairline under the hero draws itself once (1.4s).
- Status line: counters ease to their value (0.9s); the online dot breathes.
- Lists: rows arrive on entry via scroll timeline, opacity floored at 50%.
- Grid: drifts with scroll at a fraction of content speed.
- Navigation: cross-document view transitions, 180ms crossfade.
- Search: the panel pops in 260ms.
- Hover: the type label nudges 2px; rows raise; links tint to `--lume`.

Never gate content on motion. A page must be complete with JavaScript off.

## Themes

Dark is the default and the design's home. Bright uses the same roles with the
ground flipped to cool paper and both accents darkened. The toggle writes
`data-theme` on `<html>` and persists in `localStorage`; with no stored choice,
`prefers-color-scheme` decides.

## Refusals

Cards as page structure · glass by default · gradient text · eyebrows above
headings · numbered section scaffolding · a colour per category · monospace as
costume · imagery for atmosphere (starfields, nebulae, orbits) · any use of
`--human` for machine output.
