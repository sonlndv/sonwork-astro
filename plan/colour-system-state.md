# Sonwork colour system — state as of 2026-09-12 (PAUSED by Son)

Son's verdict: **"it really isnt help"**. Work stopped at his instruction. Do not resume
without explicit instruction from him.

## Status: all work is committed, pushed, and live

| Commit | What |
|---|---|
| `402bb39` | geometry pass (14 radii → 3 roles; 69 paddings → `--s1…--s8`; faded dividers) |
| `a69ec7b` | colour hierarchy pass — heading subject tier, de-hued `--line`, demoted `.kind` / `.port-status`, divider off full accent |
| `c3d2f86` | stop the accent repeating down the scroll — divider fully neutral, `.st.lit` labels, `.gloss b` |

Working tree clean. Nothing pending. `https://sonwork.org` serves `c3d2f86`.

## The five colour faults found and fixed

1. **`.sec-h::after` was solid `--lume`** — a permanent cyan bar under *every* section heading.
   First fix left an accent *tip*, which was still wrong (it repeats at every heading → wallpaper).
   Now plain `var(--line)`. The draw-in animation is the reveal; colour is not.
2. **`--line` / `--line-2` carried the brand hue** — chroma `.030` at hue 254 = ~+25 blue over red
   in every structural rule, so structure read as a second accent. Dark theme dropped to `.008`.
3. **`.sec-h h2 span` was `--ink-3`** — the exact grey used for 12px metadata, so the subject word
   ("building.", "found.") ranked below its own timestamp. Now `--ink-2`, a real third tier.
4. **Accent inflation** — 24 text runs wore `--lume` (links + taxonomy + status + emphasis).
   Demoted `.kind`, `.port-status`, `.st.lit>a`, `.gloss b`. Now 4 runs, all intentional.
5. **Two carriers for one signal** — `.st.lit` painted both the label and its progress bar cyan;
   four completed stations rendered a solid cyan band. The bar is the meter; the label went neutral.

## Verified (measured, not assumed)

- 0 accent dividers out of 9, across `/`, `/about/`, `/readings/`, `/projects/`, `/book/`
- accent prose runs 24 → 4 (LS15 logo mark, stat icons, one hero emphasis)
- every remaining accent text run on the home page is inside an `<a>`
- contrast passes AA both themes — dark 18.4 / 9.5 / 5.5 / 11.3:1, light 17.7 / 9.6 / 5.7 / 5.4:1
- 0 horizontal overflow desktop + mobile; 22/22 unit tests
- confirmed in the **deployed** CSS bundle, not just locally

## Known-remaining / not addressed

- **`--bg` is referenced but never defined** in `global.css`; resolves to near-white. Usages counted,
  never fixed. Harmless today but it is a live landmine.
- **Composition of the inner pages** (`/about/`, `/readings/`, `/projects/`) was never touched —
  only the shared tokens they inherit. This is the largest open design gap.
- The 2px wire/circuit segments in the `stack` band are deliberate decoration, left alone.
- Booking backend is shipped but hidden (`indexable={false}`, `Disallow: /book`) and the mailer is
  still log-only. Go-live inputs still owed by Son: booking email, mail provider + sender domain,
  retention wording, durations, calendar provider, cancellation policy.

## Method lessons (already written into the `claude-design` skill)

- Audit **both** axes. A geometry-only audit sold as a design-system pass is what caused Son's
  "why you can still appriove?" — colour was never measured.
- Audit accent **per band down the scroll**, never as a page total. A healthy page count hides one
  element repeating at every section — and scrolling is exactly how the user finds it.
- Fix the **class, not the instance**. A reported fault is a sample; grep the whole stylesheet and
  sweep every route before shipping. Two corrections arrived because I fixed only what was shown.
- Pseudo-elements are invisible to a `color`-only sweep. Check `::before` / `::after`
  `background` / `border` too — that is where the worst fault hid.
- **oklch breaks in-browser contrast maths.** Convert oklch → sRGB in Python, then compute WCAG.
- Derive deploy-check greps from the built `dist/` artifact, not source syntax — the minifier emits
  `:after` for `::after` and `.3 .008` for `0.3 0.008`. A wrong grep reported 8 false deploy failures.
- Do not dismiss `vision_analyze`. It was right about the cyan divider when my pixel reasoning was
  wrong. Ask it to *describe*, then judge yourself; it times out on long critical prompts.

## Artifacts

`/tmp/global.css.bak` (pre-geometry), `/tmp/blk2.png` (pre-fix), `/tmp/fixed.png` (mid-fix, still cyan),
`/tmp/fix3.png` (post-fix). Son's screenshots: `~/.hermes/cache/images/img_2124deb0ab04.jpg`,
`img_0c6de58309b5.jpg`.
