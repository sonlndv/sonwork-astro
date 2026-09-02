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
- One thing has one name: it is a *reading*, the kinds are the six above, the URL
  is `/readings/`. Do not reintroduce "report", "research", "post" in the UI.
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

## Voice

Plain, direct, specific. No em dashes in UI copy. Vietnamese readings are
written entirely in Vietnamese, including title and dek.
