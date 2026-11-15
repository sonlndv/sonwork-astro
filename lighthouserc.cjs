// Lighthouse CI: PLAN.md asks for mobile >= 95 performance, accessibility and
// SEO on every page, median of 3 runs. Runs against the built site in dist/.
// Chrome comes from CHROME_PATH (e.g. /usr/bin/chromium); reports stay local.
// Cloudflare serves text compressed, so the test server compresses too (--compress). With realistic
// sizes every page measures 1.00, so the performance floor is 0.98.
const { readdirSync, statSync, readFileSync, existsSync } = require('node:fs');
const { join, relative, sep } = require('node:path');
const { assertionsForPage } = require('./scripts/lighthouse-policy.cjs');

function builtPages(dist) {
  const pages = [];
  for (const name of readdirSync(dist)) {
    const path = join(dist, name);
    if (statSync(path).isDirectory()) pages.push(...builtPages(path));
    else if (name.endsWith('.html') && name !== '404.html') {
      const rel = relative('dist', path).split(sep).join('/');
      const route = rel === 'index.html' ? '/' : `/${rel.replace(/\.html$/, '')}`;
      const noIndex = /name="robots"[^>]*content="[^"]*\bnoindex\b/.test(readFileSync(path, 'utf8'));
      const noteSource = join('src/content/notes', rel.replace(/^series\//, '').replace(/\.html$/, '.mdx'));
      const seriesSource = join('src/content/series', rel.replace(/^series\//, '').replace(/\.html$/, '.mdx'));
      const source = [noteSource, seriesSource].find(path => route.startsWith('/series/') && existsSync(path));
      const frontmatter = source ? /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(source, 'utf8'))?.[1] : '';
      const isDraft = /^draft:\s*true\s*$/m.test(frontmatter ?? '');
      pages.push({ route, assertions: assertionsForPage({ isDraft, noIndex }) });
    }
  }
  return pages;
}

const pages = builtPages('dist').sort((a, b) => a.route.localeCompare(b.route));

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-dist.mjs dist 4324 --compress',
      startServerReadyPattern: 'Serving',
      url: pages.map((page) => `http://127.0.0.1:4324${page.route}`),
      numberOfRuns: 3,
      settings: {
        // Default form factor is mobile with simulated throttling.
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      // Only source-confirmed draft notes get the privacy expectation. Every
      // public page retains all three original category floors; no URL is skipped.
      assertMatrix: pages.map(page => ({
        matchingUrlPattern: `^http://127\\.0\\.0\\.1:4324${page.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`,
        assertions: page.assertions,
      })),
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
