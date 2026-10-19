import rss from '@astrojs/rss';
import { getPosts } from '../lib/content';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: 'Sonwork',
    description: 'Writing by Son on building software with coding agents.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/writing/${post.id}`,
    })),
  });
}
