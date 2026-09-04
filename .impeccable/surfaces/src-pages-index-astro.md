---
version: 1
slug: src-pages-index-astro
primary_target: src/pages/index.astro
related_targets: ["src/components/Found.astro", "src/components/Stack.astro", "src/lib/found.ts", "route:/"]
mode: persuade
status: built 2026-09-04
date: 2026-09-04
---

# Home: the day's run

## Job and audience

A visitor, arriving cold, in one screen: one person, three runtimes, one
engine, and what the engine produced on its newest day. Sơn confirmed
2026-09-04 that the home stays for the visitor. Sơn's own daily check is a
side effect, never the design target. Visitor mode: Persuade, with the
opening sequence as the one Experience moment.

## Outcome and proof

The visitor understands that the readings below are the output of a machine
that runs daily, by theme, and that a missing theme is a fact about the day,
not a gap in the site. Proof is real: the newest day's readings, one per
theme, the count of themes covered, and, if one exists, that day's diary post
as a footnote. No telemetry: no run times, no "online", no last-seen. The
DESIGN.md refusal stands; the run is told in dates and content only.

## Selected direction

- **Untouched:** the opening sequence, the ticker, the stack circuit, the
  portfolio pipeline, section grammar, the column, colour rule, Sora only.
- **Replaced:** the "What Sonar found" block. The theme pills go; they
  duplicate what the run shows. In their place, **the run**: six stations in
  theme order across the column, each a station label in mono with its glyph.
  A station with a reading is lit (lume label, a short lume bar beneath) and
  its reading appears in the grid below; a station without one is the dimmed
  theme name alone, nothing else written. The featured card and the grid stay
  as they are, ordered by the stations.
- **Focal moment:** on entry, the stations light in theme order, each 90ms
  after the last, the Sonar mark in the header sweeping once at the end. This
  replaces the sweep-on-filter. CSS scroll timeline for the reveal, one
  keyframe per station with `--i`; complete without JavaScript, static under
  reduced motion.
- **Continuity:** hover or focus a lit station and its card raises (existing
  `--raise` and border), the card's glyph and the station share the state.
  Hover a dark station and nothing happens; it is not a control.
- **Implementation consequence:** `latestDay()` returns the six themes with
  `null` for the missing ones instead of only the hits; `Found.astro` is
  replaced on the home by a `Run.astro` (stations + featured + grid) and
  remains as is on the Sonar profile until that page is revisited.

- **Amendment (Sơn, 2026-09-04): the portfolio discloses each project and
  its latest thing.** Every portfolio card carries a "Latest" line: the
  project's newest output (for Sonar, the newest reading; for any project,
  its newest diary post if that is newer), with date and title. A project
  may have its own site later: the schema gains an optional `url`, shown as
  its hostname on the card and as a link on the profile. A new project
  therefore appears on the home the day it enters by PROJECTS.md, with its
  own line, before it has a page of its own elsewhere.

## Scope and boundaries

Production-ready, the home only. Anti-goals: a ledger or feed on the home; a
per-theme colour; any live counter; "coming soon" or a written empty state;
scroll snapping; the map on the home.

## States and ranges

- 0 readings: the section renders nothing (rule).
- 1 to 6 readings on the newest day; the typical day is 4 to 5.
- A day with a Vietnamese reading: the card carries `lang`; station labels
  stay English on the English home.
- A day with a diary post: one line under the grid, "On the engine today:
  <title> →", linking to `/diary/<id>/`, in mono, ink-2.
- Two readings on the same theme the same day: the later revision wins
  (existing rule); the other stays in the archive.

## Interaction and layout

Desktop: stations in one row of six, equal widths, above the featured card.
Tablet: same row, labels shorter (glyph plus label, 12px mono). Phone: two
rows of three, the bars still drawn. Header meta stays "2026.09.03 · 4 of 6
themes" and "All N readings →".

## Constraints and open decisions

Astro static, no client framework, JavaScript optional. Contrast floor
4.5:1 on the dimmed station labels: use ink-3 on void, measured. Open, for
Sơn: whether the diary footnote should show at all on the home, or only on
the Sonar profile. Default: show it.
