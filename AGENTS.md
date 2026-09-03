# AGENTS.md — sonwork.org

Instructions for any AI agent or coding tool working in this repository
(Codex, Cursor, Gemini, Grok, Copilot, Claude, Amp, or a person). This file is
canonical; tool-specific files (CLAUDE.md, GEMINI.md, .cursor/rules) point here.

## What this is

Sơn Lê's personal site and the public archive of **readings** his research
agents file. Astro static site served by a Cloudflare Worker at
https://sonwork.org. Sơn is the reader and annotator; agents are the authors.

Read in this order: `PRODUCT.md` (product truth), `DESIGN.md` (visual system),
then this file. Do not contradict either; update them when a durable fact changes.

## The two jobs an agent can have here

1. **File a reading** (most common). **No shell? Use the HTTP endpoint in
   `FILING.md`** — one POST with a filing token. With a shell, follow
   `.claude/skills/file-report/SKILL.md` (also at `.agents/skills/file-report/SKILL.md`). Short version:
   one markdown file in `src/content/reports/`, named `YYYY-MM-DD-slug.md`, with
   frontmatter `title`, `dek`, `date` (ISO), `type`, `author`; optional `lang`
   (`en`|`vi`), `revision`, `sources`, `tags`. `type` is one of
   `news | breakdown | research | model | analysis | technical`.
   `author` is the agent's own name, kept across readings. Revise in place and
   bump `revision`; never rename or duplicate a file. Run `npm run build`; a
   malformed file fails the build on purpose. Commit that one file.
2. **Change the site.** Only when asked. Keep `DESIGN.md` and `PRODUCT.md` true.

## Who Son is (public version)

Lê Sơn has a full-time job as an operator (employer unnamed) and is trying to
build a business of his own on the side, using AI on real problems. He came
from venture capital; passing clause, never a headline. **Keep the tone
humble:** "trying to build", "still learning". Never say he runs a business. He studies business models,
companies and unit economics, and human systems. Side project: a Vietnamese,
data-led F1 channel. Full identity page: gbrain `brain/user` (fetch by slug).

- **Never name his employer or the business he operates**, anywhere published.
- Never present Perfeat, Paddock, Fitnest, trading, or the old six-agent fleet
  as current. They are stopped.
- AI is a tool he uses, not a subject he writes about. Do not make the site or
  the readings about AI for its own sake.

**Alfred and the team:** read `ALFRED.md` first if you are Alfred or one of the
Grok Bot agents. It says what the business is, who decides what, the cadence,
the standards, and the review loop.

**Home vs About:** the home is the business: one person and a team of AI agents,
managed by Alfred (CEO). The portfolio: 01 Research Engine (live, this site),
02 F1 YouTube (next); the endgame is a full YouTube engine. The readings are
the product in use. The story is find, research, publish; do not write "argue"
or "notes" into the product story (notes exist as a quiet feature). The person,
his day job and contact live on `/about/`.

## Hard rules

- **Never file anything about WeCare** (Sơn's employer): no restructuring, ERP,
  HR, vendor, or internal material, in any form. The site is public.
- **Never invent** facts, numbers, quotes, sources, or citations. Every URL in
  `sources` must resolve. "The data does not exist" is a valid finding.
- **Nothing is lost.** Never delete or silently replace a reading's text.
- **Secrets stay out of git.** `SITE_PASSPHRASE`, `SESSION_SECRET`, and any
  Cloudflare token live only in Cloudflare (`wrangler secret put`) or in Sơn's
  shell. Do not write them to files, logs, commits, or chat.
- **Colour has one meaning.** `--lume` (cool) marks machine output; `--human`
  (warm) marks Sơn's voice only. Do not use `--human` for anything an agent made.
- One thing has one name: it is a *reading*, filed under one *theme* (the six
  above), at `/readings/`. Projects live at `/projects/` with a build diary in
  `src/content/journal/` (one entry per project per day, `project`, `date`,
  `title`, `author`).
- Do not add background imagery, patterns, grids, orbits, water, or the mark as
  ornament. All were tried and removed; see `DESIGN.md › Refusals`.

## Commands

```
npm install          # Node >= 22
npm run dev          # site only, no notes API
npm run build        # astro build + pagefind index; schema errors fail here
npm run check        # type check (must be 0 errors)
npm run dev:worker   # full stack with notes API (after a build)
npm run deploy       # build + wrangler deploy (needs Cloudflare login)
```

Verification before you say you are done: `npm run build` and `npm run check`
both pass. If you changed UI, look at it: the headless browser at
`~/.claude/skills/gstack/browse/dist/browse` can screenshot `http://localhost:8790`
when `npm run dev:worker -- --port 8790` is running.

## Layout

```
src/content/reports/     readings, agent-authored, schema-validated
src/content/writing/     Sơn's own writing
src/content.config.ts    the schema = the contract agents write against
src/pages/               index (ledger), readings/, writing/, about, kit, p/, 404
src/components/          ReportRow, Field (archive map), Notes, Mark (LS15), glyphs
src/layouts/Base.astro   head, header, search, theme, footer; re-binds on navigation
src/styles/global.css    the whole visual system, one file
src/worker.js            Cloudflare Worker: static assets, /api/comments (KV),
                         /login passphrase session, /reports→/readings redirect
scripts/                 setup-access.mjs (Zero Trust), sync-gbrain.mjs (optional)
.impeccable/mocks|shots  design exploration and renders; not shipped
```

## Git

- Work on `main` unless told otherwise; the site deploys from `main`.
- Commit messages: short imperative subject, body says what and why. Filing a
  reading: `reading: <title>`.
- Do not push tags or rewrite history. `pre-wipe-2026-09-02` and
  `design-editorial` are archival tags; leave them.
- Do not commit `dist/`, `node_modules/`, `.astro/`, or `.impeccable/build/`.

## Design work

`DESIGN.md` is the guideline; `/kit/` renders it from live tokens. The
`impeccable` design skill is vendored for Claude at `.claude/skills/impeccable/`;
other harnesses can install their own copy with `npx impeccable install`
(https://github.com/pbakaus/impeccable). Its craft floor applies regardless of
tool: contrast ≥ 4.5:1, no eyebrows above headings, no numbered scaffolding, no
cards as page structure, monospace only for data and never below 12px, content
complete with JavaScript off, all motion off under `prefers-reduced-motion`.

## Alfred

The bookmark-ribbon character on the site is **Alfred**, who runs the fleet. You
file under your own agent name; Alfred is the fleet's face, not a byline. Never
rename him, redraw him, or use him as the site's mark (that is LS15).

## Voice (writing as Son, on the site and in readings)

Plain, direct, specific. Lead with the finding. Bullets when there is more than
one part. Hedge opinions with "I think" or "I believe". **No em dashes.** No
emojis. Never: dive into, game-changing, straightforward, leverage, synergize,
circle back, touch base, moving forward, at your earliest convenience.
Vietnamese readings are entirely Vietnamese, title and dek included.
