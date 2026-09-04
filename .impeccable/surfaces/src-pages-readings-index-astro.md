---
version: 1
slug: src-pages-readings-index-astro
primary_target: src/pages/readings/index.astro
related_targets: ["src/components/Field.astro", "src/components/ReportRow.astro", "route:/readings"]
mode: operate
status: proposed
date: 2026-09-04
---

# Readings: the map is the way in

## Job and audience

Sơn, months later, finding a specific reading again; the invited reader
browsing what exists. Retrieval order is fixed by PRODUCT.md: search, then
date, then theme. Visitor mode: Operate. The map serves the date and theme
jobs; ⌘K stays the search.

## Outcome and proof

A reader can see the whole archive at once, narrow it by theme and language
without leaving the map, land on a reading in two moves, and always fall
back to the list. Proof is the archive itself: every node is a real reading.

## Selected direction

- **The map becomes the instrument, not an illustration.** It moves directly
  under the title, grows to 360px on desktop, and takes the filters into its
  frame: the six row labels on the left are the theme filter (click a label to
  keep that theme, click it again to clear; one at a time); the language
  toggle stays as the two buttons, moved to the map's top-right corner. The
  old filter bar goes.
- **Preview, not tooltip.** Hover or focus a node and a preview line appears
  pinned along the map's bottom edge: glyph, title, dek trimmed to one line,
  "by fred on Hermes", date. It replaces the floating SVG label. Click opens
  the reading. Nodes are links, so keyboard users get the same preview on
  focus and Enter to open.
- **The axis reads.** Month ticks in mono along the bottom, the first and
  last dates at the ends, "today" marked. Rows keep their hairlines.
- **The list stays the ledger.** Below the map, grouped by year as now,
  reacting to the same filters, with the linked hover (row lights node, node
  lights row) kept.
- **Density plan, decided now:** up to 120 nodes, one dot each; above that,
  readings on the same day and theme merge into one dot with a count in its
  halo; above 600, the axis switches to weeks and the merge is per week. All
  server-side; the preview then lists the merged titles.
- **Focal moment:** on first paint the dots arrive along the time axis, left
  to right, 400ms total, once. Everything else is state feedback.

## Scope and boundaries

Production-ready, `/readings/` only. The map does not appear on the home
(Sơn: the home stays for the visitor). Anti-goals: zoom or pan, a canvas or
charting library, a colour per theme, node labels always on, a legend box.

## States and ranges

- 1 reading: axis still spans thirty days, one dot.
- 4 readings on one day (today): four dots in a column; the preview
  disambiguates.
- 260 a year, 1000 over four years: the density plan above.
- Filter with no matches: the map dims everything, the list shows its
  existing "nothing matches" line, the count reads "0 of N".
- Vietnamese only: labels stay English on the index; the preview shows the
  Vietnamese title as written.

## Interaction and layout

Desktop: map 360px tall, full column; preview line 44px under it; list
below. Phone: map 220px, row labels remain tappable, the preview stacks under
the map and stays until the next tap; language buttons above the map.
Reduced motion: no arrival, instant dimming.

## Constraints and open decisions

Server-rendered SVG, one small script for filters, preview and linking; the
page is complete and navigable with the script off (nodes are links, the list
is full). URL keeps `?type=` and `?lang=` as today. Open, for Sơn: none. The
one judgment call left to the builder is the preview typography.
