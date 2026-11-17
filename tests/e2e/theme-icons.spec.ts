import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light'] as const) {
  test(`approved sun/moon control is a labelled 44px target and persists choice (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    const toggle = page.locator('.theme-toggle');
    const initial = theme === 'dark' ? 'sun' : 'moon';
    const next = theme === 'dark' ? 'light' : 'dark';
    await expect(toggle.locator('[data-theme-icon="sun"]')).toHaveCount(1);
    await expect(toggle.locator('[data-theme-icon="moon"]')).toHaveCount(1);
    await expect(toggle.locator(`[data-theme-icon="${initial}"]`)).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', `Switch to ${next} mode`);
    const box = (await toggle.boundingBox())!;
    expect(box.width).toBe(44); expect(box.height).toBe(44);
    await toggle.focus(); await toggle.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', next);
    await expect(toggle.locator(`[data-theme-icon="${initial === 'sun' ? 'moon' : 'sun'}"]`)).toBeVisible();
    await expect(toggle.locator(`[data-theme-icon="${initial}"]`)).toBeHidden();
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Writing', exact: true }).click();
    await expect(page).toHaveURL('/writing');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', next);
    await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-label', `Switch to ${theme} mode`);
  });
}
