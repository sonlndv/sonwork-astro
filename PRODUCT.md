# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who come across Son's work: developers, people in the Omarchy and coding-agent tooling world, and possible collaborators. They arrive from a post, a repo or a link, and decide in a few seconds whether the work is real and worth following.

## Product Purpose

Son. (sonwork.org) is Son's About-first personal site: trying AI to automate parts of work, build useful things and share what he learns through notes, visual explanations and small examples. Newsletter signup is disabled. Closed newsletter information remains at `/subscribe`, not on the homepage.

## Positioning

Son is learning by trying. Explain the difference between an idea, a local teaching simulation and a verified result; do not imply expert credentials, continuous thinking, live telemetry or completed work from usage. The site shares what worked, what did not and what remains uncertain.

## Operating Context

- Static Astro 7 site, with MDX collections for series and nested notes as well as retained posts, work, side-projects and pages. Shared primary navigation is About Me `/`, Writing `/writing` and native Contact `mailto:son@sonwork.org`. Series and Project remain available as explicitly unfinished footer destinations.
- Son's current review amendment leaves Series empty: only its heading and Coming soon inside shared chrome. About has no Series teaser. Retained Series URLs show the same generic state and metadata, never retired topic titles or a curriculum. Compatibility slugs live separately from the five tool identities/purposes. All MDX drafts/history remain untouched; draft-derived routes stay noindex in preview and absent from release.
- Writing is a useful primary destination with its existing approved Note; `/work`, `/about`, `/subscribe`, RSS and deliberate legacy redirects remain reachable archives. About has a compact wrapping public contact row: email son@sonwork.org, X @sonldv, GitHub sonlndv and LinkedIn in/sonle2003. Distinct profile spellings are intentional. Contact remains a truthful mailto, never a form or outgoing message.
- Content is written first and flipped from `draft: true` by Son once he approves it. Preview builds use `SHOW_DRAFTS=true`.
- The launch keeps signup disabled with no PUBLIC_SIGNUP configuration. `/subscribe` shows a notice, not an editable form; Home omits the closed-signup section. Retired newsletter links retain truthful contact information at `/subscribe` and never claim an unsubscribe succeeded.
- About, Trivia Hub, Keymarchy and Perfeat are approved for publication. The three original posts remain drafts; the separately approved Note is published and supplies the single production RSS item.
- The new conceptual note remains `draft: true`, labelled private preview. Design approval and a passing local build do not approve publication. The Project page remains an honest Coming soon surface.
- Static file output uses canonical URLs without trailing slashes. The existing Cloudflare Worker serves current assets, redirects mapped old pages, returns 410 for retired APIs/assets, and keeps ordinary unknown paths at 404. Legacy readings remain preserved in the public Git parent history.

## Capabilities and Constraints

- Mobile-first. Visitors often arrive on a phone.
- Lighthouse preserves the existing mobile performance floor of 98 and accessibility/SEO floors of 95 on every public page, median of three runs. Intentional draft noindex is asserted instead of public SEO, with the same performance/accessibility floors. Fonts are self-hosted; no render-blocking third-party CSS.
- A simple five-tool row previews a short purpose on hover/focus and selects it on click/tap/keyboard. Below it, the real public GitHub profile contribution calendar uses the approved deterministic snapshot: 365 UTC dates, 16 Nov 2025–15 Nov 2026, 2,165 contributions, captured 15 Nov 2026. These are contributions, not commits-only or completed work. Its outer frame aligns with other sections; natural cells do not stretch. Visible UI is only heading/calendar/legend and contextual selected-date feedback. Preserve source date/count/intensity and capture/coverage/metric provenance nonvisually. Builds remain deterministic and offline. Son approved the fixed-account official GitHub API with a runtime-only dedicated public-read credential, a 15-minute server cache and last-good/snapshot fallback; see docs/GITHUB-CALENDAR-API.md. The browser refreshes the same-origin calendar while visible, with no cron or instant-realtime claim. Missing credentials remain an honest snapshot. The final UTC day may be partial.
- The old conceptual reader/simulation source remains retained for future reuse, but current Series visitor paths do not render it. Its earlier browser contract is preserved as a non-executable historical reference. No account/model/tool requests run from Series.

## Brand Commitments

- Wordmark: Son. Existing domain/repository name: Sonwork. Owner: Son (Lê Sơn).
- Voice: plain, direct, concrete numbers, no hedging, no em dashes, no emojis.
- Never name a client, an employer or a school anywhere public.
- Current approved Doop direction supersedes the old scenery and Space Mono display study: restrained blue, the existing near-black/white themes, exact open-ridge SVG and hairline rules, with 6px control/figure corners. After desktop review on 2026-11-16, Son selected open editorial rules instead of the previously published section frames, with shared margins and content-driven heights on desktop and mobile. Following a centered-content trial, he requested the previous layout with balanced side alignment: left-aligned content within a centered frame and equal outer gutters. Home keeps clear ground without particles or texture; other routes retain their existing material. The font families and approved copy remain intact. No old mascot, mountainscape, planets or decorative dashboard cards. This implementation choice is not a new publication grant.
- Geist is the prose/heading face; Geist Mono is for labels, figures, source-like text and tabular numbers. Both are self-hosted OFL with Vietnamese subsets. See DESIGN.md and THIRD-PARTY-NOTICES.md.

## Evidence on Hand

- Trivia Hub, live at games.sonwork.org: five daily games, first commit 2026-10-13, 265 commits by 2026-10-17 (`src/content/work/trivia-hub.mdx`).
- Three posts (`src/content/posts/`), two side projects, Keymarchy and Perfeat (`src/content/side-projects/`), and two small upstream contribution examples on About (`src/content/pages/about.mdx`).
- Absent and not to be fabricated: testimonials, subscriber counts, client logos, metrics beyond what the content states.

## Product Principles

1. Prove, don't claim: show the shipped thing and its numbers before any adjective.
2. About-first entrance: a concise exploratory introduction, compact public contacts, simple tools and one contribution grid. The empty homepage Project section and repeated footer promise are removed. Series and Project stay sparse Coming soon pages, labelled in the shared footer; Project returns to About instead of another unfinished page. Choosing a tool never chooses a future Series destination.
3. Son's words only: copy comes from the content collections, never invented.
4. Honest status: drafts, pre-alpha and disabled states are labelled as what they are.

## Accessibility & Inclusion

On an untouched calendar, initially expose the most recent dates whenever the full year does not fit. Keep chronological order, counts and natural cell dimensions. Async refresh and initial resizing may retain that view; after pointer, touch, wheel or keyboard interaction, preserve the visitor's position and existing selection/focus behavior. No-JavaScript content retains the complete accessible static data.

General touch targets at least 44px, axe with 0 serious or critical violations, `prefers-reduced-motion` respected, both themes meet contrast. Son's chart-only amendment explicitly retains natural compact calendar day squares, with accurate date/count names, native touch selection, one roving keyboard stop/day-week arrows and browser zoom; do not claim a removed full-size picker or universal minimum-size certification. No-JS exposes every date/count in a nonvisual semantic table. Calendar scrolling stays inside its labelled region; hidden data introduces no focusable controls or visible explorer panel.
