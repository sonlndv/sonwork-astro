import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/content/posts/the-joy-of-malleable-products.mdx', 'utf8');
const [, frontmatter, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

const before = 'I made Mounty';
const after = 'I want that look';

const paragraphs = [
  'I like a clean look and good typography. In Obsidian, I enjoy writing with typewriter scrolling and looking around the graph. The way it looks and feels is part of why I like using it. I enjoy being able to change those details to suit my taste.',
  'That is also something I like about Omarchy and open-source tools. There is room to make them my own, to have a say in how they look and behave. Choosing colours or adjusting how something works can be enjoyable in itself. I like using the tool, and I like getting into the details of it.',
  '“Malleable products” is a name for that kind of thing: tools I can shape around my taste and the way I want to use them. Some of those choices might only matter to me. I still find value in being able to make them.',
  'I made Mounty, a CSS theme for Obsidian, as one expression of that taste. It brings together the clean look, typography, and light and dark colours I like. A separate, optional companion plugin, Mounty-tool, adds typewriter scrolling and graph-colour controls.',
  'I want that look and those tools to help people enjoy using Obsidian and learning. I enjoy the building itself too. Making something valuable, at least for me, is already a reason to do it. Mounty gives me something concrete to shape, use, and share with anyone whose taste overlaps with mine.',
];

test('the Note is published with the approved frontmatter', () => {
  assert.match(frontmatter, /^title: The joy of malleable products$/m);
  assert.match(frontmatter, /^description: I like a clean look and good typography\.$/m);
  assert.match(frontmatter, /^date: 2026-11-04$/m);
  assert.match(frontmatter, /^draft: false$/m);
  assert.match(frontmatter, /^tags: \[\]$/m);
});

test('the Note has exactly the five approved paragraphs in order, with no in-body h1', () => {
  const text = body.replace(/<figure[\s\S]*?<\/figure>/, '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  assert.deepEqual(text, paragraphs);
  assert.doesNotMatch(body, /^# /m);
});

test('the figure sits between the fourth and fifth paragraphs', () => {
  assert.equal(body.match(/<figure\b/g)?.length, 1);
  const figure = body.indexOf('<figure');
  assert.ok(body.indexOf(before) < figure && figure < body.indexOf(after));
});

test('the figure carries the approved image, caption and link', () => {
  const figure = body.match(/<figure[\s\S]*?<\/figure>/)[0];
  assert.match(figure, /src="\/images\/mounty-dark-demo\.png"/);
  assert.match(figure, /width="800"/);
  assert.match(figure, /height="604"/);
  assert.ok(figure.includes('alt="Annotated Mounty dark-theme Obsidian demo vault showing the file sidebar, writing area and graph view."'));
  assert.ok(figure.includes('<figcaption>Mounty’s dark theme in a public demo vault with illustrative content.</figcaption>'));
  assert.ok(figure.includes('href="https://github.com/sonlndv/Mounty"'));
  assert.doesNotMatch(source, /\/work\/mounty|<video|target=/);
});

test('the three original posts remain drafts', () => {
  for (const slug of ['a-keyboard-plugin-is-done-when-it-types', 'a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server']) {
    assert.match(readFileSync(`src/content/posts/${slug}.mdx`, 'utf8'), /^draft: true$/m, `${slug} must stay draft:true`);
  }
});
