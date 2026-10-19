// Lighthouse CI: PLAN.md asks for mobile >= 95 performance, accessibility and
// SEO on every page, median of 3 runs. Runs against the built site in dist/.
// Chrome comes from CHROME_PATH (e.g. /usr/bin/chromium); reports stay local.
const { readdirSync, statSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

function builtPages(dist) {
  const pages = [];
  for (const name of readdirSync(dist)) {
    const path = join(dist, name);
    if (statSync(path).isDirectory()) pages.push(...builtPages(path));
    else if (name.endsWith('.html') && name !== '404.html') {
      const rel = relative('dist', path).split(sep).join('/');
      pages.push(rel === 'index.html' ? '/' : `/${rel.replace(/\.html$/, '')}`);
    }
  }
  return pages;
}

const pages = builtPages('dist').sort();

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-dist.mjs dist 4324',
      startServerReadyPattern: 'Serving',
      url: pages.map((page) => `http://127.0.0.1:4324${page}`),
      numberOfRuns: 3,
      settings: {
        // Default form factor is mobile with simulated throttling.
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
