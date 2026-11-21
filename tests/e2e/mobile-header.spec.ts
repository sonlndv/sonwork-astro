import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { publicationScope } from '../../scripts/publication-scope.mjs';
const retained = JSON.parse(readFileSync('src/data/retained-series-slugs.json', 'utf8')).map((slug: string) => `/series/${slug}`);
const routes = ['/', '/series', '/series/me', '/series/me/the-joy-of-malleable-products', '/series/how-i-use-openmaus/openmaus-explained', '/study', ...retained, ...publicationScope().privatePreviewRoutes, '/project'];
for (const width of [320, 375, 390, 768, 1440]) for (const theme of ['dark', 'light'] as const) {
  test(`all current route types reflow at ${width}px ${theme}, normal and 200% text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme: theme });
    for (const path of routes) {
      await page.goto(path); await page.evaluate(() => document.fonts.ready);
      for (const size of ['100%', '200%']) {
        await page.evaluate(size => document.documentElement.style.fontSize = size, size);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} ${size}`).toBe(width);
        // Son explicitly retains natural compact calendar data-viz cells while
        // removing the explorer UI. Accurate names, roving keys, native touch,
        // zoom and nonvisual static data are verified separately. Other targets
        // keep the existing minimum; this is not a blanket small-button exception.
        const targets = await page.locator('.site-nav a, .footer-inner a, .breadcrumb a, .note-location a, .row h2 a, .row h3 a, button:visible:not(.calendar-day), summary:visible, select:visible, .go:visible, .reader-backlinks a, .series-list a, .about-contacts a').evaluateAll(els => els.map(el => ({ text: el.textContent, r: el.getBoundingClientRect().toJSON(), clipped: el.scrollWidth > el.clientWidth + 1 })));
        for (const target of targets) {
          expect(target.r.height, `${path} ${size}: ${target.text}`).toBeGreaterThanOrEqual(43.9);
          expect(target.r.width, `${path} ${size}: ${target.text}`).toBeGreaterThanOrEqual(43.9);
          expect(target.r.left).toBeGreaterThanOrEqual(0); expect(target.r.right).toBeLessThanOrEqual(width + 1);
          expect(target.clipped, `${path} ${size}: ${target.text} clipped`).toBe(false);
        }
      }
    }
  });
}

for (const width of [320, 390, 402, 430, 1280]) {
  test(`shared header keeps its controls together at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.theme-toggle')).toBeVisible();
    await expect(page.locator('.lang-toggle')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.locator('.site-header').evaluate(header => {
      const rect = (element: Element) => element.getBoundingClientRect().toJSON();
      return {
        wordmark: rect(header.querySelector('.wordmark')!),
        themeToggle: rect(header.querySelector('.theme-toggle')!),
        langToggle: rect(header.querySelector('.lang-toggle')!),
        links: Array.from(header.querySelectorAll('.site-nav a'), rect),
      };
    });
    const { wordmark, themeToggle, langToggle, links } = boxes;
    expect(links).toHaveLength(5);
    expect(themeToggle.top).toBe(wordmark.top);
    expect(langToggle.top).toBe(wordmark.top);
    expect(themeToggle.left).toBeGreaterThanOrEqual(wordmark.right);
    expect(langToggle.left).toBeGreaterThanOrEqual(themeToggle.right);
    for (const link of links) {
      expect(link.top).toBe(links[0].top);
      if (width <= 700) expect(link.top).toBeGreaterThanOrEqual(wordmark.bottom);
      else expect(link.top).toBe(wordmark.top);
    }
    const row = width <= 700 ? links : [wordmark, ...links, themeToggle, langToggle];
    for (let index = 1; index < row.length; index++) {
      expect(row[index].left).toBeGreaterThanOrEqual(row[index - 1].right);
    }
    for (const box of [wordmark, themeToggle, langToggle, ...links]) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
  });
}

test('native mouse or touch first activation follows real links without interception', async ({ page, isMobile }) => {
  await page.goto('/');
  const link = page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Series', exact: true });
  await link.scrollIntoViewIfNeeded();
  const box = (await link.boundingBox())!;
  expect(await link.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })).toBe(true);
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); else await link.click();
  await expect(page).toHaveURL('/series');
});
