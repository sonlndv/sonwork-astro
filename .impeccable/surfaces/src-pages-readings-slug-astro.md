---
version: 1
slug: src-pages-readings-slug-astro
primary_target: src/pages/readings/[...slug].astro
related_targets: ["src/components/Notes.astro", "src/styles/global.css", "route:/readings/*"]
mode: read
status: proposed
date: 2026-09-04
---

# Reading: text and rail

## Job and audience

Sơn, at night, reading what the engine filed; later, coming back to check a
source or see what changed. Visitor mode: Read. The invited reader gets the
same page minus the notes.

## Outcome and proof

The text is read without interruption, and everything that makes it
trustworthy or revisitable sits beside it, not inside it: where the claims
came from, how far along the reader is, what changed since, what to read
next, and what Sơn thought. Proof: real sources by hostname, the real git
history, real related readings.

## Selected direction

- **Two panes from 1100px.** The text keeps its measure on the left. A rail
  on the right, 300px, sticky below the header, holds in this order:
  1. **The stamp**, moved from above the text: theme, byline with runtime,
     date, reading time, revision with the history link.
  2. **In this reading**: the h2 headings as plain links; the current one
     lume, tracked by the scroll. The 2px progress hairline stays at the top
     of the page; the rail's active heading is its second voice.
  3. **Sources**: grouped by hostname with a count, each hostname expanding
     to its URLs; the count of sources in the heading.
  4. **Next**: up to three related readings, same theme first, then the same
     agent, as small rows (glyph, title, date), never cards.
  5. **Sơn's notes**: the existing Notes component, warm, at the foot of the
     rail. Read-only for anyone but Sơn, as today.
- **Below 1100px** the rail stacks after the text in the same order, minus
  "In this reading". The stamp returns above the h1 as now. Nothing is
  hidden on a phone; Sơn may write a note there.
- **Focal moment:** none new. The reading is the moment; the rail is quiet.
  The active heading and the progress hairline are the only things that
  move while reading.
- **Untouched:** the doc typography, the prose styles, the older/newer turn
  navigation, the revision history link, the source URL rows (they become
  the expanded state of each hostname).

## Scope and boundaries

Production-ready, reading pages only. Diary posts keep their current single
column; a later pass may give them a shorter rail (project, date, other
entries). Anti-goals: a table of contents with numbers; a share bar; reading
stats beyond time and revision; anything that moves the text while reading.

## States and ranges

- No sources: the Sources block is absent, no line saying so.
- No h2 headings: "In this reading" absent.
- One reading only in the archive: "Next" absent.
- Vietnamese reading: rail labels in Vietnamese ("Trong bài này", "Nguồn",
  "Đọc tiếp", "Ghi chú"), reading time as "phút đọc".
- Very long reading (10,000 words, 60 sources): the rail scrolls within its
  own sticky box, the hostnames stay collapsed by default.
- Reader not signed in: notes render read-only with the existing sign-in line.

## Interaction and layout

Rail links are real anchors; the active-heading tracking uses an
IntersectionObserver with the CSS progress line as the no-script fallback.
Hostname rows expand on click without layout jump in the text column. Related
rows use the row hover treatment (`--raise`), no tilt.

## Constraints and open decisions

Pagefind indexing keeps `data-pagefind-body` on the article only; the rail
is excluded so search does not return source lists. Contrast floor applies to
the rail's mono labels. Open, for Sơn: whether the notes stay in the rail or
return under the text on desktop. Default: the rail.
