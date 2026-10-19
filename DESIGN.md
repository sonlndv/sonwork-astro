---
name: Sonwork
description: Son's portfolio and writing site, set like a ruled spec sheet in a square typewriter voice.
colors:
  void: "oklch(0.115 0.022 256)"
  ground: "oklch(0.15 0.026 255)"
  line: "oklch(0.3 0.008 254)"
  line-2: "oklch(0.245 0.007 254)"
  ink: "oklch(0.965 0.006 250)"
  ink-2: "oklch(0.76 0.014 250)"
  ink-3: "oklch(0.66 0.02 252)"
  lume: "oklch(0.8 0.135 222)"
  human: "oklch(0.82 0.095 55)"
  light-void: "oklch(0.985 0.004 250)"
  light-ground: "oklch(0.962 0.008 250)"
  light-line: "oklch(0.8 0.016 250)"
  light-line-2: "oklch(0.885 0.012 250)"
  light-ink: "oklch(0.19 0.03 256)"
  light-ink-2: "oklch(0.36 0.028 254)"
  light-ink-3: "oklch(0.47 0.024 252)"
  light-lume: "oklch(0.5 0.15 236)"
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
