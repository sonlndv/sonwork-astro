import { expect, test } from '@playwright/test';
import { untranslatedNotePage } from './routes';

// Found from the actual build rather than hardcoded, so this stays correct
// as notes gain or lose a translation and regardless of merge order. If
// every note is fully translated, there's nothing to exercise this UI
// state against — skip rather than fail the whole suite over a content fact.
const path = untranslatedNotePage();
test.skip(!path, 'Every built note already has a Vietnamese translation; no untranslated fixture to test against.');

test('an untranslated note marks English current and Vietnamese as not yet translated', async ({ page }) => {
  await page.goto(path!);
  const switcher = page.locator('.lang-switch');
  await expect(switcher).toBeVisible();
  const current = switcher.locator('[aria-current="true"]');
  await expect(current).toHaveText('English');
  await expect(current).toHaveAttribute('lang', 'en');
  await expect(switcher.locator('a')).toHaveCount(0);
  const missing = switcher.locator('.lang-missing');
  await expect(missing).toContainText('Tiếng Việt');
  await expect(missing).toContainText('not yet translated');
  await expect(missing).toHaveAttribute('lang', 'vi');
});

test('the language switch stays inside a 320px viewport beneath the note location breadcrumb', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(path!);
  const rect = (selector: string) => page.locator(selector).evaluate(el => el.getBoundingClientRect().toJSON());
  const location = await rect('.note-location');
  const switcher = await rect('.lang-switch');
  expect(switcher.top).toBeGreaterThanOrEqual(location.bottom);
  expect(switcher.left).toBeGreaterThanOrEqual(0);
  expect(switcher.right).toBeLessThanOrEqual(320);
  expect(switcher.width).toBeGreaterThan(0);
});
