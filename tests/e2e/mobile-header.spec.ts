import { expect, test } from '@playwright/test';

test('phone reading keeps navigation and theme reachable while branding scrolls away', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/about');
  await page.evaluate(() => document.fonts.ready);
  const brand = page.locator('.personal-brand');
  await expect(brand).toBeInViewport();
  await page.evaluate(() => scrollTo(0, 320));
  await expect.poll(async () => {
    const box = (await brand.boundingBox())!;
    return box.y + box.height;
  }).toBeLessThanOrEqual(1);
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const link of await nav.locator('ul a').all()) {
    const box = (await link.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const theme = page.getByRole('button', { name: 'Switch to light theme', exact: true });
  await expect(theme).toBeInViewport();
  const before = await page.evaluate(() => scrollY);
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => scrollY)).toBe(before);
  const home = page.locator('.wordmark');
  for (let i = 0; i < 10 && !(await home.evaluate(el => el === document.activeElement)); i++) {
    await page.keyboard.press('Shift+Tab');
  }
  await expect(home).toBeFocused();
  await expect(home).toBeInViewport();
});

test.describe('phone navigation without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('scrolled navigation reaches Contact without covering its heading', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/about');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 320));
    const nav = page.getByRole('navigation', { name: 'Main' });
    const contact = nav.getByRole('link', { name: 'Contact', exact: true });
    await expect(contact).toBeInViewport();
    await contact.click();
    const heading = page.getByRole('heading', { name: 'Contact', exact: true });
    await expect(heading).toBeInViewport();
    const headingBox = (await heading.boundingBox())!;
    const headerBox = (await page.locator('.site-header').boundingBox())!;
    expect(headingBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  });
});
