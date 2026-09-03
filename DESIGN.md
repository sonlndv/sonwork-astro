# DESIGN.md — sonwork.org

version: 2.0 · 2026-09-02 · after the impeccable critique

Lê Sơn's site: his readings, filed by his research agents, with his notes in the
margin. He is an ex-VC, now a full-time operator; the employer is never named. Public. Dark by default; a bright theme exists. The system has one idea:

> **Cool is the machines. Warm is Sơn.**
> `--lume` marks anything an agent produced. `--human` marks his voice only.

A living version renders from the real tokens at `/kit/`.

## Vocabulary

One thing has one name. **Readings** (nav, headings, URL `/readings/`). Six
**themes**: news, country, industry, company, business model, sociology, each
glossed on `/readings/` and drawn as a glyph. **Projects** (`/projects/`) each
have a profile and a **build diary**. **Notes** are Sơn's. An **agent** files; Sơn **keeps** a note.

## Mark — LS15

Sơn's mark, from his own earlier brand work: **LS** in ink, **15** in `--lume`,
Saira Condensed 900, skewed −11°, the register of a driver number. Saira Condensed
is loaded for the mark and used nowhere else. Alone in the header; favicon is the
LS pair on a `--lume` tile; the OG image is the mark and the name. Never a
background ornament.

## Alfred — he runs the fleet

A bookmark ribbon with two eyes, named Alfred (`Bot.astro`). He is the character
who runs Sơn's fleet of reading agents; the agents byline their own readings and
work for him. Grok's locked
mark, redrawn as SVG in the tokens: body `--lume`, eyes `--void`, so it holds
on both themes. It is the counterpart to LS15: **LS15 is Sơn, Alfred is the
machines.** It stands at 11–12px beside every agent byline (rows and stamps),
waits at 44px in empty states, sits at 104px beside "Meet Alfred" on /about/, and
appears on `/kit/`. It blinks about once every eight seconds (off under reduced
motion). No pupils, no mouth, no hair; never stretched; never the site's mark.
Source kit: Google Drive folder "sonwork logo"; gbrain `projects/sonwork`.

## Mark — Sonar

The research engine's own mark: a centre dot and three thin arcs opening to the
right, a ping mid-sweep (`Sonar.astro`, from Grok's locked reference,
2026-09-03). Drawn in `--lume`. Used only for Sonar: its portfolio card, its
profile, the "What Sonar found" header, `/kit/`. Never the site's mark; LS15
is. Never a background ornament.

## Colour (OKLCH)

| Token | Dark | Bright | Role |
|---|---|---|---|
| `--void` | `0.115 0.022 256` | `0.985 0.004 250` | page ground |
| `--ground` | `0.150 0.026 255` | `0.962 0.008 250` | header, section ground |
| `--raise` | `0.195 0.028 254` | `0.935 0.012 250` | hover, raised |
| `--line` | `0.290 0.030 254` | `0.820 0.016 250` | rules, strong |
| `--line-2` | `0.235 0.028 254` | `0.885 0.012 250` | rules, quiet |
| `--ink` | `0.965 0.006 250` | `0.190 0.030 256` | text |
| `--ink-2` | `0.760 0.014 250` | `0.380 0.028 254` | secondary text |
| `--ink-3` | `0.615 0.020 252` | `0.500 0.024 252` | labels, muted — **≥ 5:1** |
| `--lume` | `0.800 0.135 222` | `0.500 0.150 236` | **machine accent** |
| `--lume-2` | `0.640 0.120 226` | `0.440 0.130 238` | machine accent, deep |
| `--human` | `0.820 0.095 55` | `0.540 0.130 48` | **Sơn's accent** |

Strategy: restrained. Neutrals carry the page; the two accents together cover well
under 10% of any screen. Contrast floor **4.5:1 for every text colour on every
ground, both themes**; `--ink-3` was raised in v2.0 because it measured 4.41.

`--lume` may appear on: kinds and their glyphs, bylines, links, search, filters
(pressed), the "15" in the mark, hero emphasis, the one light in the ground.
`--human` may appear on: note cards, note markers, note counts, "read by Sơn", and
Sơn's own writing on hover. Nowhere else.

## Typography

- No serif. The emphasised words in the opening headline stay in Sora and take the cool colour.
- **Sora** for every other word. Hero 500 at `clamp(44px, 7.2vw, 96px)`, tracking
  −0.045em, line-height 1, second line muted. Chapter statements 300 at
  `clamp(28px, 3.6vw, 46px)`, −0.035em, one muted span. Titles 500, −0.025em.
  Body 300 at 15–17px / 1.6–1.7 (never below 15px). UI 400–500 at 13–14px.
- **JetBrains Mono** for data only: dates, revisions, counts, kinds, labels, the
  tally, the footer. **12px floor.** Never prose, never as a costume.
- Measure 66ch. `text-wrap: balance` on headings. Tabular numerals on numbers.
  Dates: `2026.09.01` in indexes, `1 September 2026` in stamps, locale-aware.

## Ground and surface

Near-black with **one static body of light**, high and left. Nothing in the
background moves. No grid, no caustics, no aurora, no cursor spotlight, no
ornament (all tried on 2026-09-02, all removed: they read as điệu). Two 1px
vertical rules frame the column above 640px. Rules are 1px, corners 4–6px, there
are no cards, no glass, no gradient text. A row lifts to `--raise` on hover.

## Structure of the home

The home is the **profile of the work**, not of the person (Son, 2026-09-03):
a business being built with a team of AI agents, run by Alfred. Son's own story
lives on `/about/`. The ledger lives at `/readings/`.

1. The opening is one composed frame, bottom-anchored: LS15, a small badge
   ("Sonar is live · Alfred runs the team"), the statement in three masked
   lines with "AI agents," in the cool colour, one paragraph, two actions, and a stats row pinned at the bottom
   (agents, readings, this week, each with its icon). Every element has its
   own delay; a rest state of opacity 1 plus an animationend handler and a rAF
   fallback mean nothing can stay hidden. Height-aware breakpoints keep the
   frame inside short viewports.
2. A ticker of what the fleet filed (title, kind glyph, byline), 48s loop,
   pauses on hover, static under reduced motion.
3. Meet Alfred, my CEO (band): one paragraph, no more, and Alfred sliding in.
3b. The portfolio: project cards from the `projects` collection (01 Research
   Engine, live, with Find / Research / Publish; 02 F1 YouTube, next), each
   linking to its profile and build diary. "What Sonar found." over the readings (the `Found` component: theme pills,
   featured, grid), repeated on `/projects/sonar/`. No scroll cue.
4. What the team found: a compact filter row (All + six kinds with counts,
   empty kinds disabled) at the top of the block that filters in place; one
   **featured** reading (its kind drawn large, accent sweep on hover); a grid
   of the rest that tilts toward the cursor.

`/about/` is short: the day-job statement, one paragraph, contact. There is no
writing section (removed 2026-09-03).

Every section header draws its rule in the accent and rises as it enters the
viewport; rows and contact lines stagger by index. CSS scroll timelines only.

## The readings index

`/readings/` opens on **the field** (once there are four or more readings): the
archive drawn as a map, x by date, rows by kind. Filters below it hide nodes on
the map and rows in the list together. Then the glossed kinds, the filters, and
the ledger grouped by year.

## Pictures

- **The portrait** (`public/portrait.jpg`): Sơn's real photograph, treated in the
  palette: luminance mapped from `--void` to a cool light, mids pushed dark, edges
  faded into the ground, light grain. 720px JPEG, ~120KB. Beside the hero on
  `/about/` with a mono caption; a 72px round face beside the home lede. Bright
  theme inverts it to shadow-on-paper. The source photo is never committed
  (`.impeccable/refs/portrait/` is ignored); regenerate with
  `.impeccable/refs/portrait/process.html` if replacing the photo.

- **The field** (`Field.astro`): the `/readings/` index's picture: readings drawn as
  a map, x by date, rows by kind, size by revision, dashed lines join readings by
  the same agent. Hover reveals the title; click opens it; filters hide nodes.
  Rendered only when there are ≥ 4 readings. Not on the home.
- **Kind glyphs** (`lib/glyphs.ts`): one drawn line icon per kind, 1.6 stroke.

## Sections: one boundary grammar

Every section on every page is built the same way: a 1px `--line` rule on top,
a header row with the statement on the left (Sora 300, up to 36px, one muted
span) and the mono meta or link on the right, sitting on a `--line-2` rule, then
the content. Sections that are not the ledger alternate onto a `--ground` band
that runs edge to edge between the frame rules, so the page reads as blocks, not
as air. No other heading device exists.

## Components

- **Tally** — mono, in the hero's action row: agents · readings · this week. Real
  numbers from the build; they count up once. No "online", no build time.
- **Ledger row** (`.r`) — 118px mono index (date, kind glyph, `vi`) beside title,
  dek, byline, revision, and the warm note count when notes exist.
- **Stamp** — under a reading's title: kind, byline, date, language, revision
  (linked to git history), and "read by Sơn" in warm once a note exists.
- **Turn** — at the end of every reading: older · all readings · newer.
- **Sources** — domain in the index column, full URL beside it, real links.
- **Subscribe** — one field, one promise, under "What Sonar found" on the home
  and the Sonar profile. RSS link beside it.
- **Filters** — mono pills; pills with zero items are not rendered.
- **Search** — ⌘K (Ctrl K where there is no ⌘); Pagefind, themed.
- **Theme toggle** — stored preference, else the system.

## Motion

Exponential ease-out, transform and opacity first, one authored moment per
surface, everything visible without it, all off under `prefers-reduced-motion`.
Hero lines land in sequence; counters ease to their value; rows arrive on entry
(opacity floor 50%); page changes crossfade in 180ms; the search panel pops; the
field's nodes breathe. Nothing else moves.

## Delight (one thesis)

The only celebrated action is subscribing: the field clears and the line says
"Kept. Sonar will write." Nothing else on the site celebrates anything.

## Refusals

Cards as page structure · glass · gradient text · kickers or eyebrows above
headings · numbered section scaffolding · a colour per kind · monospace as costume
· mono below 12px · muted text under 4.5:1 · background imagery or pattern
(grids, starfields, water, orbits) · the mark as ornament · "online" or build
telemetry on a public page · any use of `--human` for machine output · a second
name for the same thing.
