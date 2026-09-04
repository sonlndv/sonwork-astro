---
project: sonar
date: 2026-09-03
title: The trust-layer review, split into four filed readings
author: fred
---

Sonar's daily review for 2026-09-03 arrived as one HTML page: "The Trust Layer:
Identity, Verification, and Who Gets to Vouch for What", five chapters, 65
sources. A single page is not how the site stores a reading, so it was split
into four reports, one per theme, and filed.

## What was filed

- `2026-09-03-agent-identity-infrastructure` (news): agent identity became
  infrastructure while courts undercut its legal basis. 22 sources.
- `2026-09-03-clear-reusable-identity` (business-model): CLEAR sells reusable
  identity, but airports still own distribution. 12 sources.
- `2026-09-03-india-identity-stack` (country): India's identity stack cut
  welfare leakage, pushed fraud upstream. 16 sources.
- `2026-09-03-trust-layer-profit-pools` (industry): trust profits accrue to
  data registries, not verification vendors. 15 sources.

## How it was done

The HTML carried its structure in classes, so the split was mechanical, not a
rewrite. Each `section.chapter` became one report. `chapter-label` mapped to the
schema theme, `h2` to the title, `p.summary` to both the dek and the opening
paragraph. The visual blocks converted to markdown headings rather than being
dropped: `metric-grid` to "The numbers", `flow` to "How the mechanism moves",
`data-table` to "Unit economics", `compare` to "Data comparison",
`value-chain` to "Value chain", `bars` to "Profit pool", `ul.analysis` to
"Evidence and analysis". Every `sources` anchor went into the frontmatter
`sources` array and a linked list at the foot. No claim was reworded and no
number was recomputed.

Filed under `author: fred`, `revision: 1`, `lang: en`.

## Two things the split had to fix

**The Society chapter was empty.** It carried a label and nothing else: no
heading, no summary, no bullets, no sources, 340 characters of markup against
13,000 to 19,000 for its siblings. It was not filed. Four readings, not five.
Whatever produced this review failed the sociology desk silently and still
rendered the page, which is worth fixing upstream: a desk that returns nothing
should be visible as a failure, not as a blank section.

**Deks overflowed the schema.** `reports` caps `dek` at 400 characters and the
chapter summaries ran 727 to 873. Each dek was cut at the last full sentence
under the cap, and the full summary survives as the reading's first paragraph.

The HTML also used em dashes throughout, which AGENTS.md bans. 149 were
replaced across the four files: colons where the dash introduced a value,
commas elsewhere. Checked afterwards for emojis and the banned-word list, both
clean.

## Verified

`npx astro sync` then `npx astro build`: 13 pages, all four readings rendering
at `/readings/2026-09-03-*/`. The build is the schema check, so the frontmatter
is known good rather than assumed.

Recorded by Fred (Hermes).
