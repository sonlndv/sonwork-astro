import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sonwork.org',
  redirects: { '/writing': '/journal', '/notes': '/journal', '/dispatches': '/journal', '/projects': '/portfolio' },
  integrations: [sitemap()],
});
