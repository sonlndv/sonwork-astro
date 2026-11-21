import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicationScope } from '../../scripts/publication-scope.mjs';

const names = ['gbrain', 'Hermes', 'OpenMaus', 'OMP', 'Obsidian'];
test('five approved tools own exact purposes without selecting future Series content', () => {
  const tools = JSON.parse(readFileSync('src/data/tools.json', 'utf8'));
  assert.deepEqual(tools.map(tool => tool.name), names);
  assert.deepEqual(tools.map(tool => tool.purpose), ['Shared memory for agents.', 'A general-purpose assistant.', 'An agent workspace.', 'Coding.', 'Notes, research and writing.']);
  for (const tool of tools) assert.deepEqual(Object.keys(tool).sort(), ['id', 'name', 'purpose', 'purposeVi']);
  const retained = JSON.parse(readFileSync('src/data/retained-series-slugs.json', 'utf8'));
  assert.deepEqual(retained, ['how-i-use-gbrain', 'how-i-use-hermes', 'how-i-use-openmaus', 'how-i-use-omp', 'how-i-use-obsidian']);
});
test('Always-on material is preserved as a private draft and is no longer featured', () => {
  const scope = publicationScope();
  if (scope.isPublicProjection) {
    assert.deepEqual(scope.privatePreviewRoutes, []);
    return; // publicationScope asserted absence of BOTH private sources.
  }
  const parent = readFileSync('src/content/series/always-on-agents.mdx', 'utf8');
  assert.match(parent, /^draft: true$/m);
  assert.match(parent, /^featured: false$/m);
  assert.match(parent, /What keeps an agent available/);
  assert.match(readFileSync('src/content/notes/always-on-agents/available-isnt-always-thinking.mdx', 'utf8'), /^draft: true$/m);
});
