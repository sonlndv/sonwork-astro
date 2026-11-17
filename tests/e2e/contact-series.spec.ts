import { test, expect } from '@playwright/test';
import { publicationScope, PRIVATE_PREVIEW_ROUTES } from '../../scripts/publication-scope.mjs';
const scope = publicationScope();
const links = [
  ['son@sonwork.org', 'mailto:son@sonwork.org'],
  ['X @sonldv', 'https://x.com/sonldv'],
  ['GitHub sonlndv', 'https://github.com/sonlndv'],
  ['LinkedIn in/sonle2003', 'https://www.linkedin.com/in/sonle2003/'],
];
const oldPaths = ['how-i-use-gbrain', 'how-i-use-hermes', 'how-i-use-openmaus', 'how-i-use-omp', 'how-i-use-obsidian'];
const currentSeriesPaths = ['/series', ...oldPaths.map(slug => `/series/${slug}`), ...scope.privatePreviewRoutes];
const retired = /How I use|planned series|planned topics|five practical|Always-on agents|Available isn.t always thinking|05\s*(?:notes|series)/i;

for (const theme of ['dark', 'light'] as const) {
  test(`About contacts have exact public links, focus and first-activation hitboxes (${theme})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    const row = page.getByRole('navigation', { name: 'Contact Son', exact: true });
    await expect(row.getByRole('link')).toHaveCount(4);
    for (const [name, href] of links) {
      const link = row.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', href); await expect(link).toBeVisible();
      await link.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      await expect(link).toBeFocused();
      expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
      expect(await link.evaluate(el => { const r = el.getBoundingClientRect(); return r.height >= 44 && r.width >= 44 && r.left >= 0 && r.right <= innerWidth && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })).toBe(true);
      // Intercept the default locally: no external navigation or mail client opens.
      await link.evaluate(el => el.addEventListener('click', event => { event.preventDefault(); el.setAttribute('data-tested-click', String(event.isTrusted)); }, { once: true }));
      if (isMobile) await link.tap(); else await link.click();
      await expect(link).toHaveAttribute('data-tested-click', 'true');
    }
    await expect(page.locator('main')).not.toContainText(retired);
    await expect(page.locator('.planned-preview, .home-feature, .about-opening a[href^="/series/"]')).toHaveCount(0);
    await expect(page.locator('form, input, [data-tools] a')).toHaveCount(0);
  });
  test(`every retained Series destination is only generic Coming soon including metadata (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const path of currentSeriesPaths) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      await expect(page.locator('main')).toHaveText('Series.Coming soon');
      await expect(page).toHaveTitle('Series | Son.');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Coming soon.');
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Series');
      await expect(page.locator('main')).not.toContainText(retired);
      await expect(page.locator('main a, main time, main article, main details, main button, main li, [data-simulation]')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Pages in progress', exact: true }).getByRole('link', { name: 'Series (coming soon)', exact: true })).toHaveAttribute('aria-current', 'page');
      if (path.includes('always-on-agents')) {
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      }
    }
    if (scope.isPublicProjection) for (const path of PRIVATE_PREVIEW_ROUTES) {
      expect((await page.goto(path))?.status(), 'excluded private draft must not gain a public preview route').toBe(404);
      await expect(page.locator('main')).not.toContainText(retired);
    }
  });
  test(`contacts and empty Series remain complete without JavaScript (${theme})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: theme, viewport: { width: 320, height: 667 } });
    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/`);
      const row = page.getByRole('navigation', { name: 'Contact Son', exact: true });
      await expect(row.getByRole('link')).toHaveCount(4);
      for (const [name, href] of links) {
        const link = row.getByRole('link', { name, exact: true });
        await expect(link).toHaveAttribute('href', href); await expect(link).toBeVisible();
      }
      await expect(page.locator('.tools-static strong')).toHaveCount(5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const path of currentSeriesPaths) {
        expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(200);
        await expect(page.locator('main')).toHaveText('Series.Coming soon');
        await expect(page).toHaveTitle('Series | Son.');
        await expect(page.locator('main')).not.toContainText(retired);
        await expect(page.locator('main a, main article, main li, main time')).toHaveCount(0);
      }
      if (scope.isPublicProjection) for (const path of PRIVATE_PREVIEW_ROUTES) {
        expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(404);
        await expect(page.locator('main')).not.toContainText(retired);
      }
    } finally { await context.close(); }
  });
}
