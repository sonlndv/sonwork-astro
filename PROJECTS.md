# PROJECTS.md — how a project enters the portfolio

The portfolio is the list at `/projects/` and the second section of the home.
Every project has a profile page, a build diary with one post per day, and its
research done by Sonar. This file says who may add one, when, and the exact
format. FILING.md is the same kind of document for readings.

## Who, and when

- **Sơn decides.** A project exists because Sơn said so, in a chat, a note on
  gbrain, or a diary reply. No agent, on any runtime, creates a project
  unasked. As of 2026-09-05 the portfolio is Sonar, Lever and Beacon; Lever
  is the core and the other two serve it. Sonwork itself is the shopfront,
  not a project (gbrain `notes/canonical-son-and-projects`).
- **Any agent may propose one.** Write the proposal as a diary post on the
  project it grew out of (usually Sonar), or as a gbrain page under
  `inbox/`. One paragraph: what it is, what it produces, why now. Then wait.
- **The agent Sơn names builds it.** By default that is Claude, the building
  runtime. Alfred or Fred can do it if Sơn says so; the format is the same.
- **Sonar is never built a second time.** A project uses Sonar for its
  research. It does not get its own engine, desk, or theme list unless Sơn
  changes the themes in `src/content.config.ts` himself.

## The format

One file: `src/content/projects/<id>.md`. The `<id>` is lowercase, hyphens
only, permanent: it is the URL `/projects/<id>/` and the key every diary entry
uses. Pick a short noun (`sonar`), never a date or a version.

### Frontmatter (the build fails without it)

| field | rule |
|---|---|
| `title` | the product name, 2+ characters, as it appears everywhere |
| `tagline` | optional, lowercase, six words or fewer: "the research and writing engine" |
| `order` | the next integer; Sonar is 1; never reuse a number, even after a retirement |
| `status` | `next` (decided, not started) → `building` → `live`; `paused` if Sơn stops it without retiring |
| `summary` | one or two plain sentences, 10 to 300 characters; the portfolio card and the meta description |
| `started` | `YYYY-MM-DD`, the day the first commit for it lands; omit while `next` |
| `themes` | the Sonar themes it draws on, from the six in `src/content.config.ts`; omit if all |
| `url` | optional, the project's own site once it exists; the home card shows its hostname, the profile links it |

### Body (three headings, in this order, nothing else)

```markdown
## What it is
## How it runs
## Where it goes
```

- **What it is.** What the project produces and for whom, in Sơn's voice,
  first person. Say what the name means if it means something. If it uses
  themes, list them.
- **How it runs.** Who does what: Sơn decides, which runtime builds, which
  agents research. Where the output lands on the site.
- **Where it goes.** What is decided about the future and what is not. "The
  next step is not decided" is a valid sentence; a roadmap of guesses is not.

Each section is a bullet list, three to six bullets, one plain sentence or
two each, fragments allowed (Sơn, 2026-09-04: short, raw, no journal prose).
The plain meaning comes before any name. Length: 100 to 300 words. No
headings other than those three. No images, no tables, no code. The voice rules in AGENTS.md apply: plain, direct, no em
dashes, no emojis, none of the banned words, never the employer's name, never
"ChatGPT", never a claim that Sơn runs a business.

### The first diary entry, the same day

`src/content/journal/YYYY-MM-DD-<id>.md` with `project: <id>`, `date`,
`title`, `author` (the agent's own name). It opens with what was decided and
why, the way a reading opens with its finding. From then on: one post per
project per day that something changed, never a summary of nothing.
Each entry is its own page at `/diary/<file-name>/`.

### What the site does on its own

Nothing else is edited for a project to appear. The home's portfolio grid,
`/projects/`, the profile page at `/projects/<id>/` and its diary list all
read the two collections. The three-step "Find, Research, Publish" block
shows only while `status` is `live`.

### Marks

A project has no icon until Sơn locks a mark for it, the way Sonar's was
locked on 2026-09-03. Until then the profile shows the title alone. Never
draw a placeholder mark, never reuse Sonar's, never use LS15 or the Alfred
ribbon for a project.

## The same commit

- `PRODUCT.md`: the portfolio list under "The home thesis".
- gbrain: a page `projects/sonwork/<id>` mirroring the profile, and the
  portfolio list on `projects/sonwork`. If the brain is not reachable, say so
  in the diary entry and push the page when it is.
- Commit message: `project: <title>` with one line of body on what Sơn
  decided and when.

## Before saying it is done

1. `npm run build` and `npm run check` pass. The build is the schema gate.
2. The profile and the home portfolio look right on desktop and phone: the
   headless browser at `~/.claude/skills/gstack/browse/dist/browse` against
   `http://localhost:8790`. Both cards sit on the column; nothing bleeds.
3. Search the new files for `placeholder`, `sample`, `lorem`, `TODO`,
   `example.org`. Any hit means it is not done.
4. The push deploys through GitHub Actions; the run must be green, and green
   means the page is live.

## Retiring a project

Never delete. Set `status: paused` if Sơn may come back to it. If it is
over: `git mv` the file to `.impeccable/retired/`, add it to the stopped
list in AGENTS.md and PRODUCT.md, write one diary entry on the project it
belonged to saying it was retired and why, and update the gbrain portfolio
list. Its `order` number is not reused. F1 YouTube, retired 2026-09-03, is
the precedent.
