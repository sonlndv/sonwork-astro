import { expect, test } from '@playwright/test';

for (const javaScriptEnabled of [true, false]) for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`closed signup JS=${javaScriptEnabled} ${colorScheme}`, () => {
    test.use({ javaScriptEnabled, colorScheme });

    test('Home and the legacy Subscribe page show a notice, not an editable signup', async ({ page }) => {
      for (const path of ['/', '/subscribe/']) {
        await page.goto(path);
        const notice = page.locator('.signup-closed');
        await expect(notice).toHaveCount(1);
        await expect(notice).toHaveText('Signup opens soon.');
        await expect(notice).toBeVisible();
        await expect(page.locator('form, input, button[type="submit"]')).toHaveCount(0);
        await expect(page.locator('[data-signup-url], [data-signup-key], [data-newsletter]')).toHaveCount(0);
        await expect(page.locator('.form-status')).toHaveCount(0);
      }
    });

    test('legacy signup links retain truthful removal information and a Writing exit', async ({ page }) => {
      await page.goto('/subscribe/?e=fictional%40example.invalid&t=fictional-token');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subscribe');
      await expect(page.locator('main')).toContainText('Legacy newsletter links are retired. No subscription has been changed here.');
      await expect(page.locator('main')).toContainText('To request removal from the old list, email');
      await expect(page.getByRole('link', { name: 'son@sonwork.org', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
      await expect(page.locator('.site-nav a[aria-current]')).toHaveCount(0);
      await page.getByRole('link', { name: 'All writing', exact: true }).click();
      await expect(page).toHaveURL(/\/writing\/?$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Writing');
    });

    test('Contact navigates natively from Home and other routes to the unobscured heading', async ({ page, isMobile }) => {
      for (const path of ['/', '/about/', '/work/', '/work/trivia-hub/', '/writing/', '/subscribe/']) {
        await page.goto(path);
        const nav = page.getByRole('navigation', { name: 'Main' });
        const contact = nav.getByRole('link', { name: 'Contact', exact: true });
        await expect(contact).toHaveAttribute('href', '/#home-contact');
        await expect(contact).not.toHaveAttribute('aria-current');
        await expect(nav.getByRole('link', { name: 'Subscribe', exact: true })).toHaveCount(0);
        if (isMobile) {
          await contact.click();
        } else {
          await contact.focus();
          await page.keyboard.press('Enter');
        }
        await expect(page).toHaveURL(/\/#home-contact$/);
        const heading = page.getByRole('heading', { name: 'Contact', exact: true });
        await expect(heading).toBeInViewport();
        const headerBox = (await page.locator('.site-header').boundingBox())!;
        const headingBox = (await heading.boundingBox())!;
        expect(headingBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
        await expect(page.locator('.wordmark')).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('.site-nav li a[aria-current]')).toHaveCount(0);
      }
    });
  });
}
