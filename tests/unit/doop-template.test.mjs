import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Series templates retain the generic draft state beside published content', async () => {
  const reader = await readFile('src/pages/series/[series]/[note].astro', 'utf8');
  const series = await readFile('src/pages/series/[series]/index.astro', 'utf8');
  const home = await readFile('src/pages/index.astro', 'utf8');
  for (const source of [reader, series]) {
    assert.match(source, /SeriesComingSoon/);
    assert.match(source, /getSeries/);
    assert.match(source, /noIndex/);
  }
  assert.match(reader, /getLogicalNotes/);
  assert.doesNotMatch(home, /How I use|planned-preview/);
});
test('the Son identity uses the actual selected native ridge, not an empty placeholder', async () => {
  const brand = await readFile('src/components/SonBrand.astro', 'utf8');
  assert.match(brand, /viewBox="0 0 48 36"/);
  assert.match(brand, /d="M5 28 L18 7 L28 22 M25 17 L31 11 L43 28"/);
  assert.match(brand, /stroke-width="2.5"/);
});
