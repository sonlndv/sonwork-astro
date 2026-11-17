import rss from '@astrojs/rss';
import { getPosts } from '../lib/content';
import { getSeries, getNotes, notePath } from '../lib/series';

export async function GET(context) {
  const posts = await getPosts();
  const series = (await getSeries()).filter(entry => !entry.data.draft);
  const notes = (await Promise.all(series.map(entry => getNotes(entry.id)))).flat().filter(entry => !entry.data.draft);
  const entries = [...posts, ...notes].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: 'Sonwork',
    description: 'Notes by Son on building software with coding agents.',
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: entry.collection === 'notes' ? notePath(entry) : `/writing/${entry.id}`,
    })),
  });
}
