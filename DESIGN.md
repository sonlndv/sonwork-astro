---
name: Sonwork
description: Son's portfolio and writing site, set like a ruled spec sheet in a square typewriter voice.
colors:
  void: "oklch(0.115 0.022 256)"
  ground: "oklch(0.15 0.026 255)"
  line: "oklch(0.3 0.008 254)"
  line-2: "oklch(0.245 0.007 254)"
  ink: "oklch(0.965 0.006 250)"
  ink-2: "oklch(0.88 0.014 250)"
  ink-3: "oklch(0.66 0.02 252)"
  lume: "oklch(0.8 0.135 222)"
  human: "oklch(0.82 0.095 55)"
  light-void: "oklch(0.985 0.004 250)"
  light-ground: "oklch(0.962 0.008 250)"
  light-line: "oklch(0.8 0.016 250)"
  light-line-2: "oklch(0.885 0.012 250)"
  light-ink: "oklch(0.19 0.03 256)"
  light-ink-2: "oklch(0.32 0.028 254)"
  light-ink-3: "oklch(0.33 0.024 252)"
  light-lume: "oklch(0.33 0.13 236)"
  light-human: "oklch(0.5 0.13 48)"
typography:
  display:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "clamp(2.75rem, 12.5vw, 7.25rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "clamp(1.875rem, 7vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
rounded:
  none: "0"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.lume}"
    textColor: "{colors.void}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
  input-email:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 12px"
  nav-cell:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "44px"
  status-label:
    textColor: "{colors.lume}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
---

# Design System: Sonwork

## Release Contract Amendment (2026-10-30)

Son has accepted the current look (the living-valley scene with its connected fixed night sky). Earlier private-only staging statuses are historical and stay in the archive. The sky is background art inside the two far-ridge SVGs: sparse stars and curved aurora, cut by the exact far skyline, night only, with no foreground constellation, guide or header drawing. Without JavaScript, and under reduced motion, the same far-SVG sky is the static composition. Son deferred numeric design/GPT scoring; full technical review and testing remain with the parent release process and are not claimed here. Foreground text tokens were lightened slightly (same hues and chroma) to meet 4.5:1 contrast over the scene (light accent `--lume` is now 0.33). Technical-closure update: the specs' literal expectations follow the accepted scene declarations: light ridges #c3d7ee / #98b2d4 / #6a85b2, plane rgba(40,62,108,0.38), rim rgba(40,64,130,0.4); outer-layer rest poses far 34svh − 5svh·depth, middle 44svh − 44svh·depth, near 46svh − 62svh·depth, with the middle layer scaling by 1 + 0.03·ease; the mist sits between the middle and near layers; the sky is inside the two far SVGs; mountains CSS/JS are linked with the `?v=impeccable-1` query. Runtime results are the parent's to report; none are claimed here.

## Overview

**Creative North Star: "The Square Typewriter"**

Sonwork is set like a ruled spec sheet typed on a square typewriter: one slab-leaning monospace for every heading and label, a quiet sans for reading, hairline rules for structure, and a dark navy ground with a single cyan accent. The style comes from Son's direction on 2026-10-18: tech-futuristic, straightforward, minimal. The colour tokens come from the previous sonwork.org; the layouts are new.

Density is moderate. Content sits in ruled rows with tabular numbering and two-column fact tables, not in cards. Nothing floats: there are no shadows, no glows, no gradients and no rounded corners. Depth comes from rules and from a slightly raised field (`ground`) behind the one form.

**Key Characteristics:**
- One monospace voice (Space Mono) for display, headings, nav and meta; Geist only for reading text.
- Hairline rules in two weights of tone (`line`, `line-2`) carry all structure.
- Square corners everywhere (0).
- Cyan lume is the only colour that means "act" or "go".
- Dark by default, with a light theme that mirrors every role; no flash on load.

## Colors

A restrained palette: navy neutrals plus one cyan accent, with one warm signal colour kept for status.

### Primary
- **Lume Cyan** (`lume`, light theme `light-lume`): links, the Subscribe button, the active nav underline, focus rings, status labels. Nothing decorative uses it.

### Secondary
- **Human Amber** (`human`, light theme `light-human`): honest status only. That means the Draft label and the "Signup opens soon." note. Never used for decoration or emphasis.

### Neutral
- **Void Navy** (`void`): the page ground, header and footer.
- **Ground Navy** (`ground`): the one raised field, behind the subscribe form, inline code and code blocks.
- **Rule** (`line`): primary hairlines: header borders, section-head rules, form border, fact table tops.
- **Faint Rule** (`line-2`): secondary hairlines between rows and inside tables and nav cells.
- **Ink** (`ink`): headings, row titles, fact values.
- **Ink Soft** (`ink-2`): prose and summaries.
- **Ink Quiet** (`ink-3`): labels, dates, row indices, placeholders.

### Named Rules
**The One Signal Rule.** Lume marks what can be acted on, nothing else. If an element is cyan, it is a link, a button, a focus ring or a status the visitor can rely on.

**The Honest Amber Rule.** Amber appears only where the site says something is not finished yet (draft, signup not open).

## Typography

**Display Font:** Space Mono (with ui-monospace, monospace)
**Body Font:** Geist (with system-ui, sans-serif)
**Label/Mono Font:** Space Mono

**Character:** Space Mono is squared and slab-leaning, the typewriter in the North Star. Geist stays quiet so long posts read easily at 390px. Both are self-hosted woff2 in latin and vietnamese subsets (`public/fonts/`, SIL OFL), so "Lê Sơn" renders from the face itself.

### Hierarchy
- **Display** (700, clamp(2.75rem, 12.5vw, 7.25rem), 0.95, uppercase): reserved for prominent identity headings; home uses a restrained 2.75rem to 4.5rem name. Index pages use a smaller step (clamp(2.25rem, 9vw, 4.5rem), uppercase).
- **Headline** (700, clamp(1.875rem, 7vw, 3.25rem), 1.08): titles of posts, case studies and About, set as written, not uppercased.
- **Title** (Geist 600, 1.0625rem, 1.19rem from 900px): row titles in contents and lists.
- **Body** (Geist 400, 1.0625rem, 1.7): prose, max 68ch. Summaries step down to 0.9375rem.
- **Label** (Space Mono 400, 0.6875rem, 0.08em, uppercase): nav, meta rows, fact labels, form labels, status labels. Numbers use tabular figures.

### Named Rules
**The Two Faces Rule.** Space Mono and Geist, nothing else. Space Mono never sets running prose; Geist never sets a heading above row level.

**The Preload Pair Rule.** Space Mono 700 latin and Geist 400 latin are the default preload pair. Son explicitly approved two existing self-hosted font exceptions for the motion pass on 2026-10-18, conditional on the final performance gates: Space Mono 400 latin on every page and Geist 600 latin on article pages. Every other file loads on use with `font-display: swap`.

## Layout

One frame: max 1180px, gutter 16px on phones and 32px from 900px. Spacing follows a 4px base (4, 8, 12, 16, 24, 32, 48, 64), with more space above a heading than below it.

- **Header:** sticky. On phones it is a 52px bar (wordmark plus theme toggle) over a 4-cell nav strip with 44px cells. From 720px it becomes one row: wordmark, nav cells and toggle.
- **Front page (About-first):** on phones, Son's name and collection-sourced 40 to 60 word first-person introduction lead. A native What I'm exploring disclosure adds existing About facts without hiding the summary. Selected projects follow, with Trivia Hub primary, then Keymarchy and unlinked building Perfeat. Contact includes visible mailto and a copy-email action with truthful status. One slim newsletter form comes last. From 900px a full-width opening profile band keeps the introduction at a readable 65ch. Selected work supports it below, with Trivia Hub beside compact side-project rows. Contact and newsletter follow below at a restrained 48rem maximum. Nothing is sticky. The name stays at 2.75rem to 4.5rem; summary is Geist 1.1875rem. No giant newsletter masthead.
- **Rows:** a 2.25rem index column (3rem from 900px) and a body column. Each row is separated by a faint rule.
- **Prose pages:** a single left-aligned column at 68ch. The header ends on a rule, or on its fact table.
- **Side projects:** stacked on phones. From 900px they become a 14rem title column beside the text.

## Elevation & Depth

Flat. There are no shadows. Depth is conveyed by rules and by one tonal step: `ground` behind the subscribe form and code. The only inset effect is the 2px lume underline on the current nav cell.

### Named Rules
**The Ruled Not Raised Rule.** Separate with a hairline, never with a shadow or a floating card.

## Shapes

Square corners throughout (radius 0): buttons, inputs, nav cells, tags, labels, code and the form panel. Borders are 1px. The outbound-link arrow and the theme icons are drawn SVG at a 1.4 to 1.5 stroke, square-cornered.

## Components

### Buttons
- **Shape:** square (0).
- **Primary:** lume fill, void text, Space Mono 700 0.75rem uppercase, 48px tall.
- **Hover / Focus:** fill turns to ink. Focus is a 2px lume outline offset 2px.
- **Disabled:** lume mixed 78% into ground, `not-allowed` cursor, and the amber note beside it says why.

### Inputs / Fields
- **Style:** void field, 1px rule border, square, 48px, Geist 1rem. It sits flush against the button, with no gap and no right border.
- **Focus:** the border turns lume, with the outline inset.

### Navigation
- **Style:** ruled cells in Space Mono 0.6875rem uppercase, ink-2. Subscribe is always lume. The current page shows ink text with a 2px lume underline.
- **Mobile:** a 4-cell grid under the bar, every cell at least 44px.
- **Structure:** the wordmark is the Home link and sits inside the Main nav, so every page, Home included, marks itself with `aria-current`. The theme toggle sits outside the nav, top right.

### Ruled Row (signature)
A numbered row (01, 02, ...) with a Geist title, a Space Mono meta line (kind in lume, then date or host), and a summary. The title link stretches over the whole row, so the row is the touch target. Fact tables and secondary links sit above that overlay.

### Fact Table
A two-column `dl`: Space Mono label at 5.5rem, value in Geist with tabular figures. There is a rule on top and a faint rule under each row.

### Theme Toggle
A 44px square, 1px rule border. It shows a sun in dark and a moon in light, and its label names the theme it switches to. It is hidden without JS. A head script applies the stored theme before first paint.

## Do's and Don'ts

### Do:
- **Do** separate content with 1px rules (`line` for structure, `line-2` between rows).
- **Do** set every label, date and count in Space Mono uppercase at 0.6875rem with 0.08em tracking and tabular figures.
- **Do** keep every touch target at 44px or more (nav cells, toggle, inputs, footer links, row overlays).
- **Do** put motion under `prefers-reduced-motion: no-preference` and start from a visible default. The About introduction is static. Rows arrive once on intersection (transform only, 220ms, 4px, stagger capped at 120ms), retaining full contrast throughout and a visible default. Interactive row focus/hover sweeps a cyan rule and shifts indices/arrows (160ms). Theme changes crossfade for 160ms when supported; buttons depress 1px immediately and return in 90ms. Only transform and opacity animate; reduced motion and JS-off retain the complete static page. Theme state and subscription messages/API behavior are unchanged. For stable first-paint geometry, regular Space Mono is additionally preloaded, and article pages preload the existing Geist 600 face; these are the explicitly approved exceptions in the Preload Pair Rule.

### Don't:
- **Don't** round corners, add shadows, glows or decorative gradients, or put content in shadowed cards (Son, 2026-10-18).
- **Don't** use pixel or bitmap fonts, or any third face (Son, 2026-10-18).
- **Don't** use growth green or neon glow (Son, 2026-10-18).
- **Don't** use lume or amber for decoration.
- **Don't** set long prose in Space Mono.

## Current override: site-wide living-valley background

The approved mountain landscape is part of the shared layout and appears on every HTML page: Home, Build, work details, Writing, preview-only drafts, About, Subscribe, the 404 and any future page using `BaseLayout`. There is no per-page opt-in. Each page renders exactly one inert, `aria-hidden`, pointer-transparent, fixed scene (z-index -1) with its single stylesheet and deferred script. Artwork, palette and motion are unchanged. It is static without JavaScript, still under reduced motion, and hidden under forced colors. Only the build-arrival phrase on the Selected projects section remains Home-specific. This supersedes any older wording that treats the landscape as Home-only; the earlier no-gradient rule is not otherwise relaxed.

## Additive contract: connected valley (atmosphere, contextual Mount, same valley)

Additive only: no new art, font, dependency, token, copy, route or storage beyond one non-sensitive preference. The mountain art, palette and original path data are unchanged.

- **Mist.** One soft, thin, cool ribbon passes between the far and near ridges (a separate owned layer inserted at the literal boundary of the two original layers). One finite CSS transform/opacity pass of about 7s, then a 24s quiet interval (never under 20s), driven by one timer in `public/atmosphere.js`; no frame loop, canvas, blur filter or particles. The first pass starts about 1.2s after load, after the scene's own arrival has settled. Home and Build recur; every other page (About, articles, details, 404, drafts) gets a single pass at scroll 0 and then stays still behind the prose. The mountains themselves stay solid.
- **Pause atmosphere.** A native footer button, 44px tall in a fixed box, toggles Pause/Resume atmosphere and is described by a visually hidden live status ("Atmosphere paused/running"). It stops all ambient mist at once, including a greeting pass. The preference persists across routes in `localStorage` when available and works in memory when storage is denied. The slot is reserved before first paint when script and motion are available (laid out, `visibility: hidden`) so revealing it moves nothing; without JS, with reduced motion or in forced colours the control is genuinely hidden.
- **Calm.** A pass never starts while the page is scrolled, focus is in the reading content, the tab is hidden, or the preference is paused. Scrolling, focus, hiding, pausing, reduced motion and forced colours cancel an active pass; returning re-arms one fresh delay and never replays missed passes.
- **Mount reacts to projects.** On Home and Build, hover (fine mouse), native keyboard focus or an intentional touch on a project entry makes Mount look toward it once for at most 560ms with the existing gaze clamp, then return to its original rest. A 1.2s debounce stops repeats on the same entry; it yields to hello, landing, stroll, hop, the footer menu and focused Mount, and never prevents the link.
- **The valley answers hello.** An accepted "Say hello to the mountain" (keyboard or touch alike) emits `sonwork:greet`; on Home/Build at the top, when not paused, reduced, forced, hidden or already running, the same controller starts one answering mist pass at once (`data-source="greeting"`). It queues nothing and the ambient interval is unchanged.
- **Same valley.** A normal same-origin document navigation (referrer on the same origin and Navigation Timing type `navigate`) skips only the repeated draw-in of the mountain rims; first, external, reload and direct arrivals still draw it (`data-arrival` is `first`, `continuous` or `static`). There is no client router, no stored history and no content fade; pages load normally.
- **Reduced, no-JS, forced colours.** The scene is static; no mist, perk, greeting answer or arrival draw runs. Reduced motion, no-JS and forced colours show no Pause control.

## Latest phone-feedback override: content-height opening, legible dark valley

Son's phone feedback (a large empty block before scrolling, and a dark-mode valley too dark to see) supersedes the earlier scenic-height phone opening and the earlier dark ridge tones; the older text above stays as history. Up to 719px the Home opening is content-height: the headline, a small scale-based gap (16px), the native 44px "Selected projects" jump and the introduction sit together, with no minimum-height spacer or space-between distribution. Only mobile decorative spacing shrinks (lead gap 24 to 16px, section gap 48 to 32px); all text, fonts, sizes, copy, markup and routes are frozen, and from 720px the geometry is unchanged. The valley uses the same original paths, framing, transforms and layers; only the three dark navy stops are lifted by about 1.4x tonal separation and the dark rim a little clearer. Light stops, page ground, text and action palette, the veil and every motion mechanic are unchanged. Nothing is published or deployed by this correction.

Addendum (historical, superseded by "Latest override: Valley Rise" below): the transient hello brightness on the ridge edges was capped (peak stroke alpha 0.16 light, 0.60 dark, same hues) to preserve text contrast after the phone reflow puts ridges behind copy. Normal light and dark rim treatment and stops are unchanged.

## Latest override: Valley Rise (phone and desktop)

Son asked for a stronger, more attractive same-theme motion on both phone and desktop. This supersedes, as historical text only, the earlier statements that the first mist starts about 1.2s after load, that the scene intro is at most 800ms, that a first touch or wheel ends the intro, that depth is mapped over the whole document, and that hello brightens the ridge stroke.

- **Same scene, visibly alive.** The original ridge art, markup, fonts, copy, palette and the compact content-height opening are unchanged; at rest the page looks exactly as before. On a fresh, reload or direct arrival at the top, the existing far and near ridges rise in staggered depth (near from min(20vh, 180px) over 1600ms after a 150ms stagger, far from min(8vh, 64px) over 1200ms, opacity always 1) while their original rims trace in. It is done by 1750ms, plays once, and never replays on same-origin navigation or Resume. The first mist pass follows at about 1.75s; the 7s pass and 24s quiet interval are unchanged.
- **First gesture.** Touch, wheel and ordinary scroll do not cancel the entrance and never block controls or scrolling. Keydown, focus, a hidden tab, page hide, reduced motion, forced colours and Pause snap everything to the rest pose at once, with no stale camera, dash or phrase. A stored Pause also keeps the arrival static.
- **Depth.** The far (0 to 24px) and near (+72 to -48px) ranges are unchanged but map over min(scroll span, 0.8 of the viewport height), so an ordinary first swipe shows a clear change on phone and desktop. One passive coalesced frame, no scroll hijacking; reduced, hidden, paused and forced stay still.
- **Hello.** An accepted hello re-traces the original ridge edges (far, then near, about 900ms) with no change to stroke colour or alpha, then restores the solid rims. It uses the same eligibility as the mist (Home and Build, at the top, not paused, reduced, forced or hidden). If an ambient pass is already running, hello still traces and neither restarts nor recounts it; native focus on Mount does not cancel that pass.
- **Release.** A reviewed and tested branch push is authorized; this change is not a public deployment.

## Latest override: R7 clean phone opening (same valley, less friction)

A small presentation refinement; the art, fonts, copy, markup, routes, controllers, storage and Valley Rise behaviour above are unchanged. It supersedes, as history only, the forced two-line phone name and the 32px phone section gap.

- **Name.** Up to 719px the name keeps its exact size (clamp(3.25rem, 15vw, 4rem), line-height 1.04). Only the 4ch maximum and forced balancing are removed, so at ordinary phone sizes it sits on one line. At enlarged text (200% root) it wraps naturally and never overflows; it is never `nowrap`.
- **Section gap.** On phones the gap between the opening and Selected projects is 24px (`--s5`, was 32px) so the whole 44px Trivia Hub title target lands inside an 812px-tall first viewport. Inner gaps, text and targets are unchanged; from 720px the geometry is unchanged.
- **Project feedback.** Home project titles use the site's existing idiom. Keyboard focus-visible turns the title lume and keeps the native outline. Hover colour applies only to a fine hover pointer, so touch never sticks. The project arrow nudges 2px in 160ms (transform only) on focus-visible and fine-pointer hover, only under `prefers-reduced-motion: no-preference`. No new script.
- **Correction.** The current theme-change aperture is 480ms, not 160ms; the theme toggle is untouched.

## Latest R8 daylight-valley design contract (private preview only)

Son approved a clearer light valley while preserving the liked dark version. For this bounded light-only correction, this contract supersedes all earlier light-colour-preservation statements (including unchanged light stops/palette/action colour and the earlier `light-lume` value). Earlier wording remains historical for these values; every other constraint remains in force. A private candidate is saved; final acceptance gates remain required.

- **Exact light targets.** Mountain light arguments: far `#d3deed`, mid `#bfd0e5`, near `#a7bfdc`, plane `rgba(52,74,118,0.07)`, rim `rgba(40,64,130,0.25)`. Set light `--lume: oklch(0.44 0.13 236)` in both the system-light `:root:not([data-theme='dark'])` selector inside `@media (prefers-color-scheme: light)` and the explicit-light `:root[data-theme='light']` selector.
- **Frozen scope.** Preserve every dark value and every other base token. Shared opacity, masks, original artwork and paths, geometry, layout, typography, copy, routes, JavaScript, motion and preferences remain unchanged. Signup, draft status, KV and data remain untouched.
- **Acceptance gates.** Require body and link contrast >=4.5:1 and large-text contrast >=3:1 against the actual composited scenery, including greeting traces; report sampled coverage, not certification. Preserve complete static, reduced-motion and no-JS alternatives, and the forced-colours alternative with the scene hidden. Require source-matched dark rendered parity at identical sizes/states and independent final patch/image visual review before any private promotion. Final-source contrast, parity, tests and independent patch/image review remain required; Son's visual acceptance is unobserved.
- **Delivery limit.** Private preview only; no publication, commit, push, merge or deployment.

## Governing Sky-to-valley contract (approved development phase only)

This contract governs the approved sequential sky-to-valley phase. It records design and verification obligations before UI implementation; it is not evidence of a rendered candidate, a passed check or permission to publish. Architecture A is retained: original owned SVG/CSS and the existing event-driven controller, with no new runtime package, font, mascot, asset service or third-party runtime request.

**Precedence and retained history.** The earlier site-wide living-valley, connected-valley, phone-feedback, Valley Rise, R7 and R8 entries remain historical records. For this approved phase, their requirements to preserve only the existing scene/art/markup/geometry, keep the R8 fixed rest composition, map depth across the short `min(scroll span, 0.8 viewport)` span, restrict changes to light only or preserve exact dark scenic rendering are historical, not competing active restrictions. Their prescribed ambient recurrence, first-pass timing and split progress/ambient ownership also become historical where they conflict with the single owner and route/state rules below. The new world may author original depth layers, scenic framing and scene-scoped atmosphere in both themes. Earlier branch-push wording grants no release authorization here.

All approved factual/site copy, routes, global brand tokens (including the incumbent R8 light action colour), original font bytes, type roles, ruled unboxed content and privacy/publication rules remain protected. The scenic exception below does not permit glow, gradients, shadows, neon or decorative signal colours in UI. Keep the original small Mount, summit identity and native control semantics. All three posts remain drafts; release output excludes them, signup stays disabled and no real mail is sent. Employer/client/school identities must never enter public output or repository scanners/docs; private review inputs stay external. Preserve Git history, archival tags, COMMENTS binding and data, other storage and secrets. No commit/push/deploy, account/DNS/permission/billing or storage action is authorized by this contract.

### One world, three compositions

The real homepage carries one continuous sky -> range -> valley journey, reversed by ordinary upward scrolling. Distinct compositions come from depth, occlusion and framing across real content, not unrelated wallpapers or a tiny repeated background nudge. Never add page height, move content or create a blank scenic hero to prolong the scene; no entrance wait gates reading or navigation.

| Stage | Phone composition | Desktop composition |
|---|---|---|
| Entry / identity | Open sky above low distant peaks; middle and near slopes remain low or lateral. Preserve the compact ordinary R8 opening: original Mount/header, ordinary single-line name, intro, native disclosure and the first full 44px project target at 375x812. | Use the width for open sky and asymmetric distant summit flanks around the existing profile band; retain the readable introduction and visible project access. |
| Range / exploration | As projects enter the reading region, separate original far, middle and near ridges by overlap, tone and different travel rates; near framing advances more than distant peaks. Keep full project glyphs, actions and hitboxes clear. | Spread the range laterally around the unboxed project rows, with identifiable far/middle/near planes and complete defining summits. Keep the middle reading corridor quiet. |
| Valley / Contact and ending | Closer side ridges frame Contact, newsletter and footer while leaving content and controls clear; sky remains spatially above the range. Finish in a deliberately quiet valley pose. | Near slopes enclose a broad valley around the retained Contact/ending layout, with distant peaks still legible above it and a settled, quiet endpoint. |

Retain the original defining summit/path language and recognizable original paths; new depth shapes are original project art, not replacement stock mountains. Compose portrait and wide framing deliberately, with sufficient scenic overscan for every allowed transform: no exposed layer edge, accidental flat cut or clipped defining summit. Short phones and 200% text scroll naturally; retain ordinary R7/R8 content spacing, native targets of at least 44px and natural name wrapping at enlarged sizes. Never force `nowrap` or shrink text to recover scenery.

**Night.** Retain the cool navy identity and original ridge tone relationships. Scene-local far/middle/near roles start from the incumbent dark `#26375d` / `#1e2f53` / `#152549`; they remain distinguishable through the journey. A small family of restrained original cool-blue aurora ribbons may occupy open sky ABOVE the ridges, behind all reading/control layers. Their translucency and quiet rest must be composed against actual content. No neon, rainbow decoration, bright luminous UI, broad blur filters, particles or independent infinite aurora scheduler.

**Daylight.** Deliberate cool daylight uses separated blue-grey ridges, starting from incumbent far/middle/near `#d3deed` / `#bfd0e5` / `#a7bfdc`, with thin daylight haze for distance. Compose daylight independently rather than washing out the night effect. Hide night aurora ribbons in light mode; no daytime night glow. All scenic colours/masks remain local to the scene, with global page, text, link, focus and status tokens unchanged.

**Reading corridor.** Keep one calm composited corridor behind name, prose, rules and actions in every phase, theme and transient response. Use scenic attenuation and framing rather than new cards or opaque hero panels. Assess actual painted glyph backgrounds and full control rectangles, including overlap during motion; token ratios alone cannot prove readability.

### Routes and native interaction

Render exactly one shared fixed, inert, aria-hidden, pointer-transparent world per HTML page, below content. Home is expressive; Build and index routes have restrained progression. About, articles, work details, Subscribe and the genuine unknown-path 404 use calm complete compositions without recurring distraction; private draft previews inherit their route's calm grammar without publication. RSS remains separate from HTML scenery.

Mount retains its original small silhouette, off-white expressive eyes, seats and native hello/project reactions. Existing admitted `sonwork:greet` / ridge-answer and project producers remain bounded and subordinate to content and motion eligibility. Preserve trusted mouse, native touch, keyboard focus and first link activation; scenery never intercepts a hitbox, requires a second tap or overlaps readable glyphs. No mascot redesign or additional autonomous character/scene scheduler.

### Progress, eligibility and lifecycle ownership

Extend the existing event-driven scene/atmosphere controller under ONE progress-and-eligibility owner. The existing atmosphere eligibility boundary must govern scenic responses and progress; scene renderers consume its state rather than keeping competing scroll listeners, frame loops or ambient timers. Mount's existing bounded interaction producer retains its own behavior; it does not become a second scenic controller.

Measure actual opening, projects, Contact and ending landmarks with the sticky header and usable viewport accounted for. Interpolate ordered entry/range/valley poses between those measured positions in both directions. Constrain overlapping landmarks into ordered intervals within the real available scroll span on short pages; if there is no scroll span, use a complete static composition. Raw document percentage alone and the old first-swipe depth span must not collapse the journey. No fabricated spacer or scrollable height.

Invalidate measured geometry after native disclosure toggles, font readiness/changes, content resize, viewport/visualViewport resize or orientation, restored history/pageshow and relevant layout changes. Coalesce passive input notifications into at most one pending event-driven animation frame; batch geometry reads before transform/opacity writes, then stop. Do not poll geometry or keep idle frame/timer churn. Finite decorative responses clean up through real completion/cancellation, respect reading focus and route eligibility, and queue no missed ambient effects.

Preserve native wheel/touch and keyboard scrolling, anchors, focus, browser scroll restoration, deep links, reload and back/forward behavior. Do not prevent defaults, hijack scroll, introduce a client router or override restored positions to stage an intro. Recalculate after restoration at the actual position; normal same-origin navigation/Resume must not replay a consumed entrance. Theme changes preserve progress, pause preference and consumed-event state while repainting the corresponding day/night composition.

| State | Required complete behavior |
|---|---|
| Pause | The existing native footer control freezes current decoration and cancels owned work; native content scrolling/navigation still work. Keep its reserved geometry, truthful label/status and existing non-sensitive preference with in-memory fallback if storage is unavailable. |
| Resume | Align once with current measured geometry and resume only eligible future work; never replay an intro or missed effects. |
| Reduced motion | A deliberately composed, fully visible static route scene; no journey animation, aurora movement, mist, arrival or scenic event response. Content and native controls remain complete. |
| No JavaScript | A complete static day/night composition from authored markup/CSS, fully readable content and ordinary links/disclosure; no misleading motion control or dependency on a script revealing content. |
| Forced colours | Hide nonessential scenery and motion controls; preserve usable native content, focus and control semantics in system colours. |
| Hidden/pagehide | Stop owned frames, timers and finite effects, retaining coherent progress/preferences. On visible/pageshow, remeasure actual position without a catch-up burst, stale camera offset or replay. |

Pause must cover all owned nonessential scene motion, including greeting responses, depth/camera and aurora. Reduced/forced states take precedence over Resume. Static/reduced/paused outcomes must look intentionally finished at entry, range and ending; no half-drawn rims, missing layers or essential text lost to an effect.

### T02 evidence prerequisite

T02 must resolve the actual Mount timing hold before later UI work. The observed `perk()` producer admits the pose, records activation and owns a 560ms expiry through `poseTimer`/`clearPose`; same-entry reactivation is guarded by the original 1200ms activation-relative debounce. Record actual accepted activation, scheduled deadline and real expiry callback/state, then native refocus strictly inside and outside that activation's debounce window. A late negative sample is not callback/deadline proof.

Retain all original red traces and repeat every affected required case with retries zero in the parent-owned isolated runner. No speculative application retiming, added sleeps, retries, skips or enlarged deadlines to manufacture green. A missing producer or real application defect is an explicit evidence/scope gap, not permission to invent behavior. T01 changes no test or producer and claims no T02 result.

### Evidence, budgets and acceptance ownership

Parent-owned rendering must capture actual entry/range/Contact/ending frames at 1440x900, 768x1024 and 375x812 in both themes, plus 320px width, short 360x640, breakpoint sweeps and 200% text. Verify actual inner viewport, section identity and overflow. Record natural-time forward/reverse clips separately from static or pinned frames; pinned evidence does not prove scheduling. Include cold/repeat entry, theme switch, disclosure, anchors, history, native touch/mouse/Tab, pause/resume and fallback states.

Require full hitbox/glyph clearance, visible keyboard focus, eligible targets at least 44px, ordinary composited text/link contrast >=4.5:1 and applicable large text >=3:1 through moving and resting worst frames. Require zero serious/critical axe findings and enlarged-content reflow; sampled automated checks do not constitute accessibility certification.

Use the frozen R8 baseline's same browser/profile, throttling, viewport, storage/load state and gzip method. Lab LCP <=2.5s, CLS <=0.1 with no new scene-induced content shift, and representative theme/disclosure/link/Mount event-to-next-paint <=200ms are measured local budgets, never field INP or field p75 claims. Identify the actual LCP element and shift/latency causes. Current all-route Lighthouse mobile three-sample medians must remain >=95 for performance, accessibility and SEO; assess the genuine 404 separately and retain fresh reports.

Incremental gzip ceilings over that baseline are JavaScript <=12 KiB and scene SVG/CSS <=48 KiB. No new runtime packages or third-party runtime requests. Trace idle, paused, reduced and hidden ownership to confirm no permanent nonessential frame/timer churn. Phone frame rate, battery/GPU behavior and unmeasured field performance remain unclaimed; crossing a budget is not authority to relax it.

Fresh separate source and visual/motion reviews are required on one identified candidate. A fresh independent visual reviewer must inspect real phone/desktop captures and natural-time clips against an explicit internal rubric >=90/100, citing every deduction and material blocker. Technical green alone does not accept disconnected scenery. This internal score promises no award, global ranking or Son taste verdict.

After focused evidence and review, freeze the final source for the complete ordered gate: `npm ci; npm run check; npm test; npm run build; npm run test:production`, then `git diff --check`. Use Node >=22.22.0 and lock-matched sandboxed Playwright Chromium in the parent-owned runner. Require every command to exit zero, disclose every skip and preserve failures; no hidden skips, narrower substituted suite or retries into green. Verify packaged production bytes, draft exclusion, disabled signup and retained privacy/storage protections.

Any separately authorized private Tailscale promotion requires fresh-storage interaction at the exact intended hostname/IP origin: themes, navigation and reload, with served assets matched to the frozen production manifest and the incumbent R8 rollback retained. No delivery or promotion is performed by T01. Physical phone, Safari and Son's creative/taste acceptance are separate real gates; unavailable access stays HOLD unless Son explicitly changes that scope.

### Exact criterion coverage (obligations, not observed PASS)

| Accepted ID | Contract obligation / downstream evidence |
|---|---|
| SV-FR-001 | Continuous reversible native-scroll journey across real Home; forward/reverse stage recordings. |
| SV-FR-002 | Open-sky entry and compact R8 phone identity/intro/disclosure/full first target; matched opening evidence. |
| SV-FR-003 | Original summit identity with differentiated far/middle/near depth; matched painted frames and edge clearance. |
| SV-FR-004 | Restrained scenic night aurora above ridges; normal/reduced/paused composition evidence. |
| SV-FR-005 | Deliberate separated daylight/haze without night ribbons; first-paint, switching and worst-frame evidence. |
| SV-FR-006 | One shared HTML world and route-appropriate intensity; generated-route inventory plus genuine 404; RSS separate. |
| SV-FR-007 | Original Mount/native hello/project reactions; trusted input, first activation and full glyph/hitbox clearance. |
| SV-FR-008 | Truthful Pause/Resume, hidden cleanup and complete reduced/no-JS/forced alternatives at every stage. |
| SV-FR-009 | Native navigation, scroll and correct geometry through disclosure, resize, reload, anchors and history. |
| SV-FR-010 | Protected approved copy/routes/drafts/signup, privacy, history, retained bindings/data and publication boundaries. |
| SV-FR-011 | Original Space Mono/Geist bytes, ruled unboxed content and compact readable/enlarged layouts. |
| SV-SC-001 | T02 actual activation/deadline/560ms callback and inside/outside 1200ms debounce evidence; prior failures retained. |
| SV-SC-002 | Composited contrast, 44px targets, native keyboard/focus, reflow and zero serious/critical axe findings. |
| SV-SC-003 | Matched-profile lab/Lighthouse/gzip budgets and actual latency/shift attribution; no field-performance claim. |
| SV-SC-004 | Independent evidence-based visual/motion rubric >=90/100 with deductions/blockers; Son taste separate. |
| SV-SC-005 | One frozen final source, complete fresh ordered technical gate, packaged bytes and draft exclusion. |
| SV-SC-006 | Separately authorized exact-origin private interaction/byte verification and recoverable R8 incumbent. |
| SV-SC-007 | Actual physical-phone/Safari and Son acceptance recorded separately; missing evidence remains HOLD. |
| SV-SC-008 | Explicitly approved SEQUENTIAL native-Codex provenance and one acknowledged source/test writer replace native DAG dispatch/export. Parent verifies actual cwd/model/max effort/sandbox/policy, baseline identity, bounded action/result receipts and independent reviewer identity. No native graph execution is claimed; other provenance and quality constraints remain. |

T01 authors only this development contract. T02 evidence, implementation, rendering, reviews, full gates, private delivery and device/taste acceptance remain outstanding; no unperformed check is represented as passed.

### Selected T11 addendum: the sky sketches Mount

Son selected **night mountain constellation with retained aurora, and a native-scroll cloud shadow in daylight**.
This governs the selected refinement of the existing world; selection is not rendered or creative acceptance.
Earlier no-stars/no-new-art wording is historical ONLY for this original owned SVG constellation and cloud-shadow
art. The bans on a stock starfield, particles, new mascots, remote assets, dependencies and glowing UI remain.
All protected copy, global tokens, fonts, layout, first-screen access, privacy and publication limits remain active.

The focal moment is a mountain-shaped sky drawing handing off to the same rising ridges. A sparse asymmetric
asterism echoes the existing high summit and lower shoulder. One cool off-white point follows its fine contour
through the measured native entry-to-project progression; reverse scroll reverses that spatial state. Keep the
liked dark aurora. Ridgeline overlap and smooth attenuation absorb the drawing into the landscape, without a
rectangular sky cut, a literal morph claim, a twinkle loop, meteors, labels or a new hello-triggered effect.
Ordinary phone entry must already read as a connected mountain, rather than nearly invisible isolated dots.

At 375x812 the asterism sits in the real sky pocket to the right of the name and above the project link.
Desktop gets a separately framed right-hand sky composition. Measure actual heading glyphs/header geometry;
small/short/enlarged layouts use a finished three-point summit in the existing header-to-heading gap.
Never move/shrink content, force a name break, add page height or cover glyphs, navigation or full native targets.

Daylight has no stars or aurora paint. A shaped blue-grey cloud shadow sweeps across the actual far/middle/near
ridge surfaces, clipped by references to the original unchanged ridge geometry. Its different plane travel
reveals depth, while scenic attenuation keeps the reading corridor quiet. It settles by Contact/ending.
No page brightness filter, broad blur, daytime glow, heading band or independent animation is allowed.

Both treatments consume the existing single measured progress/eligibility frame; no extra scroll listener,
timer, interval, rAF driver, preference or event API. Home carries the sequence, index routes restrain it,
and calm routes show a complete static pose. Pause freezes all new decoration; Resume aligns to actual geometry
without replay. Hidden/pagehide stop owned work. Reduced motion and no-JS show fully drawn, intentionally static
constellation/shadow compositions; small layouts simplify rather than reduce type. Forced colours hide scenery.
Theme switches preserve journey progress and eligibility. Original Mount, gaze, 560ms expiry and 1200ms debounce
remain unchanged. The new sequence does not respond to hello.

All 19 SV obligations, finite ownership, compressed budgets, >=4.5:1 body/link and >=3:1 large-text contrast,
44px native targets, original 27 defining paths, independent reviews and the full frozen technical gate remain.
Parent must render forward/reverse day/night, worst contrast frames, phone/desktop/short/320px/200% text and all
lifecycle states on this new source. Source syntax, prior scores and baseline captures accept none of this art.

## Approved private prototype amendment: one distant alpine sky (T1–T4, 2026-10-30)

Son likes the original mountains and rejects the disconnected smoke-like aurora and the diagram-like constellation. For this private Home prototype only, the "Selected T11 addendum" constellation/guide-point/sketch clauses and the earlier broad crossing aurora ribbons are **historical**; their history above is retained. Everything else (protected copy, fonts, layout, original ridge path data, canvases and aspect variants, Mount, single progress/eligibility owner, Pause/Resume, forced colours, budgets) remains active.

- **Sky is behind terrain.** Night sky art (restrained translucent auroral folds and rays plus a few sparsely composed points, no connecting lines, labels or travelling point) is the first group inside each existing far-ridge SVG, using that SVG's own viewBox, slice/meet crop and ancestor layer transforms. An inverse luminance mask (solid white sky rectangle, solid black exact copy of the variant's `sv-surface-far-*` path data) removes sky beneath the real far skyline, so points and curtains are occluded by the actual projected ridge and never by translucent terrain or a rectangle. The mask path duplicates the original `d` by design; keep them identical.
- **Day and fallbacks.** Light has no stars or aurora. Reduced motion and no-JS show the same fixed composition at the rest pose; forced colours still hide the scene. `.sv-gutter-sky` is hidden in all modes until its markup is removed in T5.
- **Valley opens.** Depth (existing `--sv-depth`, from the one measured progress) also drives a modest spatial uncovering: far and middle planes scale slightly and the foreground flanks spread outward, so distance is revealed around Selected projects, reversing exactly on upward scroll. No new peak, page height, timer, loop or preference.
- **Status.** Authored only; not rendered, tested or reviewed. Son's T4 judgement decides.

## Private cohesion correction P2 (2026-10-30)

A bounded refinement of the liked coherent-alpine P1; identity, terrain, type, layout, copy and compact phone opening are unchanged. Earlier clauses on far-plane scaling/travel, sky fade, the R8 exact light stops and the opaque header are historical for this candidate only. Authored only; not rendered, tested or reviewed here.

- **Header.** `.site-header` keeps its dimensions and hit targets but is a feathered, translucent scene-coloured scrim (no backdrop blur) so the sky reaches behind navigation. `viewport-fit=cover` with safe-area top/side padding; the browser `theme-color` follows stored/manual theme via a head script, with the media-matched metas as the system fallback. Browser chrome gets a flat colour only; no clock/location theme switching.
- **Travel.** Progress between measured landmarks uses a monotone cubic Hermite (PCHIP) curve: continuous slope, no overshoot, same single event-driven owner and one queued frame. Near-plane travel is 62svh (was 70svh); the far composite is nearly stationary (5svh, no scale) while middle and near planes supply depth. The original skyline masks and all terrain `d` strings are untouched.
- **Sky.** Irregular folded green/teal curtains with a little violet, fine tapered rays and uneven stars (mostly tiny and dim, a few clearer, some cropped by the phone edge); sky-art colours only, no UI token changes. The sky no longer fades to nearly nothing as the valley opens (18% at most).
- **Morning.** Same terrain in a pale cool-blue fixed sky with a soft upper-left light wash, blue-grey aerial depth (far `#bccde2`, mid `#a3b8d3`, near `#85a0c4`), restrained haze; no stars, aurora, sun disc or particles.

## Private phone-first repair P3 (2026-10-30)

Bounded repair for iPhone 17 Pro Safari (Playwright geometry 402x681 CSS, DPR 3; also 375x812 and 1440x900). Chromium emulation is not Safari proof. Authored only; not rendered, tested or reviewed by the author. P2 source is archived in `.omh/evidence/cohesion-phone-p3-20261030/p2-source.tar.gz`. Earlier P2 clauses on veil strength and the phone sky position are historical for this candidate.

- **Phone night is the signature.** The tall (portrait) far SVG's sky is re-posed into the real opening between header scrim and skyline (svg y about -130..140; the P2 position sat under the header). Folds are stronger (peak about .52 vs .3), rays finer and uneven with feathered ends, stars larger/brighter. Phone dark veil centre .4 -> .62 (edge .92) so the root .72 x mask no longer crushes it. Terrain and skyline mask `d` strings are untouched. Wide sky gets a modest lift.
- **Morning.** Veil centre .26 -> .5 on phone (.24 -> .4 desktop), stronger shaded-face planes (.2), crisper rims (.4) and cooler far/mid colours (`#b4cbe6`, `#9bb4d6`, `#8099c0`), so near/far ranges and lit/shaded faces read as the same place. No new geometry.
- **Stable camera.** The scene box is `100lvh` (coverage) and layers are `100svh + 720px` (art canvas = small viewport + 96px). `measure()` reads layout sizes only: the scene (large), the far layer (small) and `header.offsetHeight`; the visualViewport height and offsetTop no longer enter progress, reader line or span. Span uses the large viewport so the bottom reaches 1. Invalidation, PCHIP and the single event-driven frame are unchanged.
- **Desktop pointer sky.** While the existing fine-pointer camera is active, `.sv-aurora` translates (+-26 user units) and skews (+-2.4deg) toward the pointer and `.sv-stars` moves less (+-8), inside the masked `.sv-sky`, so the skyline mask never moves. Finite 900/1200ms CSS settle; cleared by the existing scroll/touch/key/focus/pause/hidden/reduced/pagehide paths. No new loop, listener, sensor or cursor effect.
- **Cache.** `mountains.css` and `mountains.js` hrefs carry `?v=phone-p3-1`.

## Current refinement note: impeccable-1 correction (2026-10-30)

Authored only; not rendered, tested or reviewed by the author. No Safari, device or creative acceptance is claimed. The cache token is now `?v=impeccable-1`.

- **Aurora.** The first impeccable pass left the sky too faint. Phone fold and ray gradient opacities are raised (main stop about .9, from .5), and the two folds are taller so they sit below the 98px header. Barcode rays are cut to a few uneven ones. Soft masked edges, skyline masks and stars are unchanged. The wide sky gets a smaller lift.
- **Header.** Scrim is about .93 at the top and .90 at the bottom, with a 12px feather at .5 opacity. There is no blur and no mask or clip on `main`.
- **Day.** Near and middle ridges are bluer and deeper (`#6a85b2`, `#98b2d4`) with stronger shaded planes. Local haze is lower (.5 to .22) and the scene opacity is .94, so the near faces read behind the footer. The feather and the upper-left light are unchanged.
- **Retained.** Pause cancels sky transitions, the reduced-motion change clears the camera, and the `100svh`/`100lvh` geometry is unchanged.

## Home-study amendment: one landscape that opens once, then lets you read (private T1, 2026-10-30)

Son approved the Home-only prototype in PLAN.md (T1). This is scoped prototype documentation, not creative acceptance, a rendered or tested result, or publication. Authored only; the parent runs checks and captures.

- **Boundary.** Every rule below is Home-scoped through `body.home-study` (class added by `BaseLayout.astro` only when the normalized route is `/`) plus the scene's `data-mode='home'`. About, Build, Writing, details, Subscribe and the 404 keep their incumbent paint, tokens, header scrim and `theme-color`. Original terrain/Mount path data, `src/assets/mountain-scene.html`, copy, fonts, layout, navigation, page height, controls, Pause/reduced/no-JS/forced-colours behaviour and the `?v=impeccable-1` links are unchanged.
- **Night.** The large green/violet aurora curtain is not painted on Home (a comparison study, not a permanent ban). Navy ground, sparse stars, a little more terrain separation and rim clarity carry the character.
- **Day.** Near-neutral mist ground and cool slate terrain with much less blue; fewer, quieter cloud-shadow and plane facets behind prose. Tonal volume is kept. The Home header scrim and the Home light `theme-color` follow the same mist tone.
- **Motion.** The existing single measured progress (`--sv-progress`, landmarks 0 / .48 / .82 / .94 / 1) is unchanged for lifecycle consumers. The same event-driven frame also writes two derived values: `--sv-scene` (smoothstep, 0 to 1 by the Projects landmark, then held) and `--sv-settle` (a short ending settle after Contact). Home depth is `scene x max + settle x tail`: phone max .36 / tail .04, desktop max .52 / tail .06. Substantive movement therefore settles at Projects, reading holds still, and the ending adds only a small settled pose; reversing scroll recovers every state. No timer, loop, snapping or smoothing layer. Reduced motion fixes depth at the rest pose.
- **Composition.** Phone keeps terrain lower and peripheral (stronger edge veil, quieter centre); desktop uses the open side field (flank art opens with the scene value) and a quiet centre corridor.

### Home sky refinement (private, Son-approved 2026-10-30: natural stars; pale sun with thin clouds)

Scoped private prototype contract, not acceptance, a render or a test result. Thesis: looking through the same mountain pass into a larger sky. The earlier whole-asset freeze of `src/assets/mountain-scene.html` is amended ONLY for additive Home sky groups; all original paths, attributes, canvases, viewBoxes, crops and skyline masks stay exact.

- **Art.** One additive `<g class="sv-home-sky">` per far-ridge SVG (wide and tall), clipped by that SVG's existing inverse skyline mask. `.sv-hs-night` holds layered natural stars (`.sv-hs-dust` faint distant, `.sv-hs-mid` irregular clusters and scatter, `.sv-hs-bright` a few clear points); `.sv-hs-day` holds a pale warm sun (`.sv-hs-sun`) upper LEFT, matching the scene's upper-left light and right-hand shaded faces, and thin long clouds (`.sv-hs-cloud-far`, `.sv-hs-cloud-near`). No icon sparkles, constellation lines, halos beyond a faint natural glow, aurora, or looping twinkle. Both `.sv-hs-*` groups are `display:none` by default, so every non-Home route keeps its incumbent night/day paint; Home reveals the night group in dark and the day group in light for manual `data-theme` and for system preference with no manual choice.
- **Scroll.** The existing `--sv-scene` (settles at Projects) drives, through `--sv-hs`: distant dust still, mid and bright stars a few units, far clouds a little, near clouds a longer slide that uncovers the sun by Projects, then quiet reading. Reverse recovers exactly. The settle and fabricated height rules are unchanged.
- **Hover.** Fine-pointer desktop only, through the SAME frame, camera lifecycle and `data-cam` as the terrain: new clamped unitless variables `--mtn-dx/dy` (dust), `mx/my` (mid stars, far clouds), `bx/by` (bright stars), `ux/uy` (sun), `kx/ky` (near clouds) move sky layers differentially. Scroll, touch, key, focus, blur, Pause, reduce, forced, hidden/pagehide and theme clear them via `clearCamera`. Phone has the full scroll story and no hover dependency.
- **Static.** `--sv-hs` defaults to .75 in CSS, so without script the sky shows a finished pose. `mountains.js` overwrites it inline with the scroll value; under reduced motion CSS sets `--sv-hs: .75 !important`, which wins even after JS initializes. No camera transform or transition applies there. Forced colours hide the scene.
- **Reading.** The source2 corridor veil is restored unchanged on the scene (the earlier union mask is removed). Sky legibility comes from sky-only art: crisp pinpoint stars with no halo discs, no stars added through the prose area, and a modest group of clearer points in the open desktop right-hand sky. Day clouds are irregular tapered gradient-filled paths with a soft slate underside, not horizontal lenses; the sun sits inward from the header at the upper left, with an opening visible at entry.
- **Phone dark corridor.** Painted-glyph checks found dim labels over retained terrain below 4.5:1 on phone dark, independent of the new stars. Only on Home phone in dark (manual dark, or no manual choice with a non-light system), the veil centre is alpha .28 (less .04 x ease) and the quiet corridor starts at 6% / ends at 94% instead of 22% / 78%; edges, daylight, scene opacity and non-Home routes are unchanged. Authored only; the parent's contrast re-run decides.
- **Clear night / Aquarius / follow (private, Son-requested after source4; SUPERSEDES the Orion field and the night clouds/cloud-owned night moment in the Real-sky v2 bullet below, which is historical for those points).** *Night* is cloud-free: `.sv-hs-clouds` and `.sv-haze` are `display:none` on Home for manual dark and default/system dark (including no-JS/reduced); day shows them again via the `:root[data-theme='light']` and `prefers-color-scheme: light` + `:not([data-theme='dark'])` branches, so day is as source4. *Moment:* at night `data-moment` ends with the existing `sv-hs-meteor` `animationend`, accepted only from the ACTIVE (rendered) `.sv-hs-night` group so a hidden night subtree can no longer end the day moment early [corrected; the unconditional wording is historical]; semantic `--sv-progress`/`data-progress` are computed from the real `scrollY`, and only `--sv-scene`/`--sv-settle`/`--sv-hs` use the followed position [corrected; "paints follow" wording is historical] (meteor geometry, keyframes and 2.6s+1.3s unchanged); day still ends with `sv-hs-drift-a`. *Stars:* the dynamic field now uses Aquarius presets, wide `ra0 335 dec0 -5 cx 1130 cy -70 scale 850` and tall `ra0 335 dec0 -5 cx 320 cy -45 scale 360` (bounds unchanged, 600 upper cap), every star carries `data-hip`. [Corrected: the earlier "Orion core hidden / coordinates missing" gap is historical.] Both `.sv-hs-core` groups now hold the 18 revision-2 Aquarius circles per variant (`data-hip`, direct full-precision 2-decimal cx/cy, r, opacity, tint), including Gamma 110395, Zeta 110960, Eta 111497 and Pi 110672; the unconditional hide rule is removed and only `data-sky="full"` hides them. Rigid pose is lifted +20 units from the first-render revision: wide `cy -50`, y bounds [-280,380]; tall `cy -25`, y bounds [-125,180] (so Pi clears the header); all other parameters unchanged. *Visibility (revision 3, authored only):* only the seven true Aquarius core members (HIP 110395, 110960, 111497, 110672, 109074, 106278, 113136) are drawn with point radius x1.18 and base opacity x1.35 capped at .90, applied before the hush multiplier, in both the dynamic field (`HINT` in `mountains.js`) and each `.sv-hs-core` group; positions, tints and every other star are unchanged, with no lines, labels, glow or global star floor. *Follow:* on Home only, the same `frame()` paints `follow`, which chases `scrollY` (tau 45ms, hard deadline 200ms after the last scroll event, no overshoot) and re-asks the same event-coalesced driver until converged; first frame, remeasure/resize and enlarged text snap; `stop()` (Pause, reduce, hidden, pagehide, blur) clears `follow` and stops asking while the painted pose stays. No scrollTo, snapping or second loop. Authored only.
- **Real-sky v2 (private, changes requested on source3; Son 2026-10-31: bigger clouds, more real stars, a special movement, phone must look great).** Authored only; not rendered, tested or accepted.
  - *Stars.* The invented dust/mid/bright dots and legacy `.sv-stars` are hidden on Home only. A fixed illustrative Orion/Taurus J2000 field (NOT the current sky, location or time; no geolocation, clock or permission) comes from the parent's `public/mountains/home-star-catalog.json` (XHIP via d3-celestial; rows `[hip, ra, dec, mag, bv]`; licence beside it). `mountains.js` fetches it once on Home (same origin), validates numbers, projects gnomonically (East left, north up; `den<=.15` rejected) with wide `ra0 75, dec0 18, cx 1130, cy -70, scale 580, x[-100,1700], y[-300,360]` and tall `ra0 75, dec0 18, cx 235, cy -45, scale 190, x[-20,420], y[-145,160]`, keeps the 600 brightest per variant, and appends one `<g class="sv-hs-sky sv-hs-full">` per night group (radius and opacity from magnitude; tint from B-V; one rigid far sky). Stars inside the heading/prose rectangles are quieted (opacity x.3), never moved. Until then, and on fetch failure or no-JS, `<g class="sv-hs-sky sv-hs-core">` holds the 18 core stars (`data-hip`: Pleiades, Aldebaran, Orion belt, Betelgeuse, Rigel, Bellatrix, Sirius, Procyon, Capella) at the exact projected positions; success sets `data-sky="full"` on the scene, which hides the core group so nothing duplicates. No lines, labels, halos or twinkle.
  - *Clouds.* `.sv-hs-clouds` (both themes) holds asymmetric lumpy banks drawn from two silhouettes, lit upper-left (warm top, cool shaded underside, `--hs-cl-*` tones; dark ambient navy at night), occluding stars behind them: `.sv-hs-bank-a` (primary, veils the sun), `-b` (right sky), `-c` (far wisps). Tall banks are composed separately for the phone sky band and right pocket.
  - *Moment.* On a first arrival only, `data-moment="run"` plays one finite CSS drift (7s after 0.5s) that parts bank-a to open the sun/sky, plus on night one `.sv-hs-meteor` streak (2.6s delay, 1.3s). Both settle into `data-moment="done"` (end pose held). Scroll, wheel, touch, key, focus, blur, Pause, hidden/pagehide, reduce or resize set `done` through the existing `interrupt`/`cancelEffects`; no replay on resume, restore or theme change, no timer or loop. Reduced motion and no-JS show composed poses (reduced = end pose; no-JS = bank-a partly veiling the sun). Native scroll adds a bounded further parting settled by Projects (`--sv-hs`).
- **Source1 correction (private).** *Yield:* `momentDone()` now also runs on `pointerdown`, `keydown` and `focusin` (not the whole `interrupt`, so Mount, greeting and policy passes are untouched). It reads each visible bank's painted `translate` BEFORE clearing `data-moment="run"`, writes it inline (freezing the bank where it is), and the meteor stops at once; banks of a hidden variant take the CSS end pose. A consumed moment never restarts. *Placement:* the added night/day/cloud groups are shifted by the Home-only `--hs-ty` (`translate: 0 var(--hs-ty)` on the children of `.sv-home-sky`, never on the masked container), computed from the layer geometry (box top 34svh-48, art bottom-aligned, scale min(width/400,(svh+96)/800), tall; 402x681 and 1440x900 are the zero-shift references) so the sky band stays under the header at 375x812, 402x681, 768x1024 and short 874x402. Tall: sun (335,-34) r15 in the open right pocket; bank-b is a wide lobed bank left/centre in the header-to-title band (travel 40), bank-a veils the sun and drifts 130 units to open it, bank-c right of the link row. Bank silhouettes have fuller lobes, wispy breaks and a short undulating belly. Star opacity is steeper by magnitude (`.2+(6-mag)*.15`, floor .22); fallback HIP 17851 wide cy is -143.17. Authored only; parent renders decide.
- **Blocking closure (private).** Sun-only individual `translate` (Home-scoped): wide at `max-height: 560px` moves `.sv-hs-sun` +1090 units right (about x 730 at 874x402, clear of the H1); tall at `min-width: 720px` moves it (+90, -22) so its glow clears the first paragraph. Night cloud tones lifted to `--hs-cl-hi/mid/lo` rgba(98,118,168,.88) / (64,82,128,.86) / (36,50,92,.8); day unchanged. Catalogue stars: opacity `max(.32, .3+(6-mag)*.14)`, quiet (hush) multiplier .38; projection, cap and data unchanged. Authored only; parent captures and glyph checks decide.
- **Desktop cohesion / smoother follow / Mount refinement (private, Son-requested; authored only, not tested).** *Desktop (>=900px, Home only):* `--sv-max` .6, gentler far/mid/near tones (night #2c4068/#243a64/#1c3060; day #d0d9e6/#b4c0d1/#8f9fb6), clearer rims, flank opacity `scene*.9`, shoulder veil .62/.5; phone and all SVG framing/masks unchanged. *Follow:* `measure()` now records a geometry signature and a remeasure that finds identical geometry (visualViewport/toolbar churn) no longer snaps `follow`; when the Projects knot sits closer than `min(.4*span, .6*height)` the scenic opening alone spreads over that distance (smoothstep of `scenicY/want`), while semantic progress and landmarks stay native. Tau 45ms, 200ms deadline, no overshoot and the single driver are unchanged. *Mount:* the same five paths redrawn, the ridge sharing the shape's right contour and a straight crease, an edge highlight that stops before it, and two matching rounded upright eyes; palette, button, travels and keyframes unchanged.
- **Desktop correction (private, authored only, not tested).** At >=900px on Home the middle layer is `translate3d(0, 36svh - 30svh*depth)` and the near layer `38svh - 47svh*depth` (was 44/44 and 46/62), so first paint is higher with less travel and a nearly unchanged reading pose; the far plane is untouched. The stretched scenic opening (used only when the Projects knot is closer than `want`) spreads over `want = min(.75*span, height)` at widths >=900 and over `min(.4*span, .6*height)` below 900, the source1 phone rule; semantic progress is unchanged.
- **Tall-desktop closure (private, authored only, not tested).** At `min-width: 900px` and `max-aspect-ratio: 5/4` on Home, the middle layer rests at `20svh - 18svh*depth` and the near layer at `26svh - 34svh*depth` (replacing 36/30 and 38/47 for that case), day mid/near faces are slightly firmer (#acb9cc / #8697b0), and only `.mtn-wide .sv-hs-sun` is translated (+734.06px, +95.48px SVG units: centre near (900,160) at 1280x1280, clear of the H1). The far plane, stars, meteor, clouds, SVG geometry, JS, other widths/aspects (900-landscape, 768, 874x402, 1440x900) and phones are unchanged.
- **Tall-desktop far-plane closure (private, authored only, not tested).** Inside the same `min-width: 900px` and `max-aspect-ratio: 5/4` Home block, the far outer layer rests at `22svh - 5svh*depth` (was 34svh) so the highest ridge rises, and the wide `--hs-ty` gains +100 SVG units for the added sky children only (not the masked container), so stars, sun, meteor and clouds stay in their verified sky (net -0.71px at 1280x1280, 0 at 1440x1200). SVG geometry, JS, other widths/aspects, phones and the mascot are unchanged.
- **Scroll responsiveness and recurring night meteors (private, Son-requested, authored only, not tested).** *Scroll:* the extra tau-45ms/200ms follow layer is removed; the scenery follows native scroll in the single coalesced frame (stretch mapping, semantic progress and landmarks unchanged), and `put()` skips same-value style writes (`--sv-progress`, `--sv-scene`, `--sv-hs`, `--sv-settle`, `--sv-cloud-travel`, data attributes). The remaining cost of repainting the inherited scene tree is NOT addressed here. *Meteors:* on Home at night only, a sparse `setTimeout` (first at 9s, then 7-11s after each shot; every third cycle a 3-shot shower, 330ms stagger) clones the visible original trail as ephemeral `.sv-hs-shot` groups animated with finite WAAPI (1.1-1.5s, at most 3 alive, lane jitter inside the upper-right sky). Nothing is scheduled or alive unless Home, dark, visible, focused, no forced colours, no reduced motion, not Paused, no held pointer/touch and no focus-visible element; wheel/touch/scroll/key/focus/resize/theme/hide/Pause cancel shots and a 1.8s idle rearms. The original first-arrival shot, day cloud opening, SVG and keyframes are untouched.
- **Meteor liveness correction (private, authored only, not tested).** The scheduler predicate no longer reads layout: it uses policy eligibility, the exact manual/system theme (`data-theme`, else `prefers-color-scheme`), held-input membership (pointer ids, remaining touches, held keys), a `blurred` flag and meaningful focus only; the visible SVG template is chosen at fire time. Only an interactive control with `:focus-visible` counts as focus; the focused MAIN/BODY does not. Key release, pointer/touch release, eligible `focusout` and window `focus` each rearm once after 1.8s idle; `blur` and `pagehide` clear held state, timer and owned shots unconditionally; `pageshow` reconciles one scheduler. Shots use `fill: both` (terminal opacity 0 until removal), with a caught failure leaving the static sky. The dead follow/chase state is removed; the geometry signature and responsive stretch remain. Remaining cost of repainting the inherited scene tree, and any device smoothness, are not claimed.
- **Blue planet (private Home-night preview, authored only; generation, render and tests pending).** Son wants the site to carry the feeling of mountains, stars and a blue planet. One original procedural raster, `public/mountains/blue-planet.webp` (768x768 RGBA; rebuilt by the evidence-only `render-blue-planet.py OUTPUT.webp`, math and seeded noise only, upper-left light, curved terminator, thin atmospheric rim), is added as `<g class="sv-hs-night sv-hs-planet"><image>` in each far SVG, after the dynamic stars (the first `.sv-hs-night` host) and before the original meteor and recurring clones, inside the existing `.sv-home-sky` inverse skyline mask, so stars sit behind its opaque body, meteors in front, and the lower planet tucks behind the ridge. It shows only in Home night (`.sv-hs-night`); day, non-Home, stars, terrain, copy and layout are unchanged. Wide placement is user-unit (755,-62) size 398 (centre about (890,410), diameter about 440px at 1440x900); at tall desktop an individual `scale .9045` / `translate (-29.8,46.3)` gives centre about (830,490), diameter about 550px at 1280x1280; tall (phone) is (147,-2.7) size 257 (centre about (275,300), diameter about 250px at 402x681). Tablet, short landscape and other aspects are unverified. Scheduler fixes: `meteorOk` again requires `document.hasFocus()`, and `pageshow` rearms only for a BFCache restore, so the first 9s timer is not overwritten on initial load.
- **Sitewide day/night world, glimpsed planet (latest override; private, authored only, renders and tests pending; supersedes the Home-only and full-disc wording above).** Son asked for light and dark to read as day and night, a restrained glimpsed planet, and the same world on EVERY page. `BaseLayout.astro` now gives every body `mountains home-study` (the class is the shared world marker; Home content rules do not use it), the light `theme-color` and header scrim share the mist tone, and `mountains.css` scopes the world to `body.home-study .mtn-scene[data-world]` instead of `data-mode='home'`: the same Home night/day sky groups, Aquarius stars (the catalogue is now fetched on every route, same origin), clouds (day), terrain tones, veil and tall-desktop poses apply everywhere. Routes other than Home rest in a composed pose (`--sv-scene: .8`; JS still drives scene values only on Home), `data-moment` is `done` outside Home, and recurring finite meteors run on Home and Build/Writing only, never on calm articles. The planet is the existing `blue-planet.webp`, reduced to a thin lit crescent on its upper-left limb by a CSS mask, and moved toward the open upper right (wide image (1012,-254) size 405; tall desktop scale 1.03 translate (-140,85); phone (233,-128.5) size 241), so it is partly beyond the frame and never sits behind the introduction; it shows at night only. No new asset, generator, service or animation; the Mount, copy, layout, SVG geometry and original meteors are unchanged.
- **Sitewide closure (private, authored only, not tested).** Correction: `public/mountains/blue-planet.webp` EXISTS (the served 22,858-byte asset); the earlier "does not exist / needs generation" wording is wrong and historical. Because the crescent mask makes the unlit hemisphere transparent, each planet anchor now has a quiet opaque body disc (`<circle class="sv-hs-body" fill="#050912">`, the image's disc centre and radius; wide (1214.5,-51.5) r189.8, phone (353.5,-8) r113) under the masked image, so stars do not show through the sphere; the tall-desktop scale/translate applies to it as well. It sits inside the same `.sv-hs-night` group and the same skyline mask, is hidden by day, and is not brighter or a full lit disc. The unused `before`/`remeasure` locals in `frame()` are removed. The shared `home-study` body class name, the `data-world` scene selector, per-route `home|index|calm` modes, theme branches, no-JS/reduced/focus/meteor contracts were re-read in full and left as they are.
- **Depth.** The sky sits inside the far plane (already offset by the camera), so its own hover offsets compensate that ancestor: net dust -x, mid stars -1.5x, bright stars -2x, sun -1.5x, all smaller than the far ridge, with near clouds -12x and Home near terrain at 1.5x its incumbent response. Camera transitions exist only while `data-cam` is set, so Pause, reduce, hidden and theme changes drop them immediately.
