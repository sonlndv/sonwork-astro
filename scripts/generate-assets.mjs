// Deterministic derivatives of the approved SVG and existing typeface.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const svg = readFileSync('public/favicon.svg').toString('base64');
  for (const [name, size] of [['favicon.png', 32], ['apple-touch-icon.png', 180], ['icon-512.png', 512]]) {
    const data = await page.evaluate(async ({ svg, size }) => {
      const image = new Image(); image.src = `data:image/svg+xml;base64,${svg}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = Number(size);
      canvas.getContext('2d').drawImage(image, 0, 0, Number(size), Number(size));
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size });
    writeFileSync(`public/${name}`, Buffer.from(data, 'base64'));
  }
  const font = readFileSync('public/fonts/space-mono-latin-700-normal.woff2').toString('base64');
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<style>@font-face{font-family:SpaceMono;src:url(data:font/woff2;base64,${font});font-weight:700}*{box-sizing:border-box}body{margin:0;background:#04070e;color:#f2f5f9;font:700 100px SpaceMono;display:flex;align-items:center;height:630px;padding:80px}b{color:#37c5ec}</style><main>Son<b>/</b>work</main>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/og.png' });
} finally { await browser.close(); }
