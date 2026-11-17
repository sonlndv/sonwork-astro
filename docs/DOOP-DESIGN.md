# Son. Doop design system

Current implementation direction: Son approved the full private Mounty mockup and explicitly requested publication on 2026-11-17. Mounty replaces the initial Doop typography and material, not the content or editorial composition. The 2026-11-16 selection of old-school rules, consistent alignment, widths, natural heights and responsive spacing remains. Technical validation and release safeguards remain mandatory; publication approval does not authorize unrelated account, storage or data changes.

## Purpose and route types

Mode: **Read**, with an About-first introduction. A record of learning, not a dashboard, expert manifesto or complete curriculum.

- About Me `/`: concise single-column introduction, compact public contact row, simple five-tool purpose selector and one verified GitHub profile contribution grid. The empty Project section is removed; unfinished pages remain in the shared footer.
- Series `/series`: only the Series heading and Coming soon within shared chrome. Son will choose future topics; no named plans, counts, dates, articles or curriculum.
- `/series/[series]` and `/series/[series]/[note]`: retained current URLs use that same generic component and metadata. MDX source/history stays intact; draft-derived routes remain noindex in preview and absent from release.
- Project `/project`: honest Coming soon, not invented projects or promises.

Writing is the primary destination for existing approved notes. `/work`, `/about`, `/subscribe`, RSS and deliberate legacy redirects remain reachable archives. Only the exact `/series` and `/series/` index paths supersede their historical redirect to Writing. The historical CSV stays unchanged; asset and Worker projections omit that index, and packaged HTTP checks require the actual Series page. Legacy series-detail redirects remain intact.

## Identity and material

Use **Son.** and the exact selected native open-ridge SVG: viewBox `0 0 48 36`, path `M5 28 L18 7 L28 22 M25 17 L31 11 L43 28`, currentColor stroke 2.5, round joins/caps. The mark is decorative within the text-labelled home link. No old mascot, scenic mountains, planets or ambient sky layers.

Approved Doop exports and provenance live in private task evidence. The product uses native HTML/SVG, not Doop custom elements, prototype handlers or embedded screenshots. mdxcn's compatible plain-text ordered-flow grammar is selectively adapted; no React, Next or motion runtime is introduced. See THIRD-PARTY-NOTICES.md.

Source of truth: `src/styles/global.css`.

### Approved Mounty material — 2026-11-17

Mounty supplies typography, flat backgrounds and neutral/semantic colours. After reviewing the published Mounty version, Son approved the previous periwinkle blue instead of the original cyan on 2026-11-17. The canonical identity, colour codes, fonts, logo and asset usage are in [BRAND-KIT.md](BRAND-KIT.md). This is a Son. brand adaptation, not the unchanged Obsidian Mounty palette or Flexoki.

| Role | Dark | Light |
|---|---|---|
| Page | `#02050d` | `#f8fafd` |
| Figure/control surface | `#050b16` | `#eef3f8` |
| Primary ink | `#f0f4f7` | `#0b1421` |
| Muted ink | `#abb2ba` | `#333e4c` |
| Hairline | `#2b2e32` | `#b6bfc8` |
| Link/action accent | `oklch(80% .11 254)` / `#8bc1ff` | `oklch(36% .12 258)` / `#0b3a7a` |
| Section heading | `oklch(80% .11 254)` / `#8bc1ff` | `oklch(36% .12 258)` / `#0b3a7a` |
| Minor heading | `#83d5b4` | `#22684e` |
| Bold/code emphasis | `#f5a67d` | `#96502a` |
| Italic emphasis | `#c4b5fd` | `#6c4b99` |
| Unfinished/private status | `#f5b488` | `#9c470d` |

<details><summary>Historical initial Doop material (superseded by Mounty)</summary>

The initial Doop treatment used Geist headings/prose and Geist Mono labels, a 36–58px responsive About heading, 1.65 body leading and a 720px reading cap. Home was flat; inner routes retained static tactile texture. Those typography/material choices and the palette below are historical, not current contracts.

| Role | Dark | White |
|---|---|---|
| Page | `oklch(0.115 0.022 256)` | `oklch(0.985 0.004 250)` |
| Figure/control surface | `oklch(0.15 0.026 255)` | `oklch(0.962 0.008 250)` |
| Primary ink | `oklch(0.965 0.006 250)` | `oklch(0.19 0.03 256)` |
| Muted ink | `oklch(0.7 0.02 252)` | ink 73% mixed into paper |
| Hairline | `oklch(0.3 0.008 254)` | ink 22% mixed into paper |
| Blue | `oklch(0.8 0.11 254)` | `oklch(0.36 0.12 258)` |

</details>

Every route uses the approved flat Mounty ground with no grain, texture, particles, ridge watermark, outer-page frame or mockup controls. Home retains open horizontal hairlines between tools, GitHub contributions and Project, each with a short accent leading segment; the introduction stays unboxed. Header and footer rules share the same contained column edges instead of spanning the viewport. Figures and controls keep quiet surfaces, 1px rules and 6px corners. No glows, decorative gradients or equal-card grids. Warm human-status ink means unfinished/private, not live activity.

## Type and layout

- Space Mono 700 headings, Geist prose, and Space Mono measurements, labels, source-like figures and tabular numerals. Use the exact Mounty font bytes verified against active Obsidian; self-host Latin/Vietnamese subsets and retain OFL notices. No remote font CSS, synthetic bold or Geist Mono substitution.
- Desktop frame 1040px; reading/copy measure at most 68ch. Full-width single-column sections do not imply unreadably wide paragraphs.
- Symmetric gutters are at least 24px at every width, increasing on both sides to the larger landscape safe-area inset when needed. Header, main, section rules and footer share the same edges. Footer padding includes the bottom safe area. Natural page height, never prototype frame clipping.
- About heading: retain its two deliberate lines and accent second line; H1 is 32px at the default root size, Space Mono 700, 1.3 leading and normal tracking. All headings use bold Space Mono with normal tracking; section headings use 1.45rem and H3 1.2rem. Body leading is 1.7; existing body, intro and lede size roles remain.
- Clear primary/muted hierarchy. Hairline rules and section spacing replace floating cards. After reviewing the centered trial, Son requested the previous layout with better alignment on both sides. Tools, purpose feedback, calendar headings and Project content again align to the introduction's left edge inside a centered frame with equal outer gutters. Home's Project uses the same section-heading role as tools and contributions, not an offset label column. The About introduction never becomes a two-column lesson.
- Shared links/controls have at least 44px targets in both dimensions, wrap instead of clipping, and retain visible focus. Enlarge text without forcing nowrap or shrinking type.

### Selected editorial rules and responsive rhythm — 2026-11-16

The homepage-only body class keeps the introduction open and gives tools, contributions and Project real 1px top rules with pointer-transparent 28px blue leading accents. There are no full rectangles, gutter-extending corner marks or fixed section heights. Shared header/footer rules align to the same maximum 1040px column.

One fluid section-space value, 32–48px, separates every section and the footer at a given viewport. Rules have 24px of inner breathing room before their headings; the introduction's top space scales from 48–72px. Smaller groups use the existing 8/12/16/24px rhythm. Contact links and tools wrap from the left; tools retain at least 44px control targets. Purpose feedback and date details may grow without overlapping later sections.

Empty calendar feedback reserves no row or margin, while its live region stays mounted; populated feedback enters normal flow. The no-JavaScript tool list has no trailing margin. Section spacing is measured after real content, not padded by invisible feedback buffers.

Prose retains its 68ch maximum measure. Calendar cells stay at their natural 12px size, and scrolling remains inside the chart's labelled region. Its 3px internal horizontal inset protects focus outlines; it is not a different outer page gutter. Desktop and phone use the same open editorial grammar, with no mobile-only framed fallback. Forced colours hides only decorative accents and preserves the native rules, content and controls.

Private background studies stay outside tracked source and release assets. Their dropdown, styles, artwork and draft-preview server are not production features.

### Restrained editorial motion — 2026-11-17

Son approved a single blue ink trace across each homepage section rule as it first enters view (760ms), with a short leading-accent draw (450ms). Only transforms and opacity animate; real rules and all content remain visible without JavaScript. Each section plays once per page visit. Reduced motion stays static, including when the system preference changes; forced colours hides decorative accents. No motion library, scroll loop, background motion or preview controls ship.

After phone review, tool selection uses immediate static accent text and immediate purpose updates. There is no moving underline, selection border or purpose fade. Existing hover/focus previews, native click/tap/Enter/Space selection, visible keyboard focus, natural wrapping and no-JavaScript purposes remain intact. Mounty changes palette and typography only; shared gutters, section geometry and these motion rules remain unchanged.



## Navigation and themes

Primary labels: **About Me / Writing / Contact** on every route. Writing stays current on its nested articles; Contact is a native mailto and never a current page. The shared footer labels **Series (coming soon)** and **Project (coming soon)**, marks their current section and preserves all existing routes. Project's return action goes directly to About. About contacts appear directly below the introduction as a wrapping row of visible, keyboard/touch-accessible links: son@sonwork.org, X @sonldv, GitHub sonlndv and LinkedIn in/sonle2003. Preserve exact public hrefs and distinct handles; no cards, form, mail backend or forced new tabs. Footer Contact remains a truthful mailto.

### Combined refinement approved on 2026-11-17

Son approved the tighter exploratory copy, useful-destination navigation and recent-first calendar together across the website, including publication through the existing release gates. This supersedes earlier references below to homepage Project content and three homepage section rules: only tools and contributions retain their existing open rules; the footer follows the calendar with the same responsive section spacing. Shared fonts, colours, gutters, authored archive content, drafts and privacy protections remain intact.

The calendar starts at its newest dates when it overflows. The existing controller owns refresh and retains this initial view through content/layout changes until the first visitor interaction, after which the visitor owns scrolling. Counts, UTC chronology, 12px cells, selection, Home/End/arrow keys and accessible no-JavaScript data are unchanged. This does not introduce a new panel, loading animation or data request.

Apply an explicit stored theme before paint, otherwise system preference. Persist through navigation/reload and synchronize storage events. Storage denial is nonfatal. No-JS gets complete system-theme CSS and hides the inactive theme button. Reduced motion removes transitions; forced colours retains native control semantics.

## Simple tools and a truthful contribution calendar

The approved revision replaces the old chart/toggle and stack architecture UI. A simple row/wrap displays gbrain, Hermes, OpenMaus, OMP and Obsidian. Hover/focus previews the supplied short purpose; click/tap/Enter/Space selects one purpose. Names remain visible and a no-JS list includes every purpose. Obsidian uses the exact reference logo locally; there are no connectors, hardware layers or old hidden prototype templates.

Below it is the GitHub profile contribution grid: blue day-square intensities, UTC dates, month labels, fewer/more legend and exact date/count details. Its outer frame uses the same1040px/gutter geometry as header, main, tools, featured content, project and footer; internal cells keep their natural12px size and prose retains its68ch measure. The allowlisted local snapshot is pinned byte-for-byte to the selected public source: 365 contiguous dates from 2025-11-16 through 2026-11-15, total 2,165, captured 15 Nov 2026. Contributions are not commits-only, public-repository totals, completed work or live telemetry. The final UTC day may be partial. Source and capture/coverage provenance remain in nonvisual accessible description/data, not visible method/source/help UI; original GitHub intensity levels are retained, not synthesized from unrelated usage records.

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

Default to a built snapshot on a verified unproxied loopback port, with noindex/no-store. Any explicitly approved private review origin is recorded separately in task evidence; it does not grant proxy configuration changes. Son's 2026-11-17 Mounty approval explicitly requests publication through the existing release gates; private preview alone never grants it. Keep source/byte manifests, real desktop/narrow screenshots, independent code/screenshot reviews and owned-process cleanup in durable task evidence. No unrelated tunnel, account or storage change is implied. Physical-device, Safari and screen-reader verification, and post-release visual verification, stay unclaimed until observed; private Mounty creative approval is recorded above.
