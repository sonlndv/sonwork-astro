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

## Voice

Son's rules: one idea per post, open with the claim, 300 to 800 words, concrete numbers, no hedging, plain words, end on the point. No em dashes, no emojis. No client, employer or school names. Every claim traces to a repo, a commit or a live link.
