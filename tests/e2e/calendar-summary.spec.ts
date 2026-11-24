import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const meta = { mode: 'fresh', fetchedAt: snapshot.retrievedAt, stale: false, source: 'github-graphql' };

for (const total of [0, 1]) test(`synthetic validated stale calendar renders ${total} accurately`, async ({ page }) => {
  const calendar = structuredClone(snapshot);
  calendar.days.forEach((day: { count: number; level: number }) => { day.count = 0; day.level = 0; });
  calendar.days[0].count = total; calendar.days[0].level = total; calendar.total = total;
  await page.route('**/api/github-calendar', route => route.fulfill({ json: { calendar, meta: { ...meta, mode: 'stale', stale: true } } }));
  await page.goto('/');
  await expect(page.locator('[data-calendar-total="en"]')).toHaveText(`${total} ${total === 1 ? 'contribution' : 'contributions'} in the last year`);
});

test('annual snapshot summary works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('[data-calendar-total="en"]')).toHaveText('2,165 contributions in the last year');
  await expect(page.locator('[data-calendar-range="en"]')).toBeVisible();
  await context.close();
});

for (const theme of ['light', 'dark'] as const) for (const lang of ['en', 'vi']) {
  test(`annual snapshot total and full range remain visible in ${theme}/${lang}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.route('**/api/github-calendar', route => route.abort());
    await page.goto(`/?lang=${lang}`);
    const total = page.locator(`[data-calendar-total="${lang}"]`);
    await expect(total).toBeVisible();
    await expect(total).toHaveText(lang === 'en' ? '2,165 contributions in the last year' : '2.165 lượt đóng góp trong năm qua');
    await expect(page.locator(`[data-calendar-range="${lang}"]`)).toContainText('2025');
    await expect(page.locator(`[data-calendar-range="${lang}"]`)).toContainText('2026');
    await expect(page.locator(`[data-calendar-total="${lang === 'en' ? 'vi' : 'en'}"]`)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.calendar-summary')).toHaveAttribute('aria-live', 'polite');
  });
}

test('synthetic refresh updates the full-year total and range, retaining both on failures', async ({ page }) => {
  await page.clock.install();
  const next = structuredClone(snapshot);
  next.total -= next.days.shift().count; next.from = next.days[0].date;
  next.through = '2026-11-16'; next.days.push({ date: next.through, count: 7, level: 1 }); next.total += 7;
  let calls = 0;
  await page.route('**/api/github-calendar', route => {
    calls++;
    if (calls === 1) return route.fulfill({ json: { calendar: snapshot, meta: { ...meta, mode: 'cache' } } });
    if (calls === 2) return route.fulfill({ json: { calendar: next, meta } });
    if (calls === 3) return route.fulfill({ json: { calendar: snapshot, meta: { ...meta, mode: 'snapshot', stale: true, source: 'public-profile-snapshot' } } });
    if (calls === 4) return route.fulfill({ json: { calendar: { ...next, total: 0 }, meta } });
    return route.abort();
  });
  await page.goto('/');
  await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'cache');
  await expect(page.locator('[data-calendar-total="en"]')).toHaveText('2,165 contributions in the last year');
  for (let i = 0; i < 4; i++) {
    await page.clock.fastForward(15 * 60 * 1000 + 1);
    await expect.poll(() => calls).toBe(i + 2);
    await expect(page.locator('[data-calendar-total="en"]')).toHaveText('2,172 contributions in the last year');
    await expect(page.locator('[data-calendar-range="en"]')).toHaveText('Nov 17, 2025 – Nov 16, 2026 (UTC)');
    await expect(page.locator('.calendar-day').last()).toHaveAttribute('data-count', '7');
  }
  await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'stale');
  await page.evaluate(() => {
    document.documentElement.dataset.lang = 'vi';
    document.dispatchEvent(new CustomEvent('sonwork:lang', { detail: { lang: 'vi' } }));
  });
  await expect(page.locator('[data-calendar-total="vi"]')).toBeVisible();
  await expect(page.locator('[data-calendar-total="vi"]')).toHaveText('2.172 lượt đóng góp trong năm qua');
});
