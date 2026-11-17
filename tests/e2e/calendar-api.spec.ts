import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const meta = { mode: 'fresh', fetchedAt: '2026-11-15T08:00:00Z', stale: false, source: 'github-graphql' };

// These are explicitly synthetic HTTP-boundary cases, not live GitHub receipts.
test('synthetic API update changes real day labels/counts without visible panels', async ({ page }) => {
  const calendar = structuredClone(snapshot); const peak = calendar.days.find((day: { date: string }) => day.date === '2026-10-19'); peak.count++; calendar.total++;
  await page.route('**/api/github-calendar', route => route.fulfill({ json: { calendar, meta } }));
  await page.goto('/'); await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'fresh');
  const cell = page.locator('.calendar-day[data-date="2026-10-19"]'); await expect(cell).toHaveAttribute('data-count', '633');
  await cell.focus(); await cell.press('Enter'); await expect(page.locator('#calendar-detail')).toHaveText('2026-10-19 · 633 contributions (UTC)');
  await expect(page.locator('.github-calendar details, .github-calendar select')).toHaveCount(0);
  await expect(page.locator('#calendar-description')).toContainText('15-minute server cache');
});

test('synthetic UTC-window rollover rebuilds month/grid safely and retains tool handlers', async ({ page }) => {
  const calendar = structuredClone(snapshot); const removed = calendar.days.shift(); calendar.from = calendar.days[0].date; calendar.through = '2026-11-16'; calendar.days.push({ date: calendar.through, count: 7, level: 1 }); calendar.total += 7 - removed.count;
  await page.route('**/api/github-calendar', route => route.fulfill({ json: { calendar, meta } }));
  await page.goto('/'); await expect(page.locator('.calendar-day').last()).toHaveAttribute('data-date', '2026-11-16');
  await page.locator('.calendar-day').first().focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(page.locator('#calendar-detail')).toHaveText('2026-11-16 · 7 contributions (UTC)');
  await expect(page.locator('.calendar-day[tabindex="0"]')).toHaveCount(1);
  for (const name of ['gbrain', 'Hermes', 'OpenMaus', 'OMP', 'Obsidian']) { const tool = page.getByRole('button', { name, exact: true }); await tool.click(); await expect(tool).toHaveAttribute('aria-pressed', 'true'); }
});

test('successful refresh preserves selected and focused date through UTC rollover', async ({ page }) => {
  await page.clock.install(); let calls = 0;
  const rollover = structuredClone(snapshot); const removed = rollover.days.shift();
  rollover.from = rollover.days[0].date; rollover.through = '2026-11-16'; rollover.days.push({ date: rollover.through, count: 7, level: 1 }); rollover.total += 7 - removed.count;
  await page.route('**/api/github-calendar', route => route.fulfill({ json: { calendar: ++calls === 1 ? snapshot : rollover, meta } }));
  await page.goto('/'); await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'fresh');
  const selected = page.locator('.calendar-day[data-date="2026-10-19"]'); await selected.focus(); await selected.press('Enter');
  await page.clock.fastForward(15 * 60 * 1000 + 1);
  await expect(page.locator('.calendar-day').last()).toHaveAttribute('data-date', '2026-11-16');
  await expect(selected).toBeFocused(); await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#calendar-detail')).toHaveText('2026-10-19 · 632 contributions (UTC)');
  await expect(page.locator('.calendar-day[tabindex="0"]')).toHaveCount(1);
});

test('failed refresh keeps last-good data and marks nonvisual provenance stale without duplicate warnings', async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.route('**/api/github-calendar', route => ++calls === 1 ? route.fulfill({ json: { calendar: snapshot, meta } }) : route.abort());
  await page.goto('/'); await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'fresh');
  await page.locator('.calendar-day').last().focus(); await page.keyboard.press('Enter');
  for (let i = 0; i < 2; i++) {
    await page.clock.fastForward(15 * 60 * 1000 + 1);
    await expect(page.locator('[data-calendar]')).toHaveAttribute('data-calendar-mode', 'stale');
  }
  await expect(page.locator('.calendar-day')).toHaveCount(365);
  await expect(page.locator('.calendar-day').last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#calendar-description')).toContainText('Refresh unavailable; retaining the last received calendar.');
  expect((await page.locator('#calendar-description').textContent())!.match(/Refresh unavailable/g)).toHaveLength(1);
});

test('page restored from back-forward cache resumes demand refresh', async ({ page }) => {
  await page.clock.install(); let calls = 0;
  await page.route('**/api/github-calendar', route => { calls++; return route.fulfill({ json: { calendar: snapshot, meta } }); });
  await page.goto('/'); await expect.poll(() => calls).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.clock.fastForward(16 * 60 * 1000);
  expect(calls).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(() => calls).toBe(2);
});

test('invalid API response never erases static data or breaks independent tools', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/github-calendar', route => route.fulfill({ json: { calendar: { invalid: 'synthetic-malformed-data' }, meta } }));
  await page.goto('/'); await expect(page.locator('.calendar-day')).toHaveCount(365);
  await page.getByRole('button', { name: 'gbrain', exact: true }).click(); await expect(page.locator('#tool-purpose')).toHaveText('gbrain: Shared memory for agents.');
  await page.locator('.calendar-day').first().focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(page.locator('#calendar-detail')).toHaveText('2026-11-15 · 0 contributions (UTC)'); expect(errors).toEqual([]);
});

test('recent-first survives delayed rollover but yields to user scroll across refresh and cache restore', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.clock.install();
  const rollover = structuredClone(snapshot); const removed = rollover.days.shift();
  rollover.from = rollover.days[0].date; rollover.through = '2026-11-16';
  rollover.days.push({ date: rollover.through, count: 7, level: 1 }); rollover.total += 7 - removed.count;
  const { promise: pending, resolve: deliver } = Promise.withResolvers<void>();
  let calls = 0;
  await page.route('**/api/github-calendar', async route => {
    const request = ++calls;
    if (request === 1) await pending;
    const calendar = structuredClone(rollover);
    if (request > 1) { calendar.days.at(-1).count = 8; calendar.total++; }
    await route.fulfill({ json: { calendar, meta } });
  });
  await page.goto('/');
  const region = page.locator('.calendar-scroll');
  const latestIsVisible = () => region.evaluate(element => {
    const lastDay = element.querySelector('.calendar-day:last-child');
    if (!lastDay) return false;
    const last = lastDay.getBoundingClientRect();
    const viewport = element.getBoundingClientRect();
    return element.scrollWidth > element.clientWidth &&
      Math.abs(element.scrollLeft - (element.scrollWidth - element.clientWidth)) <= 1 &&
      last.left >= viewport.left && last.right <= viewport.right;
  });
  await expect.poll(latestIsVisible).toBe(true);
  deliver();
  await expect(page.locator('.calendar-day').last()).toHaveAttribute('data-date', rollover.through);
  await expect.poll(latestIsVisible).toBe(true);

  await region.hover();
  await page.mouse.wheel(-180, 0);
  await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeLessThan(400);
  await region.evaluate(element => element.scrollTo({ left: 120, behavior: 'instant' }));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.clock.fastForward(15 * 60 * 1000 + 1);
  await expect(page.locator('.calendar-day').last()).toHaveAttribute('data-count', '8');
  expect(await region.evaluate(element => element.scrollLeft)).toBe(120);

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.clock.fastForward(16 * 60 * 1000);
  expect(calls).toBe(2);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(() => calls).toBe(3);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await region.evaluate(element => element.scrollLeft)).toBe(120);
  await expect(page.locator('.calendar-day')).toHaveCount(365);
});
