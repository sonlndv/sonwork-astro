import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

for (const width of [390, 1440]) for (const theme of ['dark', 'light'] as const) for (const javaScriptEnabled of [true, false]) {
  test(`production ${width} ${theme} JS=${javaScriptEnabled}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, colorScheme: theme, viewport: { width, height: 900 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    for (const path of ['/', '/about', '/work', '/work/trivia-hub', '/writing', '/subscribe']) {
      expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.draft-label')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sonwork.org${path}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const form of await page.locator('.subscribe-form').all()) {
        await expect(form.locator('button[type="submit"]')).toBeDisabled();
        await expect(form).not.toHaveAttribute('data-signup-url');
      }
      if (path === '/') {
        await expect(page.locator('.home-intro')).toContainText('Vietnam');
        await expect(page.locator('.front-projects h3')).toHaveText(['Trivia Hub', 'Keymarchy', 'Perfeat']);
      }
      if (path === '/writing') await expect(page.locator('main a[href^="/writing/"]')).toHaveCount(0);
    }
    await context.close();
  });
}
test('production excludes all three draft posts and RSS entries', async ({ request }) => {
  const posts = readdirSync('src/content/posts').filter(f => f.endsWith('.mdx'));
  expect(posts).toHaveLength(3);
  for (const file of posts) {
    expect(readFileSync(`src/content/posts/${file}`, 'utf8')).toMatch(/^draft: true$/m);
    expect((await request.get(`/writing/${file.replace(/\.mdx$/, '')}`)).status()).toBe(404);
  }
  expect(await (await request.get('/rss.xml')).text()).not.toContain('<item>');
});


test('unknown error page is noindex without a canonical or OG URL to a gone path', async ({ page }) => {
  expect((await page.goto('/review-unknown-error-page'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});
