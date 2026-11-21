import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Every built HTML page except the special 404, using canonical file URLs.
// Read from dist/ so new pages are covered without editing the tests.
export function builtPages(dist = 'dist'): string[] {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.html') && name !== '404.html') {
        const rel = relative(dist, path).split(sep).join('/');
        pages.push(rel === 'index.html' ? '/' : `/${rel.replace(/\.html$/, '')}`);
      }
    }
  };
  walk(dist);
  if (pages.length === 0) throw new Error(`No pages in ${dist}. Build the site first.`);
  return pages.sort();
}

// A built note page whose language switch still shows the untranslated
// state (no <a> pairing link, a .lang-missing span), found by reading the
// built HTML rather than hardcoding a note id — so this stays correct as
// translations are added or removed, regardless of merge order.
export function untranslatedNotePage(dist = 'dist'): string {
  const candidate = builtPages(dist)
    .filter(page => page.startsWith('/series/') && page.split('/').length > 3)
    .find(page => {
      const file = join(dist, page === '/' ? 'index.html' : `${page.slice(1)}.html`);
      const html = readFileSync(file, 'utf8');
      const switcher = /<nav class="meta lang-switch"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1];
      return !!switcher && switcher.includes('lang-missing') && !switcher.includes('<a ');
    });
  if (!candidate) throw new Error('No built note page has an untranslated language switch to test against.');
  return candidate;
}

// The main nav entry that should carry aria-current on a page.
export function navSection(path: string): string | undefined {
  if (path === '/') return '/';
  if (path === '/series' || path.startsWith('/series/')) return '/series';
  if (path === '/study') return '/study';
  if (path === '/hobbies') return '/hobbies';
  return undefined; // Contact is a mailto; Project identifies itself in the footer.
}
