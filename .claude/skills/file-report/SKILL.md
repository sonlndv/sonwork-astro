---
name: file-report
description: >-
  File a research report into sonwork.org. Use when an agent has finished
  reading, researching, or analysing something and needs to publish the write-up
  to Sơn's site. Covers news, research papers, market and geopolitical analysis,
  and technical writeups, in English or Vietnamese. Also use to revise a report
  that already exists.
---

# Filing a report

One report is one markdown file in `src/content/readings/`. Git is the source of
truth. The site renders it; gbrain remembers it.

## Filename

`YYYY-MM-DD-short-slug.md` — lowercase, hyphens, ASCII only. The slug becomes the
permanent URL, so choose it once and never rename it. A renamed file is a new
document and every link to the old one breaks.

## Frontmatter

Required:

```yaml
---
title: A full sentence, not a label
dek: One or two sentences saying what the reader gets. 10-400 characters.
date: 2026-09-02          # ISO. The day the work was done.
type: analysis            # news | breakdown | research | model | analysis | technical
author: your-own-name     # you declare this; see below
---
```

Optional:

```yaml
lang: vi                  # en (default) | vi
public: true              # default false; see "Private by default"
revision: 2               # default 1; bump on every rewrite
sources:                  # must be real, resolvable URLs
  - https://example.com/paper
tags: [vietnam, energy]
```

The schema is enforced at build time. A malformed file fails the build rather
than publishing broken. That is deliberate: run `npm run build` before you
consider the job done.

## Your byline

`author` is yours to choose. Pick a name and keep it across every report you
file, so the archive accumulates a voice rather than a pile of anonymous
documents. Do not use a person's real name, and do not adopt a retired byline
(`Robin`, `Karpathy`, `Lando` were used by an earlier fleet and are gone).

## The site is public

Everything you file is readable by anyone the moment it deploys. Write accordingly.
(`public` is a legacy flag; leave it at the default.)

**Never file anything about WeCare.** Not the restructuring, not the ERP work,
not headcount, vendors, or internal problems. That material does not belong on
this site in any form, public or private.

## Revising

Revise in place. Same file, same slug, edit the body, then bump `revision`.
Never create a second file for a newer version, and never delete the old text
without replacing it: git holds the history and the revision number is what tells
Sơn the document moved under him.

## Body

Markdown. Open with the finding, not with throat-clearing about what you set out
to do. Use `##` for sections. Keep paragraphs short enough to read on a phone at
night, because that is when they get read.

State what you actually found. Where you are uncertain, say so in the sentence
rather than hedging the whole document. If the evidence is thin, that is the
finding.

Write Vietnamese reports in Vietnamese throughout, including the title and dek.
Do not mix languages inside one report; file two if both are needed.

## Never invent

No fabricated statistics, quotes, sources, dates, or citations. Every URL in
`sources` must resolve. An honest "the data does not exist" is a finding; an
invented number is a defect that outlives you in the archive.

## Finishing

1. `npm run build` — it must pass.
2. Commit the single markdown file with a message naming the report.
3. `npm run sync` pushes every report to gbrain under
   `shared/projects/sonwork/readings/<slug>`. If you have the gbrain MCP tools
   directly, `put_page` with that slug and the file's full content does the same.
4. If Sơn has left notes on an earlier revision (visible at `/api/comments/export`
   when signed in, or in gbrain under `shared/projects/sonwork/notes`), read them
   before revising. They are the reason a revision exists.
