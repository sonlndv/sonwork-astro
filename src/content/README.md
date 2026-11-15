# Content

The site's words, as MDX, one folder per content collection. The Astro scaffold (SNW-4) defines the collections in `src/content.config.ts` from the frontmatter below. This README is not rendered.

Everything starts as `draft: true`. Son flips it when he has edited and approved a piece.

## Collections

### `posts/` (Writing page)

| Field | Type | Notes |
|---|---|---|
| `title` | string | The claim, not a teaser. |
| `description` | string, 10 to 200 chars | One sentence for the index, RSS and meta description. |
| `date` | date, `YYYY-MM-DD` | Publish date. Set when Son publishes. |
| `draft` | boolean | `true` until approved. |
| `tags` | string[] | Lowercase, plural where it makes sense. |

### `work/` (Work page, case studies)

One entry: Trivia Hub, the main project.

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `summary` | string, 10 to 300 chars | One or two sentences for the Work page card. |
| `status` | `live` | Only live work gets a case study. |
| `url` | URL | The live product. |
| `started` | date | First commit date. |
| `stack` | string[] | Main tools, plain names. |
| `order` | positive integer | Position on the Work page. |
| `draft` | boolean | |

### `side-projects/` (one compact section on the Work page)

Two entries: Keymarchy and Perfeat. Smaller tools (the Obsidian theme, the Omawrite fork) get one line each on About instead of an entry. Perfeat stays `building` with no `url`.

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `blurb` | string, 10 to 300 chars | One or two sentences. The MDX body may add two more, or stay empty. |
| `status` | `listed` \| `public` \| `building` \| `pre-alpha` | Shown as a label. `listed`: in a public marketplace. `public`: public repo. |
| `url` | URL, optional | A live page, if there is one. |
| `repo` | URL, optional | Public repos only. Never link a private repo. |
| `order` | positive integer | Position in the section. |
| `draft` | boolean | |

### `pages/` (standalone page copy, for example About)

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `description` | string, 10 to 200 chars | Meta description. |
| `homeTitle` | string, optional | First-person home heading, stored on About. |
| `homeIntro` | string, optional, 40 to 60 words | Grounded first-person home summary. Obeys the entry's draft visibility. |
| `homeBuild` | string, optional | Exploration copy for the native What I'm exploring disclosure; field name retained. |
| `draft` | boolean | |

### `series/` and `notes/`

Series live at `series/<slug>.mdx`. Each has `title`, `description` (10–300 characters), optional short `summary` for the About disclosure, `date`, explicit `draft`, and optional `featured` (default false). The MDX body owns its introduction and any figures; the template never inserts first-series-specific prose.

Notes live at `notes/<series-slug>/<note-slug>.mdx`. Each has `title`, `description` (10–300 characters), `lede` (10–500 characters), `series` (the exact parent slug), `date`, explicit `draft`, and positive integer `order`. Parent and directory must agree. Unknown parents and deeper paths fail the build. A draft parent hides all children in release output; preview can show draft parents and notes. Dates and tied feature choices are deterministic.

Son's current amendment leaves Series empty. The index and retained current Series URLs show only Series/Coming soon with generic metadata, not collection copy, planned topics or a curriculum. About has no Series teaser; `src/data/tools.json` contains only tool identities/purposes. The separate `retained-series-slugs.json` preserves compatibility without choosing future topics. All MDX drafts and their flags remain intact for future reuse. Draft-derived preview URLs stay noindex and release output excludes them. Series/notes are not silently added to the historical post RSS feed.

`src/data/github-contributions.json` is the exact allowlisted public snapshot selected for the contribution grid, not content publication or a network collector. It preserves UTC dates/counts/original levels and capture/source provenance. `src/lib/contribution-calendar.mjs` rejects extra fields, gaps, duplicates, invalid values and mismatched totals. Refresh is not automatic; a future manual update needs its own verified source receipt.

## Voice

Son's rules: one idea per post, open with the claim, 300 to 800 words, concrete numbers, no hedging, plain words, end on the point. No em dashes, no emojis. No client, employer or school names. Every claim traces to a repo, a commit or a live link.
