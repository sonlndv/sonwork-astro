import { expect, test } from '@playwright/test';
import { untranslatedNotePage } from './routes';

// Covers the per-note BODY: the one global chrome toggle (language-toggle.spec.ts)
// also drives which language's article content is shown, with no second,
// per-note control and no separate page per language. An untranslated note
// keeps its one published body visible under either UI language and adds a
// notice, rather than hiding content or 404ing.
//
// Found from the actual build rather than hardcoded, so this stays correct
// as notes gain or lose a translation and regardless of merge order. If
// every note is fully translated, there's nothing to exercise this UI
// state against — skip rather than fail the whole suite over a content fact.
const path = untranslatedNotePage();
test.skip(!path, 'Every built note already has a Vietnamese translation; no untranslated fixture to test against.');

test('an untranslated note keeps its one published body visible under either UI language, with a Vietnamese notice', async ({ page }) => {
  await page.goto(path!);
  const body = page.locator('[data-note-lang="any"]');
  const notice = page.locator('.lang-missing-note[data-note-lang="vi"]');
  await expect(body).toBeVisible();
  await expect(notice).toBeHidden();
  await expect(notice).toContainText('Vietnamese');

  await page.locator('.lang-toggle').click();
  await expect(page).toHaveURL(path!);
  await expect(body).toBeVisible();
  await expect(notice).toBeVisible();
  // The notice itself is always worded in English, even while the rest of the page reads Vietnamese.
  await expect(notice).toHaveAttribute('lang', 'en');
});

test('the missing-translation notice stays inside a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(path!);
  await page.locator('.lang-toggle').click();
  const notice = page.locator('.lang-missing-note');
  await expect(notice).toBeVisible();
  const rect = await notice.evaluate(el => el.getBoundingClientRect().toJSON());
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(320);
  expect(rect.width).toBeGreaterThan(0);
});
