import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { publicationScope } from '../../scripts/publication-scope.mjs';

// PIN: the new design is real routable Astro/MDX, not a prototype canvas.
test('the private Doop increment has five real route types and structured content', () => {
  publicationScope(); // Assert retained private files OR exact admitted public exclusion.
  for (const file of ['src/pages/index.astro', 'src/pages/series/index.astro', 'src/pages/series/[series]/index.astro', 'src/pages/series/[series]/[note].astro', 'src/pages/project.astro']) {
    assert.ok(existsSync(file), `${file} must exist`);
  }
});

test('the conceptual note is explicitly draft-only and the original drafts remain closed', () => {
  publicationScope(); // Public projection excludes the note; private source keeps draft:true.
  for (const slug of ['a-keyboard-plugin-is-done-when-it-types', 'a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server']) {
    assert.match(readFileSync(`src/content/posts/${slug}.mdx`, 'utf8'), /^draft: true$/m);
  }
});
