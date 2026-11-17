import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const retired = /How I use|planned series|planned topics|five practical|05\s*notes/i;

test('About has the four exact public contact links, not a planned-series teaser', () => {
  const home = read('src/pages/index.astro');
  for (const href of ['mailto:son@sonwork.org', 'https://x.com/sonldv', 'https://github.com/sonlndv', 'https://www.linkedin.com/in/sonle2003/']) assert.ok(home.includes(`href="${href}"`), `missing ${href}`);
  assert.match(home, /aria-label="Contact Son"/);
  assert.doesNotMatch(home, retired);
  assert.doesNotMatch(home, /planned-preview|home-feature|<form\b/);
});
test('retained Series views preserve the generic unpublished state without retired entry copy', () => {
  for (const path of ['src/pages/series/[series]/index.astro', 'src/pages/series/[series]/[note].astro']) {
    const source = read(path);
    assert.match(source, /SeriesComingSoon/);
    assert.match(source, /noIndex/);
  }
  const view = read('src/components/SeriesComingSoon.astro');
  assert.match(view, /title="Series"/);
  assert.match(view, /Coming soon/);
  assert.doesNotMatch(view, retired);
});
test('tool purposes have no selected curriculum or route metadata', () => {
  const tools = JSON.parse(read('src/data/tools.json'));
  assert.deepEqual(tools.map(tool => tool.name), ['gbrain', 'Hermes', 'OpenMaus', 'OMP', 'Obsidian']);
  for (const tool of tools) assert.deepEqual(Object.keys(tool).sort(), ['id', 'name', 'purpose']);
});
