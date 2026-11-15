import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('shared identity endpoints keep expected PNG sizes and native ridge SVG', async () => {
  const svg = await readFile('public/favicon.svg', 'utf8');
  assert.match(svg, /<title>Son\.<\/title>/);
  assert.match(svg, /M5 28 L18 7 L28 22 M25 17 L31 11 L43 28/);
  assert.doesNotMatch(svg, /mount-fill|rotate\(-1/);
  for (const [file, width, height] of [['favicon.png', 32, 32], ['apple-touch-icon.png', 180, 180], ['icon-512.png', 512, 512], ['og.png', 1200, 630]]) {
    const metadata = await sharp(`public/${file}`).metadata();
    assert.equal(metadata.width, width); assert.equal(metadata.height, height);
    const source = Buffer.from(svg);
    const expected = await sharp(source).resize(width, height, { fit: 'contain', background: '#02050d' }).ensureAlpha().raw().toBuffer();
    const actual = await sharp(`public/${file}`).ensureAlpha().raw().toBuffer();
    assert.deepEqual(actual, expected, `${file} must be regenerated from the selected ridge`);
  }
});
