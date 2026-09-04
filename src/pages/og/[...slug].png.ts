// One social preview image per reading, rendered at build: the theme glyph
// and label in lume, the title in Sora on the near-black ground, the byline
// and the site at the foot. Satori lays out the markup, resvg rasterises it.
// Fonts are the two static faces in src/assets/fonts (OFL). Colours are the
// dark tokens as hex, because satori does not read OKLCH.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { glyph, THEME_LABEL } from '../../lib/glyphs';
import { runtimeOf } from '../../lib/byline';

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection('reports')).map(r => ({ params: { slug: r.id }, props: { r } }));

const C = { void: '#0b1524', ink: '#f2f4f7', ink2: '#b9c1cc', ink3: '#8b95a5', lume: '#7fd3ff', line: '#233047' };
const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });

export const GET: APIRoute = async ({ props }) => {
  const { r } = props as { r: CollectionEntry<'reports'> };
  const d = r.data;
  // resolved from the project root: at build the route runs from dist/, where import.meta.url would point
  const [sora, mono] = await Promise.all([
    readFile(resolve('src/assets/fonts/Sora-SemiBold.ttf')),
    readFile(resolve('src/assets/fonts/JetBrainsMono-Regular.ttf')),
  ]);
  const when = new Intl.DateTimeFormat(d.lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d.date);
  const icon = 'data:image/svg+xml;utf8,' + encodeURIComponent(glyph(d.type, 44).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, C.lume));
  const size = d.title.length > 90 ? 52 : d.title.length > 60 ? 60 : 68;

  const tree = h('div', { style: { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: C.void, color: C.ink, fontFamily: 'Sora' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 24, color: C.lume } },
      h('img', { src: icon, width: 44, height: 44 }),
      h('span', {}, THEME_LABEL[d.type]),
      h('span', { style: { color: C.ink3 } }, `· ${when}`),
    ),
    h('div', { style: { display: 'flex', fontSize: size, fontWeight: 600, lineHeight: 1.1, letterSpacing: -2, maxWidth: 1040 } }, d.title),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${C.line}`, paddingTop: 22, fontFamily: 'JetBrains Mono', fontSize: 24, color: C.ink3 } },
      h('span', {}, `by ${d.author} on ${runtimeOf(d.author)}`),
      h('span', { style: { color: C.ink2 } }, 'sonwork.org'),
    ),
  );

  const svg = await satori(tree as never, {
    width: 1200, height: 630,
    fonts: [
      { name: 'Sora', data: sora, weight: 600, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
};
