import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sonwork.org',
  // Private by default. Public promotion is per-report, via frontmatter.
  build: { format: 'directory' },
});
