import { expect, test } from '@playwright/test';

// Son's explicit post-review amendment removes the 880px calendar inset and
// visible explorer/provenance controls. It does not change data or privacy gates.
for (const theme of ['dark', 'light'] as const) for (const width of [320, 390, 768, 1440]) {
  test(`shared frame and chart-only calendar at ${width}px (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-tool-controls]')).toBeVisible();
    await expect(page.locator('.home-feature, .planned-preview')).toHaveCount(0);
    const selectors = ['.header-bar', 'main.frame', '.about-opening', '.about-tools', '.github-calendar', '.footer-inner'];
    const edges = await page.evaluate(selectors => selectors.map(selector => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, left: box.left, right: box.right, width: box.width };
    }), selectors);
    for (const edge of edges) {
      expect(Math.abs(edge.left - edges[0].left), JSON.stringify(edges)).toBeLessThanOrEqual(1);
      expect(Math.abs(edge.right - edges[0].right), JSON.stringify(edges)).toBeLessThanOrEqual(1);
    }
    expect(edges[0].left).toBeGreaterThanOrEqual(24);
    expect(Math.abs(edges[0].left - (width - edges[0].right))).toBeLessThanOrEqual(1);
    const contentLefts = await page.locator('main').locator('h1, .about-contacts, .tools-section h2, .tool-choice:first-child, .tool-purpose, .github-calendar h2, .notes-spotlight h2').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().left));
    for (const left of contentLefts) expect(Math.abs(left - edges[0].left)).toBeLessThanOrEqual(1);
    const spacing = await page.evaluate(() => {
      const boxes = ['.about-opening', '.tools-section', '.github-calendar', '.notes-spotlight', '.footer-inner'].map(selector => document.querySelector(selector)!.getBoundingClientRect());
      return boxes.slice(1).map((box, index) => box.top - boxes[index].bottom);
    });
    for (const gap of spacing) {
      expect(gap).toBeGreaterThan(0);
      expect(Math.abs(gap - spacing[0])).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('.github-calendar h2')).toHaveText('GitHub contributions');
    await expect(page.locator('.github-calendar details, .github-calendar summary, .github-calendar select, [data-calendar-picker]')).toHaveCount(0);
    await expect(page.locator('.github-calendar > p:not(.visually-hidden), .calendar-source, .calendar-help:not(.visually-hidden)')).toHaveCount(0);
    const visibleText = (await page.locator('.github-calendar h2, .calendar-months, .calendar-foot, #calendar-detail').allInnerTexts()).join(' ');
    expect(visibleText).not.toMatch(/Browse daily counts|About this snapshot|Source:|captured|Not live data|Use arrow|Focus or select/i);
    await expect(page.locator('#calendar-detail')).toHaveText('');
    const idleTail = await page.evaluate(() => document.querySelector('.github-calendar')!.getBoundingClientRect().bottom - document.querySelector('.calendar-foot')!.getBoundingClientRect().bottom);
    expect(Math.abs(idleTail)).toBeLessThanOrEqual(1);
    const cell = await page.locator('.calendar-day').first().boundingBox();
    expect(cell!.width).toBe(12); expect(cell!.height).toBe(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const description = page.locator('#calendar-description');
    await expect(description).toContainText('2,165 contributions. Not live data.');
    await expect(description).toContainText('UTC');
    await expect(description).toContainText('2026');
    await expect(page.locator('[data-calendar]')).toHaveAttribute('aria-describedby', 'calendar-description');
    await page.locator('.calendar-day').first().focus();
    await expect(page.locator('#calendar-detail')).not.toBeEmpty();
    const feedbackSpacing = await page.evaluate(() => {
      const calendar = document.querySelector('.github-calendar')!.getBoundingClientRect();
      const detail = document.querySelector('#calendar-detail')!.getBoundingClientRect();
      const next = document.querySelector('.notes-spotlight')!.getBoundingClientRect();
      return { tail: calendar.bottom - detail.bottom, gap: next.top - detail.bottom };
    });
    expect(Math.abs(feedbackSpacing.tail)).toBeLessThanOrEqual(1);
    expect(Math.abs(feedbackSpacing.gap - spacing[0])).toBeLessThanOrEqual(1);
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await page.getByRole('button', { name: 'gbrain', exact: true }).click();
    await expect(page.getByRole('button', { name: 'gbrain', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const reflow = await page.evaluate(() => {
      const boxes = ['.about-opening', '.tools-section', '.github-calendar', '.notes-spotlight', '.footer-inner'].map(selector => document.querySelector(selector)!.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth > innerWidth, separated: boxes.slice(1).every((box, index) => box.top > boxes[index].bottom) };
    });
    expect(reflow.overflow).toBe(false);
    expect(reflow.separated).toBe(true);
  });
}

test('newest dates remain visible as the untouched calendar narrows', async ({ page }) => {
  await page.route('**/api/github-calendar', route => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const region = page.locator('.calendar-scroll');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => region.evaluate(element => {
      const lastDay = element.querySelector('.calendar-day:last-child');
      if (!lastDay) return false;
      const last = lastDay.getBoundingClientRect();
      const viewport = element.getBoundingClientRect();
      return element.scrollWidth > element.clientWidth &&
        Math.abs(element.scrollLeft - (element.scrollWidth - element.clientWidth)) <= 1 &&
        last.left >= viewport.left && last.right <= viewport.right;
    })).toBe(true);
  }
  await expect(page.locator('.calendar-day')).toHaveCount(365);
  const dimensions = await page.locator('.calendar-day').last().boundingBox();
  expect(dimensions?.width).toBe(12); expect(dimensions?.height).toBe(12);
});
