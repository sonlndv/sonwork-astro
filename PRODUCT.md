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
- Hosting: Cloudflare Pages.
- Access control: Cloudflare Access. Free to 50 users, which covers the invited
  group without a plan change.
- Comments API: Cloudflare Workers. Free tier 100K requests/day.
- Comment storage: Cloudflare D1. Free tier 5GB, 5M row reads/day, 100K row
  writes/day. Chosen over Supabase because it deploys inside the same Worker as the
  site, with no second service and no second auth system. Supabase is an equally
  free swap if the Cloudflare dependency should not deepen.
  - Note: since 2026-09-01, D1 free-plan queries hard-fail once daily row limits are
    exceeded rather than degrading. Rate-limit the comment write path.

Build-versus-buy was evaluated. Wiki.js, Docmost, Outline, and BookStack would all
supply git-backed markdown, search, permissions, and in some cases comments for
free. They were rejected because they impose their own interface, and a designed
reading surface is the point of this project. If design ever stops mattering,
Wiki.js is the fastest path.

Concentration risk accepted: hosting, auth, compute, and database all sit with
Cloudflare. The exit stays cheap because content is markdown in git; only comments
would need migrating.

## Users

**Primary user: Sơn Lê, reading alone.** He is the sole reader for the foreseeable
future, and the sole commenter. The daily job is reading what his agent fleet
produced since he last looked, and finding a specific document again months later.

**Secondary: a small invited group, later.** Explicitly "others willing to join."
Not public, not anonymous, added by allowlist. No acquisition, conversion,
onboarding, or persuasion job exists on this site.

## Product Purpose

sonwork.org is the durable home for the reports Sơn's AI agent fleet produces, plus
a small personal surface (About, Writing, Contact).

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
3. Filter by type (news, research paper, analysis, technical writeup).

Retrieval must keep working past 1000 documents. At five per week, the archive
reaches roughly 260 documents per year.

**Hard constraints.**

- **Private by default.** Every report sits behind auth. A frontmatter flag promotes
  an individual report to public. The system must fail closed, never open.
- **No WeCare material on this site at all.** Stated explicitly by the user.
- **Nothing is lost when a report is revised.** Agents revise reports often. Every
  version must survive and remain reachable. Git provides the history; the site must
  surface it rather than only showing the latest.
- **Only Sơn may comment.** No moderation, spam handling, or multi-user identity.
- Cost must stay at or near zero.

**Terminology.** "Report" is the agent-authored document. Content types are news,
research paper, analysis, technical writeup. The old taxonomy (`life-book`,
`experiences`, `human`) is retired.

**Undecided, do not invent.**

- Whether reports carry **agent bylines**. The previous site used a named masthead
  (Karpathy on build, Robin on personal and reading, Lando as editor). The user was
  asked and has not yet answered. Attribution matters more than usual because every
  document is machine-written, so this needs resolving before the report page is
  designed.
- Whether comments live in Cloudflare D1 or Supabase.
- Exact frontmatter schema. To be defined alongside the report-authoring skill.

## Brand Commitments

- Name: Sơn Lê. Domain: sonwork.org.
- Prior identity assets (bio prose, socials `toilaleson`, `son@perfeat.org`) exist in
  git tag `pre-wipe-2026-09-02` and can be recovered. The user has not yet said
  whether to carry them forward or write fresh.
- No binding visual constraint has been stated. The previous visual direction
  ("Racing Line": dark canvas, electric blue, F1 telemetry) was deliberately wiped
  and is an explicit anti-reference, not a starting point.

## Evidence on Hand

**No reports exist yet.** The site is being built before its content. The first
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
2. **Fail closed.** Private is the default state. Publishing is a deliberate act on a
   single document, never a side effect.
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
