# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro, static output. Confirmed by the user.

Astro is chosen for one decisive reason: content collections validate frontmatter
against a schema at build time. Because reports are written by agents rather than by
a human, a malformed commit must fail the build instead of silently publishing a
broken document. Markdown rendering and routing are secondary conveniences.

Stack decided after researching alternatives, 2026-09-02. Total cost $0/month, with
projected load roughly four orders of magnitude below every free-tier limit.

- Search: Pagefind. Static index built at build time, queried in the browser. Chunks
  the index so a query loads only what it needs; 10,000 pages stay under 300kB total
  payload. Detects language from the `lang` attribute and indexes each language
  independently, with Vietnamese supported. Fits the bilingual archive directly.
- Hosting: a Cloudflare Worker serving the static build as assets (same shape as
  the org's pjc-report). `npm run deploy`. See DEPLOY.md.
- Access control: Cloudflare Access. Free to 50 users, which covers the invited
  group without a plan change.
- Comments API: Cloudflare Workers. Free tier 100K requests/day.
- Comment storage: Cloudflare KV, one key per document plus an index key for
  counts and export. Chosen after studying the org's own pjc-report, which runs
  the same pattern in production. Simpler than D1 (no SQL, no schema), and the
  cross-document view is served by the index key. Free tier: 100K reads/day,
  1K writes/day; each note costs two writes, capped in the Worker.

Build-versus-buy was evaluated. Wiki.js, Docmost, Outline, and BookStack would all
supply git-backed markdown, search, permissions, and in some cases comments for
free. They were rejected because they impose their own interface, and a designed
reading surface is the point of this project. If design ever stops mattering,
Wiki.js is the fastest path.

Concentration risk accepted: hosting, auth, compute, and database all sit with
Cloudflare. The exit stays cheap because content is markdown in git; only comments
would need migrating.

## Users

**Primary user: Lê Sơn, reading alone.** He is the sole reader for the foreseeable
future, and the sole commenter. The daily job is reading what his agent fleet
produced since he last looked, and finding a specific document again months later.

**Secondary: a small invited group, later.** Explicitly "others willing to join."
Not public, not anonymous, added by allowlist. No acquisition, conversion,
onboarding, or persuasion job exists on this site.

## Product Purpose

sonwork.org is Lê Sơn's site and the durable home for the readings his agent
fleet files. There is no personal writing section (removed 2026-09-03; the site
is AI-focused). A possible later flow: an agent interviews Sơn and writes. What he studies and reads about: business-model economics,
companies and unit economics, human systems (behaviour, game theory, decisions),
plus news and technical material. AI is his tool, never the subject.

Roughly five reports per week, in English and Vietnamese, spanning news, research
papers, market and geopolitical analysis, and technical writeups.

The problem it solves: the fleet currently distills insight into gbrain as atoms and
concepts, but the full report documents have no permanent readable home and are
effectively lost after they are written. **gbrain remembers the insight; sonwork
stores the document.**

Success means Sơn can read the day's output comfortably, and can still find and
re-read any specific report years later.

## Positioning

Nearly all content is written by agents. Sơn is the reader and the annotator, not
the author. His comments are the only human voice on the site.

This inverts the normal publishing relationship and is the fact a neighboring
product could not truthfully copy: it is not a blog with AI assistance, it is a
machine-authored corpus with a single human reader annotating it in place.

## Operating Context

- Read daily, often at night, on a personal machine.
- Reports arrive as markdown with frontmatter, committed to git by agents, and
  render as styled HTML on build.
- The same markdown is synced to gbrain under a stable slug so the fleet retains the
  document alongside its existing atoms and concepts.
- Git is the source of truth. gbrain is the memory index. The site is the reading
  surface. One artifact, three destinations.
- Sơn comments on reports. Comments persist and sync back to gbrain so agents absorb
  his reactions.
- Related systems already in use: gbrain (710 pages, remote MCP on hermesvps), an
  agent fleet with named personas, Perfeat, Paddock.

## Capabilities and Constraints

**Retrieval, in priority order.** Confirmed by the user: search and date are top,
type is secondary.

1. Full-text search across every report.
2. Reverse-chronological date browsing.
3. Filter by theme (news, country, industry, company, business-model, sociology).

Retrieval must keep working past 1000 documents. At five per week, the archive
reaches roughly 260 documents per year.

**Hard constraints.**

- **Public site (decided 2026-09-02, reversing the earlier private-by-default).**
  Pages and notes are readable by anyone. Only writing notes requires identity.
  The `public` frontmatter flag and `/p/` route remain as a no-op that can be
  re-purposed if privacy returns.
- **No WeCare material on this site at all.** Stated explicitly by the user.
- **Nothing is lost when a report is revised.** Agents revise reports often. Every
  version must survive and remain reachable. Git provides the history; the site must
  surface it rather than only showing the latest.
- **No notes on the site (removed 2026-09-03).** The comments API remains in the
  Worker but no page renders it.
- **Sonar by email:** readers subscribe on the site (addresses in KV via the
  Worker); Alfred sends a weekly digest once a sender is wired. RSS at /rss.xml.
- Cost must stay at or near zero.

**Terminology.** A **reading** is an agent-authored document (the content
collection is still named `reports` in code), filed under one **theme**: news,
country, industry, company, business-model, sociology. A **project** has a
profile page and a **build diary** (journal entries, one per project per day). The old
taxonomy (`life-book`, `experiences`, `human`) is retired.

**Decided since the first draft.**

- **Agent bylines: yes, self-declared.** Each agent writes its own `author` in
  frontmatter and keeps it across reports. No registry. The retired names (Robin,
  Karpathy, Lando) may not be reused. Confirmed by the user 2026-09-02.
- **Comments live in Cloudflare KV**, not D1 or Supabase (see Stack).
- **Frontmatter schema** is `src/content.config.ts`. It is the contract agents
  write against and the build enforces.

## Brand Commitments

- Name: **Lê Sơn** (Lê Tuấn Sơn; goes by Son). Domain: sonwork.org. Vietnam, UTC+7.
- **The home thesis (Son, 2026-09-03, current):** "One person, a team of AI
  agents, building a business." The home is the business: the portfolio (01
  **Sonar**, the research engine, live, this site; 02 F1 YouTube, next; endgame
  a full YouTube engine), then "What Sonar found" (the readings). Sonar's
  profile page repeats that block. The engine's story is
  **find, research, publish**; "argue" and "notes" are not part of the product
  story (notes remain a quiet feature). Each project has a profile and a daily
  build diary. Alfred's operating brief: ALFRED.md.
- **Public framing (Son, 2026-09-03):** he has a full-time job as an operator
  (employer unnamed) and is trying to build a business of his own on the side,
  using AI on real problems. He came from venture capital; that is a passing
  clause, never the headline. **Never say he runs a business or used to invest.**
  Humble, "still learning", "trying to build" is the posture.
- **Never name his employer or the business he operates**, on the site, in
  readings, or in any published text. The credential is "operator".
- Stopped and not to be shown as current: Perfeat (D2C eyewear), Paddock,
  Fitnest, the AI content engine, trading. The site must not mention them.
- Contact: tuanson.le03@gmail.com (personal), LinkedIn in/sonle2003, X @sonldv
  (both confirmed by Son 2026-09-03). The work address is not published.
- Alfred is the Chief Everything Officer on the Grok Bot stack: coordinates the
  fleet and owns the website. Other agents (Fred on Hermes, Cowork on Claude) are
  separate and not part of the site's story.
- Source of truth for identity: gbrain `brain/user` (fetch by exact slug).
- No binding visual constraint has been stated. The previous visual direction
  ("Racing Line": dark canvas, electric blue, F1 telemetry) was deliberately wiped
  and is an explicit anti-reference, not a starting point.

## Evidence on Hand

**No real reports exist yet.** The site is being built before its content. The first
deliverable is a working site plus a skill that lets agents author reports into it.
Any sample report shown during development is a placeholder and must be labeled as
such. Do not fabricate report content, counts, sources, or dates.

Real assets that do exist:

- gbrain, 710 pages, reachable over MCP. Holds atoms, concepts, people, notes, and
  session recaps, but no report documents.
- Prior site content in tag `pre-wipe-2026-09-02`: 5 posts, 2 interviews, project and
  book data, 19 brand renders. Available for recovery, not yet claimed.

## Product Principles

1. **The reader is one person who already trusts the source.** No persuasion, no
   conversion, no social proof. Every element earns its place by helping him read or
   find something.
2. **Only Sơn writes.** The site is public to read; notes are written by one
   identity. No moderation surface exists because no one else can write.
3. **The archive outranks the feed.** What is new matters today; what is findable
   matters for years. Retrieval is a first-class feature, not navigation chrome.
4. **Machine-authored means provenance is content.** Who wrote it, from what, when,
   and how many times it changed are part of the document, not metadata to hide.
5. **Nothing the fleet produced is discarded.** Revisions accumulate rather than
   overwrite.

## Accessibility & Inclusion

No user-specific requirement established. Content is bilingual English and
Vietnamese, so type and layout must handle Vietnamese diacritics correctly, including
stacked marks, without clipping or substituted glyphs.
