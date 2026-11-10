import { expect, test } from '@playwright/test';

for (const javaScriptEnabled of [true, false]) {
  test(`Build's live destination has its own full tap target (JavaScript ${javaScriptEnabled ? 'on' : 'off'})`, async ({ browser, baseURL, isMobile }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled,
      viewport: isMobile ? { width: 375, height: 812 } : { width: 1280, height: 800 },
      isMobile,
      hasTouch: isMobile,
    });
    try {
      const page = await context.newPage();
      await page.goto('/work');
      await page.evaluate(() => document.fonts.ready);
      const live = page.locator('.work-card').first().getByRole('link', { name: /games\.sonwork\.org/ });
      await live.scrollIntoViewIfNeeded();
      const box = (await live.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      const hits = await live.evaluate(link => {
        const r = link.getBoundingClientRect();
        return [r.top + 4, r.top + r.height / 2, r.bottom - 4].map(y => {
          const hit = document.elementFromPoint(r.left + r.width / 2, y);
          return !!hit && link.contains(hit);
        });
      });
      expect(hits, 'padding and glyphs must hit the live link, not the case-study overlay').toEqual([true, true, true]);
    } finally {
      await context.close();
    }
  });
}
