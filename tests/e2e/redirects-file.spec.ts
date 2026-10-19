import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { redirectRules, samePage } from '../../scripts/redirects-file.mjs';

// The _redirects generator (scripts/redirects-file.mjs), without a host.
const row = (old_path: string, new_path: string, status = '301') => ({ old_path, new_path, status });

test.describe('_redirects generator', () => {
  test.skip(({ isMobile }) => isMobile, 'no browser, runs once');

  test('leaves out rules between two forms of the same page', () => {
    const rules = redirectRules([row('/about/', '/about'), row('/work', '/work/'), row('/', '/'), row('/projects/', '/work')]);
    expect(rules).toEqual([
      { from: '/projects/', to: '/work', status: 301 },
      { from: '/projects', to: '/work', status: 301 },
    ]);
    expect(samePage('/about/', '/about')).toBe(true);
    expect(samePage('/', '/about')).toBe(false);
  });

  test('a row from the map wins over a generated twin', () => {
    const rules = redirectRules([row('/a/', '/work'), row('/a', '/about')]);
    expect(rules.find((r) => r.from === '/a')?.to).toBe('/about');
  });

  test('the built file has no same-page or looping rule', () => {
    const lines = readFileSync('dist/_redirects', 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const [from, to] = line.split(/\s+/);
      expect(samePage(from, to), line).toBe(false);
    }
    expect(lines.some((l) => l.startsWith('/about/ '))).toBe(false);
  });
});
