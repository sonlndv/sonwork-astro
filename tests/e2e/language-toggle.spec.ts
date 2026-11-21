import { expect, test } from '@playwright/test';

// Covers the site-level chrome language toggle: reachable from every page,
// localizes nav/footer/skip-link text and the document language, persists
// the choice while navigating, and never changes a URL. This is the one
// global EN/VI control for the whole site; it also drives which per-note
// article body is shown (language-switch.spec.ts), not a second switch.
// Each piece of chrome text is a single rendered label (swapped in place,
// not a hidden sibling), so toHaveText() on the element itself always
// reflects exactly what's visible and what assistive tech reads.

test('the language toggle localizes header, footer, skip-link text and the document language without changing the URL', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.lang-toggle');
  const firstNavLink = page.locator('.site-nav a').first();
  const firstFooterLink = page.locator('.footer-inner nav a').first();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(toggle).toHaveText('VI');
  await expect(toggle).toHaveAttribute('aria-label', 'VI — switch to Vietnamese interface');
  await expect(firstNavLink).toHaveText('About Me');
  await expect(firstNavLink.locator('span')).not.toHaveAttribute('lang');
  await expect(firstFooterLink).toHaveText('All series');

  await toggle.click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(toggle).toHaveText('EN');
  await expect(toggle).toHaveAttribute('aria-label', 'EN — Chuyển sang tiếng Anh');
  await expect(firstNavLink).toHaveText('Giới thiệu');
  await expect(firstNavLink.locator('span')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.skip-link')).toHaveText('Đến nội dung chính');
  await expect(firstFooterLink).toHaveText('Tất cả loạt bài');
});

test('the language choice persists across navigation and reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('.lang-toggle').click();
  await page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).getByRole('link', { name: 'Loạt bài', exact: true }).click();
  await expect(page).toHaveURL('/series');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.lang-toggle')).toHaveText('EN');
  await expect(page.locator('.site-nav a').first()).toHaveText('Giới thiệu');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.lang-toggle')).toHaveText('EN');
  await expect(page.locator('.site-nav a').first()).toHaveText('Giới thiệu');
});

test('the language toggle stays reachable and tappable at a 320px width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const toggle = page.locator('.lang-toggle');
  await expect(toggle).toBeVisible();
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(page.locator('.site-nav a').first()).toHaveText('Giới thiệu');
});
