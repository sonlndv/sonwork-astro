import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sonwork.org',
  redirects: { '/series': '/notes', '/writing': '/notes', '/projects': '/portfolio' },
  integrations: [sitemap()],
});
