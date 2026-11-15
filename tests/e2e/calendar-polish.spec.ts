import { expect, test } from '@playwright/test';

// Son's explicit post-review amendment removes the 880px calendar inset and
// visible explorer/provenance controls. It does not change data or privacy gates.
for (const theme of ['dark', 'light'] as const) for (const width of [320, 390, 768, 1440]) {
  test(`shared frame and chart-only calendar at ${width}px (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.home-feature, .planned-preview')).toHaveCount(0);
    const selectors = ['.header-bar', 'main.frame', '.about-opening', '.about-tools', '.github-calendar', '.home-project', '.footer-inner'];
    const edges = await page.evaluate(selectors => selectors.map(selector => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, left: box.left, right: box.right, width: box.width };
    }), selectors);
    for (const edge of edges) {
      expect(Math.abs(edge.left - edges[0].left), JSON.stringify(edges)).toBeLessThanOrEqual(1);
      expect(Math.abs(edge.right - edges[0].right), JSON.stringify(edges)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('.github-calendar h2')).toHaveText('GitHub contributions');
    await expect(page.locator('.github-calendar details, .github-calendar summary, .github-calendar select, [data-calendar-picker]')).toHaveCount(0);
    await expect(page.locator('.github-calendar > p:not(.visually-hidden), .calendar-source, .calendar-help:not(.visually-hidden)')).toHaveCount(0);
    const visibleText = (await page.locator('.github-calendar h2, .calendar-months, .calendar-foot, #calendar-detail').allInnerTexts()).join(' ');
    expect(visibleText).not.toMatch(/Browse daily counts|About this snapshot|Source:|captured|Not live data|Use arrow|Focus or select/i);
    await expect(page.locator('#calendar-detail')).toHaveText('');
    const cell = await page.locator('.calendar-day').first().boundingBox();
    expect(cell!.width).toBe(12); expect(cell!.height).toBe(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const description = page.locator('#calendar-description');
    await expect(description).toContainText('2,165 contributions. Not live data.');
    await expect(description).toContainText('UTC');
    await expect(description).toContainText('2026');
    await expect(page.locator('[data-calendar]')).toHaveAttribute('aria-describedby', 'calendar-description');
  });
}
