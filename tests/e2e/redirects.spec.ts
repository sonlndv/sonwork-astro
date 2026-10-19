import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { readRedirectMap, samplePath } from '../../scripts/redirect-map.mjs';

// HTTP check of library/redirect-map.csv against a host that serves the
// redirect file: REDIRECTS_BASE_URL=https://preview.example npx playwright test redirects
// Until a host serves the redirects (phase 6/7 preview, phase 10 live) this is
// skipped; scripts/check-redirect-map.mjs checks the map and dist/_redirects offline.
// The actual Worker returns 410 for retired paths; current assets win collisions.
const base = process.env.REDIRECTS_BASE_URL;
const { rows } = readRedirectMap();

test.describe('old URLs', () => {
  if (!base) {
    test('answer 301 to a live page or 410', () => {
      test.skip(true, 'set REDIRECTS_BASE_URL to a host that serves the redirect file');
    });
    return;
  }
  test.skip(({ isMobile }) => isMobile, 'HTTP only, runs once');

  for (const row of rows.filter((r) => r.status !== 'none')) {
    const path = samplePath(row.old_path);
    const variants = path.endsWith('/') ? [path, path.slice(0, -1)] : [path];
    for (const variant of variants) {
      test(`${variant} answers ${row.status}`, async ({ request }) => {
        const url = new URL(variant, base).toString();
        const response = await request.get(url, { maxRedirects: 0 });
        if (row.status === '410') {
          const shipped = existsSync(`dist${path}`);
          expect(response.status()).toBe(shipped ? 200 : 410);
          return;
        }
        const trim = (p: string) => p.replace(/\/$/, '');
        // /about/ -> /about: the old path is the new page itself. _redirects has no
        // rule for it; the host serves it (200) or normalizes the slash (301/308).
        const samePage = trim(variant) === trim(row.new_path);
        if (samePage && response.status() === 200) return;
        expect(samePage ? [301, 308] : [301]).toContain(response.status());
        const location = new URL(response.headers()['location'] ?? '', url);
        expect(trim(location.pathname)).toBe(trim(row.new_path));
        const target = await request.get(location.toString());
        expect(target.status()).toBe(200);
      });
    }
  }
});
