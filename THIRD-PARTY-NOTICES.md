# Third-party notices

## mdxcn GraphFlow

Source inspected: https://github.com/shadcn-labs/mdxcn at 884eba5356762cf49f8828db8f861dc2f33d65e4, `registry/default/graph-flow/graph-flow.tsx` and graph-frame companions.

`src/lib/series-policy.mjs` selectively adapts the upstream plain-text arrow separator and explicit node data form; `src/components/GraphFlow.astro` translates the readable figure/ordered-flow grammar to native static Astro. React child parsing, Tailwind aliases and motion hooks are not copied; no React/Next/motion runtime is shipped. Rendering and accessibility are independently verified in this project, not certified by upstream.

MIT License

Copyright (c) 2026 Keshav Bagaade

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Fonts

Geist and Geist Mono are self-hosted under SIL OFL 1.1. Notices: `public/fonts/OFL-Geist.txt`, `public/fonts/OFL-GeistMono.txt`. Existing Space Mono font files and notice remain as historical assets, but the Doop layout does not use the face. Added Geist 700 and Geist Mono 400 latin/Vietnamese/symbol subsets were downloaded from the Google Fonts stylesheets for these exact families and weights. No runtime font requests leave the site.

## Doop design translation

The Son.-owned approved Doop exports supplied for this private implementation are design references, not a third-party runtime. Native routes, controls and theme persistence replace prototype navigation/custom elements. Background texture is translated from the source's static SVG noise, never a screenshot of the design.

## Obsidian identity

`public/obsidian.svg` is the exact static `logos:obsidian-icon` used in the approved tool-row reference, served locally rather than requested at runtime. Source export: https://doop.design/icons/iconify/logos/obsidian-icon.svg . Iconify identifies the SVG Logos collection author as Gil Barbara and the artwork license as CC0: https://icon-sets.iconify.design/logos/obsidian-icon/ . Obsidian's name and logo remain their owners' trademarks; use here identifies a tool, not endorsement. No remote SVG references, scripts or account connection are included.
