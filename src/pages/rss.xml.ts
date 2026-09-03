import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { THEME_LABEL } from '../lib/glyphs';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

export const GET: APIRoute = async () => {
  const site = 'https://sonwork.org';
  const reports = (await getCollection('reports')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime()).slice(0, 50);
  const items = reports.map((r) => `
    <item>
      <title>${esc(r.data.title)}</title>
      <link>${site}/readings/${r.id}/</link>
      <guid isPermaLink="true">${site}/readings/${r.id}/</guid>
      <pubDate>${r.data.date.toUTCString()}</pubDate>
      <category>${esc(THEME_LABEL[r.data.type] ?? r.data.type)}</category>
      <author>${esc(r.data.author)}</author>
      <description>${esc(r.data.dek)}</description>
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>What Sonar found</title>
  <link>${site}/readings/</link>
  <description>Readings filed by Sonar, Lê Sơn's research engine.</description>
  <language>en</language>${items}
</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
