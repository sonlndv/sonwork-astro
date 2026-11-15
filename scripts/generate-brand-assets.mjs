import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

// Regenerate only the shared identity endpoints; preserve all editorial captures.
const source = await readFile(new URL('../public/favicon.svg', import.meta.url));
for (const [name, size] of [['favicon.png', 32], ['apple-touch-icon.png', 180], ['icon-512.png', 512]]) {
  await sharp(source).resize(size, size).png().toFile(new URL(`../public/${name}`, import.meta.url).pathname);
}
await sharp(source).resize(1200, 630, { fit: 'contain', background: '#02050d' }).png().toFile(new URL('../public/og.png', import.meta.url).pathname);
console.log('Generated four shared identity PNGs from the selected ridge SVG; editorial images unchanged.');
