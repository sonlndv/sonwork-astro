# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who come across Son's work: developers, people in the Omarchy and coding-agent tooling world, and possible collaborators. They arrive from a post, a repo or a link, and decide in a few seconds whether the work is real and worth following.

## Product Purpose

Sonwork (sonwork.org) is Son's portfolio and writing site, with a disabled newsletter signup. The entrance is an About page: visitors first understand who Son is and how he builds, then explore real projects or contact him. The newsletter is secondary near the bottom.

## Positioning

Son builds software with coding agents. He decides what gets built and how it should behave, the agents write most of the code, and the tests decide when it is done. Every claim on the site traces to a repo, a commit or a live link, and the writing includes what did not work.

## Operating Context

- Static Astro 7 site, MDX content collections in `src/content/` (posts, work, side-projects, pages). Pages: home, work (with case studies), writing (with posts), about, subscribe, plus RSS and 404.
- Content is written first and flipped from `draft: true` by Son once he approves it. Preview builds use `SHOW_DRAFTS=true`.
- The launch keeps signup disabled with no PUBLIC_SIGNUP configuration. Retired newsletter links lead to truthful contact information and never claim an unsubscribe succeeded.
- About, Trivia Hub, Keymarchy and Perfeat are approved for publication. All three posts remain drafts and production RSS is empty.
- Static file output uses canonical URLs without trailing slashes. The existing Cloudflare Worker serves current assets, redirects mapped old pages, returns 410 for retired APIs/assets, and keeps ordinary unknown paths at 404. Legacy readings remain preserved in the public Git parent history.

## Capabilities and Constraints

- Mobile-first. Visitors often arrive on a phone.
- Lighthouse mobile at or above 95 for performance, accessibility and SEO; fonts self-hosted, no render-blocking third-party CSS.
- Routes and content collections are fixed by the site structure phase; design work changes layouts, components, styles and markup only.

## Brand Commitments

- Name: Sonwork. Owner: Son (Lê Sơn).
- Voice: plain, direct, concrete numbers, no hedging, no em dashes, no emojis.
- Never name a client, an employer or a school anywhere public.
- Colour tokens carry over from the previous sonwork.org on Son's explicit word (2026-10-17): dark navy oklch ground, cyan "lume" accent, dark default with a light theme. Layouts and copy structure are new.
- Style direction from Son (2026-10-18, overrides the old site's fonts): tech-futuristic, straightforward, minimal. Type voice is a square typewriter: one squared, slab-leaning monospace for display and headings. No pixel or bitmap fonts. Hairline rules, square corners (0 to 2px), tabular alignment, a terminal or spec-sheet feel, restrained motion. No glow, no decorative gradients, no shadowed cards, no growth green.
- Faces (chosen 2026-10-18 from Son's shortlist, compared on real content at 390px): **Space Mono** for display, headings and meta, because it is the squarest and most slab-leaning of the five and ships a Vietnamese subset. **Geist** for long prose, because mono body text at 390px gives about 35 characters a line and slows reading. Martian Mono and Sometype Mono were dropped: no Vietnamese subset. IBM Plex Mono and Geist Mono have Vietnamese but read rounder and softer, less square. Both chosen faces are self-hosted OFL woff2 with latin and vietnamese subsets; "Lê Sơn" must render from the face, not a fallback.

## Evidence on Hand

- Trivia Hub, live at games.sonwork.org: five daily games, first commit 2026-10-13, 265 commits by 2026-10-17 (`src/content/work/trivia-hub.mdx`).
- Three posts (`src/content/posts/`), two side projects, Keymarchy and Perfeat (`src/content/side-projects/`), and two small upstream contribution examples on About (`src/content/pages/about.mdx`).
- Absent and not to be fabricated: testimonials, subscriber counts, client logos, metrics beyond what the content states.

## Product Principles

1. Prove, don't claim: show the shipped thing and its numbers before any adjective.
2. About-first entrance: identity and a short first-person summary lead the home page. Projects support that introduction; Contact is reachable and the newsletter stays secondary.
3. Son's words only: copy comes from the content collections, never invented.
4. Honest status: drafts, pre-alpha and disabled states are labelled as what they are.

## Accessibility & Inclusion

Touch targets at least 44px, axe with 0 serious or critical violations, `prefers-reduced-motion` respected, both themes meet contrast.
