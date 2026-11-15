# Son. Doop design system

Current private implementation direction. Design selection, technical validation, Son/Ultron's creative acceptance and publication permission are separate.

## Purpose and route types

Mode: **Read**, with an About-first introduction. A record of learning, not a dashboard, expert manifesto or complete curriculum.

- About Me `/`: unchanged single-column introduction, compact public contact row, simple five-tool purpose selector, one verified GitHub profile contribution grid and sparse Project link. No Series preview or teaser.
- Series `/series`: only the Series heading and Coming soon within shared chrome. Son will choose future topics; no named plans, counts, dates, articles or curriculum.
- `/series/[series]` and `/series/[series]/[note]`: retained current URLs use that same generic component and metadata. MDX source/history stays intact; draft-derived routes remain noindex in preview and absent from release.
- Project `/project`: honest Coming soon, not invented projects or promises.

`/writing`, `/work`, `/about`, `/subscribe`, RSS and deliberate legacy redirects remain reachable archives, not competing primary navigation. Only the exact `/series` and `/series/` index paths supersede their historical redirect to Writing. The historical CSV stays unchanged; asset and Worker projections omit that index, and packaged HTTP checks require the actual Series page. Legacy series-detail redirects remain intact.

## Identity and material

Use **Son.** and the exact selected native open-ridge SVG: viewBox `0 0 48 36`, path `M5 28 L18 7 L28 22 M25 17 L31 11 L43 28`, currentColor stroke 2.5, round joins/caps. The mark is decorative within the text-labelled home link. No old mascot, scenic mountains, planets or ambient sky layers.

Approved Doop exports and provenance live in private task evidence. The product uses native HTML/SVG, not Doop custom elements, prototype handlers or embedded screenshots. mdxcn's compatible plain-text ordered-flow grammar is selectively adapted; no React, Next or motion runtime is introduced. See THIRD-PARTY-NOTICES.md.

Source of truth: `src/styles/global.css`.

| Role | Dark | White |
|---|---|---|
| Page | `oklch(0.115 0.022 256)` | `oklch(0.985 0.004 250)` |
| Figure/control surface | `oklch(0.15 0.026 255)` | `oklch(0.962 0.008 250)` |
| Primary ink | `oklch(0.965 0.006 250)` | `oklch(0.19 0.03 256)` |
| Muted ink | `oklch(0.7 0.02 252)` | ink 73% mixed into paper |
| Hairline | `oklch(0.3 0.008 254)` | ink 22% mixed into paper |
| Blue | `oklch(0.8 0.11 254)` | `oklch(0.36 0.12 258)` |

A local static tactile texture remains behind readable content, pointer-transparent and hidden in forced colours. Figures use quiet surfaces, 1px rules and 6px corners. No glows, decorative gradients or equal-card grids. Warm human-status ink means unfinished/private, not live activity.

## Type and layout

- Geist headings/prose; Geist Mono measurements, labels, source-like figures and tabular numerals. Self-host Latin/Vietnamese subsets and retain OFL notices. No remote font CSS.
- Desktop frame 1040px; reading/copy measure at most 720px. Full-width single-column sections do not imply unreadably wide paragraphs.
- Gutters 24px, reducing to 20px below 380px. Natural page height, never prototype frame clipping.
- About heading: two deliberate lines, blue second line, responsive 36–58px, 1.04 leading. Body 16px/1.65; primary intro 17px; lede 19px/1.55.
- Clear primary/muted hierarchy. Hairline rules and section spacing replace floating cards. Lower series/project rows may use a small label column on desktop, then one column on narrow screens. The About introduction never becomes a two-column lesson.
- Shared links/controls have at least 44px targets in both dimensions, wrap instead of clipping, and retain visible focus. Enlarge text without forcing nowrap or shrinking type.

## Navigation and themes

Primary labels: **About Me / Series / Project**. Series stays current on nested routes. Use real native navigation. About contacts appear directly below the introduction as a wrapping row of visible, keyboard/touch-accessible links: son@sonwork.org, X @sonldv, GitHub sonlndv and LinkedIn in/sonle2003. Preserve exact public hrefs and distinct handles; no cards, form, mail backend or forced new tabs. Footer Contact remains a truthful mailto.

Apply an explicit stored theme before paint, otherwise system preference. Persist through navigation/reload and synchronize storage events. Storage denial is nonfatal. No-JS gets complete system-theme CSS and hides the inactive theme button. Reduced motion removes transitions; forced colours retains native control semantics.

## Simple tools and a truthful contribution calendar

The approved revision replaces the old chart/toggle and stack architecture UI. A simple row/wrap displays gbrain, Hermes, OpenMaus, OMP and Obsidian. Hover/focus previews the supplied short purpose; click/tap/Enter/Space selects one purpose. Names remain visible and a no-JS list includes every purpose. Obsidian uses the exact reference logo locally; there are no connectors, hardware layers or old hidden prototype templates.

Below it is the GitHub profile contribution grid: blue day-square intensities, UTC dates, month labels, fewer/more legend and exact date/count details. Its outer frame uses the same1040px/gutter geometry as header, main, tools, featured content, project and footer; internal cells keep their natural12px size and prose retains its720px measure. The allowlisted local snapshot is pinned byte-for-byte to the selected public source: 365 contiguous dates from 2025-11-16 through 2026-11-15, total 2,165, captured 15 Nov 2026. Contributions are not commits-only, public-repository totals, completed work or live telemetry. The final UTC day may be partial. Source and capture/coverage provenance remain in nonvisual accessible description/data, not visible method/source/help UI; original GitHub intensity levels are retained, not synthesized from unrelated usage records.

The visible section contains only the heading, month/day chart, small legend and contextual date/count feedback when used. The grid scrolls inside its labelled region on narrow screens. Natural compact data-visualisation cells retain native touch/focus, one roving Tab stop and day/week/Home/End keys; Son explicitly removed the visible picker/explorer, both accordions and all obsolete picker JS references. Do not claim equivalent large picker access or universal small-target compliance. No-JS retains every date/count in a nonvisual semantic table and disables nonfunctional square controls. Complete values do not depend on colour or hover. Builds make no network requests. The approved fixed-account read-only API refreshes through the same origin while visible, using a runtime-only dedicated public-read credential, 15-minute server cache and last-good/snapshot fallback; see GITHUB-CALENDAR-API.md. Provider fixtures prove tests, not live authentication. No cron, public deployment or production Secret installation is included.

## Structured writing and local simulation

The collections retain summary/body, lede, parent, order and draft state for future reuse. Parent/directory identity must agree; hidden parents cannot leak public children. Current Series templates deliberately do not render collection prose or old tool-topic definitions. Compatibility slugs are separate from tool identities/purposes and do not imply a publication plan.

Both the preserved Always-on series and conceptual note stay `draft: true`. Their preview URLs show generic Series/Coming soon with noindex, not the old lessons or titles; release excludes both. The original three drafts and approved historical Note/single production RSS item remain unchanged. Series/notes do not silently enter the historical post feed.

The retained reader source explains event → context → scoped action → verification → wait. Its bounded local simulation components and prose remain in source/history, but are not mounted on current Series visitor pages. The old browser lifecycle contract is preserved as a non-executable historical reference rather than left as a misleading active assertion.

## Generated identity assets

`public/favicon.svg` is the native ridge on the dark brand ground. `scripts/generate-brand-assets.mjs` deterministically produces the retained PNG icon/OG endpoints from it: `public/favicon.png` (32), `public/apple-touch-icon.png` (180), `public/icon-512.png` (512), and `public/og.png` (1200×630). Regenerate with `node scripts/generate-brand-assets.mjs`; the asset contract checks dimensions, source mark and decoded-pixel equality. Historical Note/work captures are not regenerated or replaced.

## Verification and acceptance boundary

Active contracts cover all primary and retained Series paths at 320/375/390/768/1440px, both themes and200% text, persistent themes, exact public contacts, native navigation, all five tool purposes, calendar data/details/API, generic Series content and metadata, reduced/no-JS, keyboard and axe. Retired planned-topic/discovery/reader assertions are explicitly superseded by Son's empty-Series request; security, draft/publication, redirect and quality floors are not relaxed. Historical specs remain non-executable references, not silently skipped tests.

Run the full ordered install/check/test/build/production-artifact gate in AGENTS.md/DEPLOY.md on identified source. Public Lighthouse thresholds remain performance 98, accessibility/SEO 95, median of three. Source-confirmed noindex draft notes instead must remain noncrawlable, with unchanged performance/accessibility floors. No route is omitted.

Default to a built snapshot on a verified unproxied loopback port, with noindex/no-store. Any explicitly approved private review origin is recorded separately in task evidence; it does not grant proxy configuration or publication changes. Keep source/byte manifests, real desktop/narrow screenshots, independent code/screenshot reviews and owned-process cleanup in durable task evidence. No automatic tunnel, public endpoint, push, merge, PR, deployment or account/storage change is implied. Physical device, Safari, screen-reader and human creative acceptance stay unclaimed until observed.
