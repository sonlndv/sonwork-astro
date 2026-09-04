---
project: sonar
date: 2026-09-04
title: How the old research engine was built, and why it is being replaced
author: fred
---

The engine that produced the daily reviews through 2026-09-03 is a single
Python script on the VPS. This is what it does, how it was wired, and where it
broke. Written down because the roster it depended on was deleted on 2026-09-03
and the next engine should not repeat its mistakes.

## The stack

- `~/.hermes/scripts/daily-research-review.py`, 423 lines, stdlib only.
- Workspace `~/research-department/`, with `AGENTS.md` setting the evidence and
  report standards, `cases/` holding one folder per edition, and
  `daily-state.json` keeping the last 60 editions.
- Hermes profiles as the workers: `analyst` did the work, with `company`,
  `economist`, `industry`, `society` and `strategy` alongside it.
- A Hermes cron job, `Daily Learning Brief`, every 60 minutes, no-agent mode,
  script stdout delivered directly.
- Delivery straight to Telegram by raw multipart POST to `sendDocument`, with
  the bot token read out of `~/.hermes/.env`.

## The run

1. Cron fires hourly. `main()` exits immediately unless the local hour in
   `Asia/Ho_Chi_Minh` is 7 and today's edition has not been delivered. The
   hourly schedule is a retry mechanism, not a frequency.
2. `choose_theme()` sends the last 14 themes to the agent and asks for one
   broad anchor for the day, 240-second budget. It returns `{theme, subtitle}`.
   The theme is deliberately loose so each desk picks its own angle.
3. `research_modules()` runs five desks in sequence: AI News, Business Models,
   Economics, Society, Industry. Each gets 600 seconds. Each desk prompt is its
   identity paragraph, the theme, the first-principles instruction, and a strict
   JSON schema.
4. Every desk must return at least 6 findings and 6 sources, each finding
   carrying `claim`, `evidence` and `source_url`. Insufficient evidence must be
   written `UNKNOWN`, never invented.
5. Each desk also fills a `visual_data` block unique to it: AI gets metrics and
   a timeline, Business gets money flows and unit economics, Economics gets a
   comparison and a transmission mechanism, Society gets specialist terms,
   Industry gets a value chain and a profit pool.
6. `render_html()` writes one self-contained HTML file, dark, phone-first, no
   external assets. `send_telegram()` posts it. State records the edition.

Every desk lands as its own JSON in the case folder next to the HTML, so the
data survives the render.

## How the agents were called

```
hermes -p analyst chat -Q --query-file <tmp.md> \
  --in /home/hermesadmin/research-department \
  --run-budget 600 --source tool
```

Fresh subprocess per desk. No session, no memory between desks, no memory
between days. Continuity lived entirely in `daily-state.json` and in the case
folders.

Output was parsed by `extract_json()`, which tries a fenced code block first,
then walks the text brace by brace with a string-and-escape aware depth counter
and returns the first balanced object that parses. That parser is the most
reliable part of the script and the reason it survived flaky agent output for
22 editions.

## Isolation from the brain

`AGENTS.md` makes the workspace a staging area, not a gbrain source. Raw notes,
downloads, drafts and speculative conclusions never enter the brain. Only
Analyst could propose a promotion, and only after final review. That rule held.
Nothing from 22 editions leaked into gbrain unreviewed.

## What broke, and why

**The six desks were one agent wearing six name tags.** `analyst`, `company`,
`economist`, `industry`, `society` and `strategy` shared a byte-identical
6,553-character `SOUL.md` that introduced every one of them as "Analyst". Only
the `profile.yaml` description differed, and the script never read it: it called
`-p analyst` for all five desks and carried the real specialisation in the
`DESKS` dictionary. The profiles were decoration.

**A desk could fail into a blank section.** `research_modules()` catches every
exception and substitutes a stub with `"headline": "Module unavailable"` and no
findings, then the renderer draws it as an empty chapter. On 2026-09-03 the
Society desk produced 340 characters of markup against 13,000 to 19,000 for its
siblings, and the review still shipped looking complete.

The Society failure was subtler than a crash. `society.json` from that day
contains `{claim, evidence, source_url}`: a single finding object, not the desk
envelope. The agent emitted a finding before the wrapper, and `extract_json()`
returned the first balanced object it found, which was the finding. No
exception was raised, so the fallback stub never triggered either. The renderer
asked for `headline` and `summary`, got nothing, and drew a label with a void
under it.

That is the defect worth carrying forward: the parser is greedy and will
happily return the wrong object. It should validate that the object has `desk`,
`headline`, `summary` and `findings` before accepting it, and keep walking if
it does not.

**The 900-second wall.** An earlier company desk on Costco exceeded its budget
and killed the run with `subprocess.TimeoutExpired`. A `resume_pipeline()` path
was added to restart from partial case files rather than redo the whole
edition. The root cause, an agent overrunning its budget, was never fixed.

## Where it stands

The cron is paused, since it shells out to `hermes -p analyst` and every
profile was deleted on 2026-09-03. Hermes now runs one profile.

What is worth keeping: the desk identities and their visual schemas, the
JSON-per-desk case layout, `extract_json()`, the renderer, and the workspace
isolation rule. What is not: six identical profiles, silent desk failures, and
a pipeline that assumes an agent roster it does not own.

Filed by Fred (Hermes).
