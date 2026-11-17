# Son. brand kit

Approved by Son on 2026-11-17: Mounty typography and flat backgrounds, with the previous periwinkle blue instead of Mounty's cyan. This supersedes the cyan brand palette, not the existing content, logo shape or layout. Approved source is not proof of a new deployment.

## Name and identity

- Display name and wordmark: **Son.** Include the full stop; preserve capital S and lowercase on.
- Website/domain: **sonwork.org**. Sonwork is the project/domain name, not a replacement wordmark.
- Voice: first-person, clear, practical and honest about learning. No invented expertise or claims.
- Logo: the approved open ridge beside the Son. wordmark. Preserve its open paths, proportions and rounded stroke ends; do not replace it with a filled mountain, mascot or a different ridge.

## Colour codes

OKLCH is the canonical web accent; hex is its rounded sRGB export equivalent. Use each theme's accent for links, selected tools, section headings, focus, the ridge and editorial rule accents. Do not substitute the earlier cyan (`#39d0fc` / `#006cac`).

| Role | Dark | Light |
|---|---|---|
| Periwinkle accent | `oklch(80% .11 254)` / `#8bc1ff` | `oklch(36% .12 258)` / `#0b3a7a` |
| Page background | `#02050d` | `#f8fafd` |
| Secondary surface | `#050b16` | `#eef3f8` |
| Main text | `#f0f4f7` | `#0b1421` |
| Muted text | `#abb2ba` | `#333e4c` |
| Hairline rules | `#2b2e32` | `#b6bfc8` |
| Minor-heading green | `#83d5b4` | `#22684e` |
| Bold/code emphasis | `#f5a67d` | `#96502a` |
| Italic emphasis | `#c4b5fd` | `#6c4b99` |
| Unfinished/private status | `#f5b488` | `#9c470d` |

Source tokens: `src/styles/global.css`. Keep backgrounds, non-blue semantic colours and typography unchanged when applying the approved accent change. Historical artwork/captures are not recoloured.

## Fonts

| Role | Family | Weight / setting |
|---|---|---|
| Headings and wordmark | Space Mono | 700 |
| Body and interface | Geist | 400; 600 for emphasis and tool names |
| Labels, measurements and code | Space Mono | 400; 700 for bold roles |

- About H1: 32px at the default 16px root size, line-height 1.3, normal tracking. Natural wrapping is intentional.
- Section headings: 1.45rem; H3: 1.2rem. Existing archive-specific scale remains as approved in the mockup.
- Body: 16px base, line-height 1.7; introduction retains its 17px role. Maximum prose measure 68ch.
- Use the existing self-hosted Latin/Vietnamese files in `public/fonts/`, defined by `src/styles/fonts.css`. Their bytes match the approved Mounty reference. Retain SIL OFL notices.
- Geist Mono is historical, not the current label font. Do not replace Space Mono with it or change body text to monospace.

## Logo master and assets

Native logo master: `src/components/SonBrand.astro`. Ridge geometry:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 36" fill="none">
  <path d="M5 28 L18 7 L28 22 M25 17 L31 11 L43 28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Use the theme's accent as `currentColor`. Website lockup: 32×24px ridge, 12px gap, 22px Space Mono 700 wordmark. Preserve aspect ratio when scaling; keep clear space around the mark and never stretch, rotate or add a glow/shadow.

| Asset | Location | Size |
|---|---|---|
| Colour icon master | `public/favicon.svg` | 64×64, ridge inset on dark ground |
| Browser PNG icon | `public/favicon.png` | 32×32 |
| Apple touch icon | `public/apple-touch-icon.png` | 180×180 |
| Large icon | `public/icon-512.png` | 512×512 |
| Social image | `public/og.png` | 1200×630 |

The icon master already uses the approved `#8bc1ff` ridge on `#02050d`; no logo redesign is needed. Regenerate the four PNGs only with `node scripts/generate-brand-assets.mjs`. Keep the generator, SVG and pixel-identity test consistent. The social image is the existing ridge asset, not a claim about published writing.

## Layout and interaction

Centered frame: maximum 1040px. Content remains left-aligned with symmetric gutters of at least 24px, shared header/section/footer edges and natural heights. Section spacing is 32–48px; controls have 6px corners and normal controls retain 44px targets. The calendar keeps its separately documented compact-cell access model.

Flat backgrounds: no grain, texture, particles or decorative gradients. Keep the brief editorial-rule drawing effect; respect reduced motion. Tool selection is immediate coloured text with no moving underline or description fade. Preserve native keyboard focus and all existing no-JavaScript content.

Implementation details: [DOOP-DESIGN.md](DOOP-DESIGN.md). Publication and storage/privacy boundaries: [../DEPLOY.md](../DEPLOY.md) and [../PRODUCT.md](../PRODUCT.md). Brand approval does not publish drafts or authorize unrelated account, credential, DNS, permission, billing or storage changes.
