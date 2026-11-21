import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
const tools = JSON.parse(readFileSync('src/data/tools.json', 'utf8')) as { id: string; name: string }[];
const snapshot = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const retainedPaths = JSON.parse(readFileSync('src/data/retained-series-slugs.json', 'utf8')).map((slug: string) => `/series/${slug}`);
const openMausPath = '/series/how-i-use-openmaus';
// One logical note: the global EN/VI toggle switches its title, metadata
// and diagram, in place on one page — never a second slug or a second link.
const openMausNote = {
  slug: 'openmaus-explained',
  titleEn: 'What is OpenMaus?', titleVi: 'OpenMaus là gì?',
  imageEn: '/images/openmaus-en-website-r10.png', imageVi: '/images/openmaus-vi-website-r10.png',
  altEn: 'Supported AI engines connect to OpenMaus, where bots research, write and plan.',
  altVi: 'Các engine AI kết nối với OpenMaus để các bot nghiên cứu, viết bài và lập kế hoạch.',
};
const openMausNotePath = `${openMausPath}/${openMausNote.slug}`;

for (const width of [390, 1440]) for (const theme of ['dark', 'light'] as const) for (const javaScriptEnabled of [true, false]) {
  test(`production ${width} ${theme} JS=${javaScriptEnabled}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, colorScheme: theme, viewport: { width, height: 900 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    for (const path of ['/', '/series', '/series/me', '/study', '/hobbies', ...retainedPaths, openMausNotePath, '/project', '/about', '/work', '/work/trivia-hub', '/series/me/the-joy-of-malleable-products', '/subscribe']) {
      expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.draft-label')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sonwork.org${path}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('form, input, button[type="submit"]')).toHaveCount(0);
      await expect(page.locator('[data-signup-url], [data-signup-key], [data-newsletter]')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).locator('ul a')).toHaveText(['About Me', 'Series', 'Study', 'Hobbies', 'Contact']);
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Series', exact: true })).toHaveAttribute('href', '/series');
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Study', exact: true })).toHaveAttribute('href', '/study');
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Hobbies', exact: true })).toHaveAttribute('href', '/hobbies');
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
      await expect(page.getByRole('navigation', { name: 'Pages in progress', exact: true }).getByRole('link')).toHaveText(['Project (coming soon)']);
      await expect(page.getByRole('navigation', { name: 'Archive and contact' }).getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
      if (path === '/subscribe') {
        await expect(page.locator('.signup-closed')).toHaveText('Signup opens soon.');
        await expect(page.locator('.signup-closed')).toBeVisible();
      } else if (path === '/') {
        await expect(page.locator('.signup-closed')).toHaveCount(0);
      }
      if (path === '/subscribe') {
        await expect(page.locator('main')).toContainText('No subscription has been changed here.');
        await expect(page.getByRole('link', { name: 'son@sonwork.org', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
        await expect(page.locator('main').getByRole('link', { name: 'All series', exact: true })).toHaveAttribute('href', '/series');
      }
      if (path === '/') {
        await expect(page.locator('.home-intro')).toContainText('Vietnam');
        const contacts = page.getByRole('navigation', { name: 'Contact Son', exact: true });
        await expect(contacts.getByRole('link')).toHaveText(['son@sonwork.org', 'X @sonldv', 'GitHub sonlndv', 'LinkedIn in/sonle2003']);
        expect(await contacts.getByRole('link').evaluateAll(els => els.map(el => el.getAttribute('href')))).toEqual(['mailto:son@sonwork.org', 'https://x.com/sonldv', 'https://github.com/sonlndv', 'https://www.linkedin.com/in/sonle2003/']);
        await expect(page.locator('.home-feature, .planned-preview, .home-project')).toHaveCount(0);
        await expect(page.locator('h1')).toHaveText('Trying things with AI.Learning as I go.');
        await expect(page.locator('.github-calendar')).toHaveCount(1);
        await expect(page.locator('#calendar-description')).toContainText('2,165 contributions. Not live data.');
        await expect(page.locator('.github-calendar details, .github-calendar select, [data-calendar-picker]')).toHaveCount(0);
        const days = await page.locator('.calendar-day').evaluateAll(els => els.map(el => ({ date: (el as HTMLElement).dataset.date, count: Number((el as HTMLElement).dataset.count), level: Number((el as HTMLElement).dataset.level) })));
        expect(days).toEqual(snapshot.days);
        if (javaScriptEnabled) await expect(page.locator('.tool-choice')).toHaveText(tools.map(tool => tool.name));
        else await expect(page.locator('.tools-static strong')).toHaveText(tools.map(tool => tool.name));
        await expect(page.locator('.note-disclosure, main .draft-label')).toHaveCount(0);
        await expect(page.locator('main a[href="/subscribe"], .front-newsletter')).toHaveCount(0);
      }
      if (path === '/project') {
        await expect(page.locator('h1')).toHaveText('Coming soon.');
        await expect(page.locator('main .work-card, main .build-entry')).toHaveCount(0);
        await expect(page.locator('.project-coming .go')).toHaveAttribute('href', '/');
      }
      if (retainedPaths.includes(path) && path !== openMausPath) {
        await expect(page.locator('main')).toHaveText('Series.Coming soon');
        await expect(page).toHaveTitle('Series | Son.');
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Coming soon.');
        await expect(page.locator('main a, main li, main time, main article, main button')).toHaveCount(0);
        await expect(page.locator('main')).not.toContainText(/How I use|planned|Always-on|05/);
      }
      if (path === '/series') {
        await expect(page.locator('main .rows > li')).toHaveCount(2);
        await expect(page.locator(`main a[href="${openMausPath}"]`)).toHaveText('How I use OpenMaus');
        await expect(page.locator('main a[href="/series/me"]')).toHaveText('Me');
        await expect(page.locator('main .empty')).toHaveCount(0);
      }
      if (path === '/series/me') {
        await expect(page.locator('h1')).toHaveText('Me');
        await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
        await expect(page.locator('main .rows > li')).toHaveCount(1);
        await expect(page.locator('main a[href="/series/me/the-joy-of-malleable-products"]')).toHaveText('The joy of malleable products');
      }
      if (path === openMausPath) {
        await expect(page.locator('h1')).toHaveText('How I use OpenMaus');
        await expect(page).toHaveTitle('How I use OpenMaus | Son.');
        await expect(page.locator('main .rows h3 a')).toHaveText([openMausNote.titleEn]);
        await expect(page.getByRole('link', { name: openMausNote.titleEn, exact: true })).toHaveAttribute('href', openMausNotePath);
      }
      if (path === openMausNotePath) {
        await expect(page.locator('h1')).toHaveText(openMausNote.titleEn);
        await expect(page).toHaveTitle(`${openMausNote.titleEn} | Son.`);
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', openMausNote.titleEn);
        await expect(page.locator('meta[name="robots"][content*="noindex"], main button, main select')).toHaveCount(0);
        await expect(page.locator('main time')).toHaveAttribute('datetime', '2026-11-21');
        const images = page.locator('article .prose img');
        // Both language diagrams render into the DOM; the toggle CSS-hides one.
        await expect(images).toHaveCount(2);
        const enImage = page.locator(`article .prose img[src="${openMausNote.imageEn}"]`);
        const viImage = page.locator(`article .prose img[src="${openMausNote.imageVi}"]`);
        await expect(enImage).toHaveAttribute('alt', openMausNote.altEn);
        await expect(viImage).toHaveAttribute('alt', openMausNote.altVi);
        await enImage.scrollIntoViewIfNeeded();
        await expect(enImage).toBeVisible();
        await expect.poll(() => enImage.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1440 && el.naturalHeight === 1200)).toBe(true);
        expect(await enImage.evaluate(el => { const bounds = el.getBoundingClientRect(); return bounds.left >= 0 && bounds.right <= innerWidth; })).toBe(true);
        await expect(page.getByRole('navigation', { name: 'Note location', exact: true }).getByRole('link')).toHaveText(['Series', 'How I use OpenMaus']);
        await expect(page.getByRole('link', { name: 'All notes in How I use OpenMaus', exact: true })).toHaveAttribute('href', openMausPath);
      }
      if (path === '/study') {
        await expect(page.locator('h1')).toHaveText('Study');
        await expect(page.locator('main .page-head p')).toHaveText('Coming soon.');
      }
      if (path === '/hobbies') {
        await expect(page.locator('h1')).toHaveText('Hobbies');
        await expect(page.locator('main .page-head p')).toHaveText('Coming soon.');
        await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Hobbies', exact: true })).toHaveAttribute('aria-current', 'page');
      }
      if (path === '/series/me/the-joy-of-malleable-products') {
        await expect(page.locator('h1')).toHaveText('The joy of malleable products');
        await expect(page.locator('video')).toHaveCount(0);
        const image = page.locator('article figure img');
        await expect(image).toHaveAttribute('src', '/images/mounty-dark-demo.png');
        await expect(image).toHaveAttribute('width', '800');
        await expect(image).toHaveAttribute('height', '604');
        await expect(image).toHaveAttribute('alt', 'Annotated Mounty dark-theme Obsidian demo vault showing the file sidebar, writing area and graph view.');
        await expect(page.locator('article figure figcaption')).toHaveText('Mounty’s dark theme in a public demo vault with illustrative content.');
        await expect(page.locator('article figure a')).toHaveAttribute('href', 'https://github.com/sonlndv/Mounty');
        expect(await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 800 && el.naturalHeight === 604)).toBe(true);
        expect(await image.evaluate((el: HTMLImageElement) => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
        await expect(page.getByRole('navigation', { name: 'Note location', exact: true }).getByRole('link')).toHaveText(['Series', 'Me']);
        await expect(page.getByRole('link', { name: 'All notes in Me', exact: true })).toHaveAttribute('href', '/series/me');
      }
    }
    for (const [from, to] of [['/writing', '/series'], ['/writing/the-joy-of-malleable-products', '/series/me/the-joy-of-malleable-products']]) {
      const moved = await page.request.get(`${baseURL}${from}`, { maxRedirects: 0 });
      expect(moved.status()).toBe(301);
      expect(new URL(moved.headers().location, baseURL).pathname).toBe(to);
      await page.goto(`${baseURL}${from}`);
      await expect(page).toHaveURL(`${baseURL}${to}`);
    }
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About Me', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/`);
    await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About Me', exact: true })).toHaveAttribute('aria-current', 'page');
    expect((await page.request.get('/series/always-on-agents/available-isnt-always-thinking')).status()).toBe(404);
    expect((await page.request.get('/series/always-on-agents')).status()).toBe(404);
    await context.close();
  });
}
test('production excludes all three original draft posts and publishes exactly the Me note and the one logical OpenMaus note in RSS', async ({ request }) => {
  const note = 'the-joy-of-malleable-products.mdx';
  const files = readdirSync('src/content/posts').filter(f => f.endsWith('.mdx'));
  expect(files).not.toContain(note);
  const approved = readFileSync(`src/content/notes/me/${note}`, 'utf8');
  expect(approved).toMatch(/^draft: false$/m);
  expect(approved).toMatch(/^series: me$/m);
  const drafts = files.sort();
  expect(drafts).toEqual(['a-keyboard-plugin-is-done-when-it-types.mdx', 'a-new-default-must-not-break-the-old-one.mdx', 'no-answer-leaves-the-server.mdx']);
  for (const file of drafts) {
    expect(readFileSync(`src/content/posts/${file}`, 'utf8')).toMatch(/^draft: true$/m);
    expect((await request.get(`/writing/${file.replace(/\.mdx$/, '')}`)).status()).toBe(404);
  }
  expect((await request.get(`/series/me/${note.replace(/\.mdx$/, '')}`)).status()).toBe(200);
  const feed = await (await request.get('/rss.xml')).text();
  const items = feed.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  expect(items).toHaveLength(2);
  expect(items.filter(item => item.includes('<title>The joy of malleable products</title>') && item.includes('/series/me/the-joy-of-malleable-products'))).toHaveLength(1);
  expect((await request.get(openMausNotePath)).status()).toBe(200);
  expect(items.filter(item => item.includes(`<title>${openMausNote.titleEn}</title>`) && item.includes(`<link>https://sonwork.org${openMausNotePath}</link>`))).toHaveLength(1);
  for (const file of drafts) expect(feed).not.toContain(file.replace(/\.mdx$/, ''));
});


test('unknown error page is noindex without a canonical or OG URL to a gone path', async ({ page }) => {
  expect((await page.goto('/review-unknown-error-page'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});
