import rss from '@astrojs/rss';
import { getPosts } from '../lib/content';
import { getSeries, getLogicalNotes, notePath } from '../lib/series';

export async function GET(context) {
  const posts = await getPosts();
  const series = (await getSeries()).filter(entry => !entry.data.draft);
  // One item per topic, not per language file, so RSS never lists the same
  // note twice just because it has an EN and a VI body.
  const notes = (await Promise.all(series.map(entry => getLogicalNotes(entry.id)))).flat();
  const entries = [...posts, ...notes].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: 'Sonwork',
    description: 'Notes by Son on building software with coding agents.',
    site: context.site,
    trailingSlash: false,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: entry.collection === 'notes' ? notePath(entry) : `/writing/${entry.id}`,
    })),
  });
}
