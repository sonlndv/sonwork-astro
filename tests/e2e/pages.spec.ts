import { expect, test } from '@playwright/test';
import { builtPages, navSection } from './routes';

for (const path of builtPages()) {
  test.describe(path, () => {
    test('answers 200 with the page basics', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
    });

    test('marks its section in the main nav', async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: 'Main' });
      const current = nav.locator('a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', navSection(path));
    });

    test('has no horizontal scroll', async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('first Tab shows the skip link, which moves focus to main', async ({ page, isMobile }) => {
      test.skip(isMobile, 'keyboard navigation is checked on desktop');
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to content' });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
    });
  });
}

test('the RSS feed answers 200 with XML', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  expect(await response.text()).toContain('<rss');
});
