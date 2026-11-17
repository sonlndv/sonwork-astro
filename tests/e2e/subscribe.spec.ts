import { expect, test } from '@playwright/test';

for (const javaScriptEnabled of [true, false]) for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`closed signup JS=${javaScriptEnabled} ${colorScheme}`, () => {
    test.use({ javaScriptEnabled, colorScheme });

    test('only legacy Subscribe shows a closed notice; Home has no signup affordance', async ({ page }) => {
      for (const path of ['/', '/subscribe/']) {
        await page.goto(path);
        const notice = page.locator('.signup-closed');
        if (path === '/subscribe/') {
          await expect(notice).toHaveCount(1);
          await expect(notice).toHaveText('Signup opens soon.');
          await expect(notice).toBeVisible();
        } else {
          await expect(notice).toHaveCount(0);
          await expect(page.locator('main a[href="/subscribe"], .front-newsletter')).toHaveCount(0);
          await expect(page.getByRole('heading', { name: 'Newsletter', exact: true })).toHaveCount(0);
        }
        await expect(page.locator('form, input, button[type="submit"]')).toHaveCount(0);
        await expect(page.locator('[data-signup-url], [data-signup-key], [data-newsletter]')).toHaveCount(0);
        await expect(page.locator('.form-status')).toHaveCount(0);
      }
    });

    test('legacy signup links retain truthful removal information and a Series exit', async ({ page }) => {
      await page.goto('/subscribe/?e=fictional%40example.invalid&t=fictional-token');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subscribe');
      await expect(page.locator('main')).toContainText('Legacy newsletter links are retired. No subscription has been changed here.');
      await expect(page.locator('main')).toContainText('To request removal from the old list, email');
      await expect(page.getByRole('link', { name: 'son@sonwork.org', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
      await expect(page.locator('.site-nav a[aria-current]')).toHaveCount(0);
      await page.locator('main').getByRole('link', { name: 'All series', exact: true }).click();
      await expect(page).toHaveURL(/\/series\/?$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Series');
    });

    test('Contact remains a truthful mailto, and primary destinations are native', async ({ page }) => {
      for (const path of ['/', '/series', '/series/me', '/series/me/the-joy-of-malleable-products', '/study', '/project', '/about/', '/work/', '/work/trivia-hub/', '/subscribe/']) {
        expect((await page.goto(path))?.status()).toBe(200);
        const nav = page.getByRole('navigation', { name: 'Main', exact: true });
        const contact = page.getByRole('navigation', { name: 'Archive and contact' }).getByRole('link', { name: 'Contact', exact: true });
        await expect(contact).toHaveAttribute('href', 'mailto:son@sonwork.org');
        await expect(nav.getByRole('link', { name: 'Subscribe', exact: true })).toHaveCount(0);
        await nav.getByRole('link', { name: 'About Me', exact: true }).click();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.locator('h1')).toHaveText('Trying things with AI.Learning as I go.');
        await expect(nav.getByRole('link', { name: 'About Me', exact: true })).toHaveAttribute('aria-current', 'page');
      }
    });
  });
}
