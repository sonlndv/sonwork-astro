import { readdirSync, statSync } from 'node:fs';
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

// The main nav entry that should carry aria-current on a page.
export function navSection(path: string): string {
  const first = path.split('/')[1];
  return first ? `/${first}` : '/';
}
