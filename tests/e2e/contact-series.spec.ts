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
const openMausPath = '/series/how-i-use-openmaus';
// One logical note, shown as one page: the global language toggle switches
// its title, metadata and body between these two, it never produces a
// second page or a second link.
const openMausNote = {
  slug: 'openmaus-explained',
  titleEn: 'What is OpenMaus?',
  titleVi: 'OpenMaus là gì?',
  imageEn: '/images/openmaus-en-website-r10.png',
  imageVi: '/images/openmaus-vi-website-r10.png',
  altEn: 'Supported AI engines connect to OpenMaus, where bots research, write and plan.',
  altVi: 'Các engine AI kết nối với OpenMaus để các bot nghiên cứu, viết bài và lập kế hoạch.',
};
const currentSeriesPaths = [...oldPaths.filter(slug => slug !== 'how-i-use-openmaus').map(slug => `/series/${slug}`), ...scope.privatePreviewRoutes];
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
  test(`unpublished retained Series destinations stay generic Coming soon including metadata (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const path of currentSeriesPaths) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      await expect(page.locator('main')).toHaveText('Series.Coming soon');
      await expect(page).toHaveTitle('Series | Son.');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Coming soon.');
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Series');
      await expect(page.locator('main')).not.toContainText(retired);
      await expect(page.locator('main a, main time, main article, main details, main button, main li, [data-simulation]')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Series', exact: true })).toHaveAttribute('aria-current', 'page');
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
  test(`Series contains Me and OpenMaus, with native return navigation (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Series', exact: true }).click();
    await expect(page).toHaveURL('/series');
    await expect(page.locator('main .rows > li')).toHaveCount(2);
    await expect(page.locator('main').getByRole('link', { name: 'How I use OpenMaus', exact: true })).toHaveAttribute('href', openMausPath);
    await page.locator('main').getByRole('link', { name: 'Me', exact: true }).click();
    await expect(page).toHaveURL('/series/me');
    await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
    await expect(page.locator('main .rows > li')).toHaveCount(1);
    await page.locator('main').getByRole('link', { name: 'The joy of malleable products', exact: true }).click();
    await expect(page).toHaveURL('/series/me/the-joy-of-malleable-products');
    await expect(page.locator('h1')).toHaveText('The joy of malleable products');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sonwork.org/series/me/the-joy-of-malleable-products');
    await expect(page.locator('main time')).toHaveAttribute('datetime', '2026-11-04');
    const feed = await (await page.request.get('/rss.xml')).text();
    expect(feed).toContain('/series/me/the-joy-of-malleable-products');
    for (const privatePath of PRIVATE_PREVIEW_ROUTES) expect(feed).not.toContain(privatePath);
    expect(feed).toContain(`${openMausPath}/${openMausNote.slug}`);
    expect(feed).not.toMatch(/planned series|planned topics|Always-on agents|Available isn.t always thinking/i);
    const location = page.getByRole('navigation', { name: 'Note location', exact: true });
    await expect(location.getByRole('link')).toHaveText(['Series', 'Me']);
    await expect(location.getByRole('link', { name: 'Me', exact: true })).toHaveAttribute('href', '/series/me');
    await page.getByRole('link', { name: 'All notes in Me', exact: true }).click();
    await expect(page).toHaveURL('/series/me');
    await page.locator('main').getByRole('link', { name: 'All series', exact: true }).click();
    await expect(page).toHaveURL('/series');
    await expect(page.locator('main .rows > li')).toHaveCount(2);
  });
  test(`OpenMaus is one bilingual note that the global language toggle switches, not a second page (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/series');
    await page.locator('main').getByRole('link', { name: 'How I use OpenMaus', exact: true }).click();
    await expect(page).toHaveURL(openMausPath);
    await expect(page.locator('h1')).toHaveText('How I use OpenMaus');
    await expect(page.locator('main .rows > li')).toHaveCount(1);
    await expect(page.locator('main .rows h3 a')).toHaveText([openMausNote.titleEn]);
    const link = page.locator('main').getByRole('link', { name: openMausNote.titleEn, exact: true });
    await expect(link).toHaveAttribute('href', `${openMausPath}/${openMausNote.slug}`);
    await link.click();
    await expect(page).toHaveURL(`${openMausPath}/${openMausNote.slug}`);
    await expect(page.locator('h1')).toHaveText(openMausNote.titleEn);
    await expect(page).toHaveTitle(`${openMausNote.titleEn} | Son.`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sonwork.org${openMausPath}/${openMausNote.slug}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', openMausNote.titleEn);
    await expect(page.locator('main time')).toHaveAttribute('datetime', '2026-11-21');
    const images = page.locator('article .prose img');
    await expect(images).toHaveCount(2);
    const enImage = page.locator(`article .prose img[src="${openMausNote.imageEn}"]`);
    const viImage = page.locator(`article .prose img[src="${openMausNote.imageVi}"]`);
    await expect(enImage).toHaveAttribute('alt', openMausNote.altEn);
    await expect(viImage).toHaveAttribute('alt', openMausNote.altVi);
    await enImage.scrollIntoViewIfNeeded();
    await expect(enImage).toBeVisible();
    await expect(viImage).toBeHidden();
    await expect.poll(() => enImage.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1440 && el.naturalHeight === 1200)).toBe(true);
    await expect(page.locator('main button, main select, .draft-label, meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Note location', exact: true }).getByRole('link')).toHaveText(['Series', 'How I use OpenMaus']);

    // The one global toggle, not a second per-note control, switches the title, metadata and body together.
    await page.locator('.lang-toggle').click();
    await expect(page).toHaveURL(`${openMausPath}/${openMausNote.slug}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('h1')).toHaveText(openMausNote.titleVi);
    await expect(page).toHaveTitle(`${openMausNote.titleVi} | Son.`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', openMausNote.titleVi);
    await expect(viImage).toBeVisible();
    await expect(enImage).toBeHidden();
    await expect.poll(() => viImage.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1440 && el.naturalHeight === 1200)).toBe(true);

    await page.getByRole('link', { name: 'Tất cả bài trong Cách mình dùng OpenMaus', exact: true }).click();
    await expect(page).toHaveURL(openMausPath);
    await expect(page.locator('main .rows > li')).toHaveCount(1);
  });
  test(`contacts, Series hierarchy and retained routes remain complete without JavaScript (${theme})`, async ({ browser, baseURL }) => {
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
      await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Series', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/series`);
      await page.locator('main').getByRole('link', { name: 'Me', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/series/me`);
      await page.locator('main').getByRole('link', { name: 'The joy of malleable products', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/series/me/the-joy-of-malleable-products`);
      await expect(page.locator('h1')).toHaveText('The joy of malleable products');
      await expect(page.locator('article figure img').first()).toBeVisible();
      await page.getByRole('link', { name: 'All notes in Me', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/series/me`);
      await page.goto(`${baseURL}/series`);
      await page.locator('main').getByRole('link', { name: 'How I use OpenMaus', exact: true }).click();
      // Without JS the toggle never appears (it's JS-revealed), so the page renders its English default.
      await page.locator('main').getByRole('link', { name: openMausNote.titleEn, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}${openMausPath}/${openMausNote.slug}`);
      await expect(page.locator('h1')).toHaveText(openMausNote.titleEn);
      const enImage = page.locator(`article .prose img[src="${openMausNote.imageEn}"]`);
      await expect(enImage).toBeVisible();
      await enImage.scrollIntoViewIfNeeded();
      await expect.poll(() => enImage.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1440 && el.naturalHeight === 1200)).toBe(true);
      await page.getByRole('link', { name: 'All notes in How I use OpenMaus', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}${openMausPath}`);
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
