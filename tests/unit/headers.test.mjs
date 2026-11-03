import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// public/_headers: long caching only where names change with content, plus fonts and scene images; HTML and the root
// scripts keep the platform default (revalidate on every use).
test('public/_headers caches hashed build output, fonts and scene images, and nothing else', () => {
  const text = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');
  const rules = {};
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { current = line.trim(); rules[current] = []; continue; }
    rules[current].push(line.trim());
  }
  assert.deepEqual(rules, {
    '/_astro/*': ['Cache-Control: public, max-age=31536000, immutable'],
    '/fonts/*': ['Cache-Control: public, max-age=86400, stale-while-revalidate=604800'],
    '/mountains/*': ['Cache-Control: public, max-age=86400, stale-while-revalidate=604800'],
  });
});
