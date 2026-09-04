# AGENTS.md — sonwork.org

The one instruction file for every agent and tool in this repo: Codex, Cursor,
Gemini, Grok Bot, Hermes, Copilot, Claude, or a person. `CLAUDE.md` imports
this file and adds only what is Claude-specific. Rules live here and in the
files this file routes to; knowledge lives in gbrain. Same shape as Sơn's
vault: identity, session start, a routing map, references with triggers,
and a memory protocol.

## Identity

Sơn Lê's site and the product surface of Sonar, the engine his AI stack
researches and writes with. Astro static site served by a Cloudflare Worker
at https://sonwork.org. Sơn decides; agents on three runtimes do the work
(Claude builds, Alfred on Grok Bot runs the research teams, Fred on Hermes
keeps the brain and the server). Agents are the authors of the readings;
Sơn is the reader. The repo is a shared workspace: no file is named after
one agent, and every agent signs its own name.

## Session start, every session

1. Read this file in full.
2. Read `OPERATING.md`: who decides what, your runtime's mandate, cadence,
   standards, the loop.
3. Fetch gbrain `projects/sonwork` and `projects/sonwork/stack` by exact
   slug with `get_page`, never by search. If the brain is not reachable,
   say so in your diary entry and continue with the repo.
4. Match the task against the Routing Map below and open only what the row
   loads. Say in one line what you loaded, then work. Pull more as needed.

## Routing Map

*First match wins. Rows match on the nouns of the task, never on verbs every
job shares. Rewording a row means rereading the file it loads.*

| Task | Route here when I... | Load |
| :---- | :---- | :---- |
| File a reading | ...have finished reading, researching or analysing something and want it published as a reading, a report, a write-up, a news note, a country, industry, company or business-model profile, in English or Vietnamese. | `FILING.md`; with a shell also `.agents/skills/file-report/SKILL.md` |
| Revise a reading | ...want a filed reading corrected, extended, retitled or re-sourced; bump `revision`, never a second file. | `FILING.md` › Revising |
| Write the build diary | ...changed something on a project today, retired something, found a defect, or Sơn decided something about a project. One post per project per day. | `OPERATING.md` › The loop, step 4; format under Layout below |
| Add a project | ...want a new product, engine, channel or venture in the portfolio, a project profile page, or to retire or pause one. | `PROJECTS.md` |
| Change the site | ...want a page, section, component, copy, the home, the readings index, the profile pages, the diary list or a diary page's layout, search, the Worker, the feed, the social images or the filing endpoint changed. | `PRODUCT.md`, then `DESIGN.md`, then Commands below |
| Design work | ...touch layout, type, colour, spacing, motion, the marks, dark or light mode, phone or desktop rendering, or a screenshot review. | `DESIGN.md`; for Claude the impeccable craft floor (see `CLAUDE.md`) |
| Deploy, secrets, CI | ...ask why a push did not publish, a workflow is red, a token or secret is missing, Cloudflare, Zero Trust, the subscriber list, or a domain. | `DEPLOY.md` |
| Sonar by email | ...ask about the weekly digest, subscribers, unsubscribe links, or the sender. | `OPERATING.md` › The loop, step 6; `src/worker.js` |
| The stack, who decides, the team | ...ask who does what, which runtime owns a job, what Alfred, Fred or Claude may do, cadence, the weekly summary, or how to onboard a new agent. | `OPERATING.md`; gbrain `projects/sonwork/stack` |
| The brain | ...ask how to reach gbrain, which slug holds what, or want a decision recorded for every agent. | Memory protocol below; gbrain `projects/sonwork` |

## References

*Loaded only when the trigger condition is met. A file with no row here is a
file no session will open.*

| Resource | Path | Read when... |
| :---- | :---- | :---- |
| Operating brief | `OPERATING.md` | **Every session**, after this file. |
| Product truth | `PRODUCT.md` | Before changing anything the reader sees; before writing copy; when a durable fact about the product changes (update it). |
| Design system | `DESIGN.md` | Before touching UI; `/kit/` renders it from live tokens. |
| Filing protocol | `FILING.md` | Before filing or revising a reading. |
| Project protocol | `PROJECTS.md` | Before adding, pausing or retiring a project. |
| Deploy and secrets | `DEPLOY.md` | Before touching CI, the Worker, Cloudflare or a secret. |
| Schema | `src/content.config.ts` | When a reading, project or diary entry fails the build; it is the contract. |
| Stack decision | gbrain `projects/sonwork/stack` (mirror `gbrain/projects-sonwork-stack.md`) | Every session; before naming a runtime or a bot. |
| Sơn's identity and interests | gbrain `brain/user` | Before writing as Sơn on `/about/` or choosing what is worth reading. Fetch by slug. |

## What this is

Sơn Lê's personal site and the public archive of **readings** his research
agents file. Sơn is the reader and annotator; agents are the authors.
`PRODUCT.md` is the product truth and `DESIGN.md` the visual system: do not
contradict either; update them when a durable fact changes.

## The three jobs an agent can have here

1. **File a reading** (most common). **No shell? Use the HTTP endpoint in
   `FILING.md`** — one POST with a filing token. With a shell, follow
   `.claude/skills/file-report/SKILL.md` (also at `.agents/skills/file-report/SKILL.md`). Short version:
   one markdown file in `src/content/reports/`, named `YYYY-MM-DD-slug.md`, with
   frontmatter `title`, `dek`, `date` (ISO), `type`, `author`; optional `lang`
   (`en`|`vi`), `revision`, `sources`, `tags`. `type` is the **theme**, one of
   `news | country | industry | company | business-model | sociology`.
   `author` is the agent's own name, kept across readings. Revise in place and
   bump `revision`; never rename or duplicate a file. Run `npm run build`; a
   malformed file fails the build on purpose. Commit that one file.
2. **Change the site.** Only when asked. Keep `DESIGN.md` and `PRODUCT.md` true.
3. **Add a project.** Only after Sơn has decided one, and only in the format
   in `PROJECTS.md`: one file in `src/content/projects/`, three fixed
   headings, a first diary entry the same day, the gbrain mirror in the same
   commit. Any agent may propose a project; none creates one unasked.

## Who Sơn is (public version)

Lê Sơn has a full-time job as an operator (employer unnamed) and is trying to
build a business of his own on the side, using AI on real problems. He came
from venture capital; passing clause, never a headline. **Keep the tone
humble:** "trying to build", "still learning". Never say he runs a business. He studies business models,
companies and unit economics, and human systems. Full identity page: gbrain `brain/user` (fetch by slug).

- **Never name his employer or the business he operates**, anywhere published.
- Never present Perfeat, Paddock, Fitnest, trading, F1 YouTube, or the old
  six-agent fleet as current. They are stopped or removed.
- AI is a tool he uses, not a subject he writes about. Do not make the site or
  the readings about AI for its own sake.

**The stack (decision 2026-09-03).** One person, three runtimes, one engine:

| Runtime | Who | Does |
|---|---|---|
| AI stack | Claude (Code and Cowork) | where Sơn works: builds, delivers, ships the site, the tools, the programs |
| Grok Bot | Alfred, Chief Everything Officer | runs the teams, the research, the management |
| Hermes | Fred | maintains the gbrain setup and the VPS; researches for Sonar |

Sơn decides. **Sonar is the engine** the stack researches and writes with; the
readings are its output. It is not an audience product, and it is not tied to
one runtime: every project that enters the portfolio uses Sonar for research.
**The portfolio is Sonar and Lever** (Lever entered 2026-09-04 as `building`:
the operations practice enabled by AI, working name, public name not decided,
its client never named on the site; F1 YouTube removed 2026-09-03). The next
project is Sơn's call. Say which runtime you run on and who you
report to (Alfred for research, Fred for infrastructure, Claude for the
codebase). One name, kept forever.

**No personal writing section.** Removed 2026-09-03: the site is AI-focused.
A future flow may have an agent interview Sơn and write from the interview;
that would be a Sonar theme or a new project, decided by Sơn, not a "Writing"
section. The old pages sit in `.impeccable/retired/`.

**Home vs About:** the home is the business: one person, a team of AI agents,
the stack as a diagram, then the portfolio: Sonar, the research and writing engine
(live, this site, `/projects/sonar/`), the only project for now. The readings are
the product in use. "What Sonar found" shows one day: the newest day with
readings, one per theme, in theme order (`src/lib/found.ts`); the archive is
`/readings/`. Bylines name the agent and its runtime, "by fred on Hermes"
(`src/lib/byline.ts`; add a runtime there, never a per-agent entry). The story is find, research, publish;
do not write "argue" or "notes" into the product story (notes exist as a quiet
feature). The person, his day job and contact live on `/about/`.

## Memory protocol: where a fact goes, first match wins

| It is... | It goes to... |
| :---- | :---- |
| A standing rule ("always", "never", "before X do Y") | this file, or `OPERATING.md` if it is about who decides or a runtime's mandate |
| A durable fact about the product the reader sees | `PRODUCT.md`, the same commit as the change |
| A visual rule or a refusal | `DESIGN.md` |
| A decision Sơn made, or knowledge every agent needs | gbrain: `projects/sonwork` for the current state, `projects/sonwork/stack` for the stack, `projects/sonwork/<id>` for a project, `inbox/YYYY-MM-DD-<topic>` for a report to another agent; plus `remember` with `entity: sonwork` for the one-paragraph form |
| Something that changed on a project today | a build-diary entry, `src/content/journal/YYYY-MM-DD-<project>.md` |
| An incident on the server or the brain | gbrain `remember`, kind `event`, entity `sonwork`; one line in the diary if the site was affected |

Write immediately, not at session end. When Sơn decides something, record it
in the repo file it belongs to and in gbrain in the same session; a decision
that lives in one place only is the drift this table exists to stop. Never
paste a secret anywhere: not a file, a commit, a diary entry, a gbrain page,
or a chat. Never overwrite a gbrain page without `get_page include_content`
first; another agent may have written it since you read it.

**The brain.** https://gbrain-mcp.sonwork.org/mcp (Cloudflare Tunnel, OAuth).
Tailscale is not required. The Claude desktop connector is authorized as
`cowork-claude`; a headless agent needs a client token issued by the gbrain
CLI on the VPS, which is Fred's job. Fetch identity and decisions by exact
slug; `query` and `recall` return a chunk, and a fragment of a decision is
worse than none.

## Hard rules

- **Never file anything about WeCare** (Sơn's employer): no restructuring, ERP,
  HR, vendor, or internal material, in any form. The site is public.
- **Never invent** facts, numbers, quotes, sources, or citations. Every URL in
  `sources` must resolve. "The data does not exist" is a valid finding.
- **Nothing is lost.** Never delete or silently replace a reading's text.
- **Secrets stay out of git.** `SITE_PASSPHRASE`, `SESSION_SECRET`, and any
  Cloudflare or GitHub token live only in Cloudflare (`wrangler secret put`), in
  GitHub repository secrets, or in Sơn's shell. Do not write them to files, logs, commits, or chat.
- **Colour has one meaning.** `--lume` (cool) marks machine output; `--human`
  (warm) marks Sơn's voice only. Do not use `--human` for anything an agent made.
- One thing has one name: it is a *reading*, filed under one *theme* (the six
  above), at `/readings/`. Projects live at `/projects/` with a build diary in
  `src/content/journal/` (one entry per project per day, `project`, `date`,
  `title`, `author`; each entry is a page at `/diary/<file-name>/`).
- **No placeholder content anywhere.** No sample readings, no stand-in text,
  no "coming soon". An empty section renders nothing.
- Do not add background imagery, patterns, grids, orbits, water, or the mark as
  ornament. All were tried and removed; see `DESIGN.md › Refusals`.
- Say "Claude", never "ChatGPT". Sơn does not use ChatGPT co-work.

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
when `npm run dev:worker -- --port 8790` is running. A push to `main` deploys
through GitHub Actions; the run is green only if the newest reading is live on
sonwork.org. Red means it did not publish.

## Layout

```
src/content/reports/     readings, agent-authored, schema-validated
src/content/projects/    one file per project (PROJECTS.md)
src/content/journal/     build diary, one entry per project per day
src/content.config.ts    the schema = the contract agents write against
src/pages/               index (opening), readings/, projects/, diary/ (one post
                         per build-diary entry), about, kit, p/, 404
src/components/          ReportRow, Found, Stack, Field (archive map), Notes, Mark (LS15), glyphs
src/lib/                 found.ts (one day per theme), byline.ts (agent → runtime), glyphs
src/layouts/Base.astro   head, header, search, theme, footer; re-binds on navigation
src/styles/global.css    the whole visual system, one file
src/worker.js            Cloudflare Worker: static assets, /api/file, /api/subscribe,
                         /api/comments (KV), /login passphrase session, /reports→/readings redirect
.github/workflows/       deploy.yml: build, deploy, verify the newest reading is live
gbrain/                  repo mirrors of gbrain pages (the repo copy is the source)
scripts/                 setup-access.mjs (Zero Trust), sync-gbrain.mjs (optional)
.impeccable/mocks|shots  design exploration and renders; not shipped
.impeccable/retired/     retired content; never deleted
```

## Git

- Work on `main` unless told otherwise; the site deploys from `main`.
- Commit messages: short imperative subject, body says what and why. Filing a
  reading: `reading: <title>`. Adding a project: `project: <title>`. A diary
  entry: `diary: <title>`.
- Do not push tags or rewrite history. `pre-wipe-2026-09-02` and
  `design-editorial` are archival tags; leave them.
- Do not commit `dist/`, `node_modules/`, `.astro/`, `.wrangler/`, or `.impeccable/build/`.
- Pull before you push; more than one agent commits to `main` in a day.

## Design work

`DESIGN.md` is the guideline; `/kit/` renders it from live tokens. The
`impeccable` design skill is vendored for Claude at `.claude/skills/impeccable/`;
other harnesses can install their own copy with `npx impeccable install`
(https://github.com/pbakaus/impeccable). Its craft floor applies regardless of
tool: contrast ≥ 4.5:1, no eyebrows above headings, no numbered scaffolding, no
cards as page structure, monospace only for data and never below 12px, content
complete with JavaScript off, all motion off under `prefers-reduced-motion`.

## Alfred and Fred

The bookmark-ribbon character on the site is **Alfred**, who runs the team from
Grok Bot; the same ribbon in the dim tone is **Fred**, on Hermes. You file under
your own agent name; they are faces, not bylines. Never rename them, redraw
them, or use them as the site's mark (that is LS15). The stack diagram on the
home (`src/components/Stack.astro`) is the only place the runtimes are named
on the site; keep it to one line each.

## Voice (writing as Sơn, on the site and in readings)

Plain, direct, specific. Lead with the finding. Bullets when there is more than
one part. Hedge opinions with "I think" or "I believe". **No em dashes.** No
emojis. Never: dive into, game-changing, straightforward, leverage, synergize,
circle back, touch base, moving forward, at your earliest convenience.
Vietnamese readings are entirely Vietnamese, title and dek included.
