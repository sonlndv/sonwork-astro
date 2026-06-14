# DESIGN.md — sonwork.org

version: "2.0"
name: "sonwork — Racing Line"
description: >
  A builder's project showcase with race-team telemetry precision and a driver's bold stance.
  Dark canvas, one charged electric-blue accent, technical type, quick ease-out motion. Reads like
  an instrument panel, not a brochure. Reference: F1 pit-wall HUD × landonorris.com (blue, not lime).

## Color (OKLCH)

Dark canvas, single charged accent. Cool near-black base tinted toward the blue hue (not warm).

```
# Base — cool near-black, faint navy tint
--bg:        oklch(0.16 0.020 264)   /* page */
--surface:   oklch(0.20 0.024 264)   /* panels, cards */
--surface-2: oklch(0.24 0.028 264)   /* raised */
--line:      oklch(0.32 0.030 264 / .55)  /* hairline borders */

# Ink — cool near-white ramp (verified >=4.5:1 on --bg)
--ink:       oklch(0.97 0.010 264)   /* headings, body */
--ink-2:     oklch(0.80 0.018 264)   /* secondary text  (~7:1) */
--ink-3:     oklch(0.64 0.020 264)   /* muted / labels  (~4.6:1) */

# Accent — Red Bull electric blue (the one charged color)
--blue:      oklch(0.58 0.205 256)   /* primary accent, links, key marks */
--blue-hi:   oklch(0.68 0.190 256)   /* hover / glow */
--blue-ink:  oklch(0.92 0.060 256)   /* text on blue fills */

# Micro-accent — race red, used SPARINGLY (a single tick, a live dot)
--red:       oklch(0.58 0.230 26)
```
Strategy: **Committed-dark** — the dark surface carries the brand; one blue accent <=15% of surface;
red is a spark, never a second theme. Verify contrast on every text/bg pair; never muted-gray body.

## Typography

Two families, paired on a contrast axis (athletic-condensed display vs. technical mono), not two grotesks.

- **Display / headings — `Saira`** (Google). Athletic, technical, F1 energy; full weight range +
  condensed widths. Hero wordmark uses **Saira Condensed / ExtraCondensed, 800-900** for poster impact.
- **Body & UI — `Saira` (Normal width, 400-600)**. One superfamily, width+weight contrast (per the
  skill: a well-tuned superfamily beats a timid display+body pair). Body capped 65-75ch.
- **Mono / telemetry labels — `JetBrains Mono` 500**. Data, labels, project meta, numbers.
  The "instrument" voice. (NOT Space/IBM Plex mono — reflex-rejects.)

Scale: fluid `clamp()`. Hero wordmark large (brand wordmark exception); section heads <= ~3rem.
Letter-spacing on display >= -0.04em. `text-wrap: balance` on h1-h3.

## Layout

- 12-col fluid grid, max content ~1200-1280px, generous gutters (48px desktop).
- **Hero**: full-viewport — wordmark + one-line positioning + a live telemetry strip (real numbers:
  ventures, ships, year). Blue glow + faint diagonal speed-lines as material, not decoration.
- **Showcase** (primary): projects presented BIG — alternating full-width feature rows or a 2-up
  asymmetric grid; each with a number, name, one-line, stack chips, strong visual. Not identical cards.
- Vary rhythm; avoid identical-card-grid + hero-metric-template slop. Numbers only where the content
  is genuinely a sequence/spec (telemetry), never as 01/02/03 scaffolding on every section.
- Thin sticky nav; footer with a small instrument-style colophon.

## Motion

Intentional, quick, ease-out (quart/expo). Part of the build.
- Hero: wordmark settles in (clip/translate); blue glow drifts subtly; telemetry numbers count up once.
- Scroll: staggered reveals tuned per section (not one uniform reflex); project rows slide+fade.
- Hover: blue underline/glow sweeps; project visual lifts.
- Materials beyond transform/opacity: subtle blur, blue glow, clip-path wipes.
- **`prefers-reduced-motion: reduce`** -> crossfade/instant; counts show final value. Non-negotiable.

## Components
nav · hero (wordmark + telemetry strip) · project-feature row · project card (asymmetric) ·
stack-chip · about block · writing list-item · footer/colophon. Real Astro components.

## Bans honored
No gradient-text, no glassmorphism-by-default, no side-stripe borders, no eyebrow-on-every-section,
no reflexive 01/02/03 scaffolding, no hero-metric template, no identical card grid. Distinctive POV or restart.
