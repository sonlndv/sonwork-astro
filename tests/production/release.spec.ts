import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
const tools = JSON.parse(readFileSync('src/data/tools.json', 'utf8')) as { id: string; name: string }[];
const snapshot = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const retainedPaths = JSON.parse(readFileSync('src/data/retained-series-slugs.json', 'utf8')).map((slug: string) => `/series/${slug}`);

for (const width of [390, 1440]) for (const theme of ['dark', 'light'] as const) for (const javaScriptEnabled of [true, false]) {
  test(`production ${width} ${theme} JS=${javaScriptEnabled}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, colorScheme: theme, viewport: { width, height: 900 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    for (const path of ['/', '/series', ...retainedPaths, '/project', '/about', '/work', '/work/trivia-hub', '/writing', '/writing/the-joy-of-malleable-products', '/subscribe']) {
      expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.draft-label')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sonwork.org${path}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('form, input, button[type="submit"]')).toHaveCount(0);
      await expect(page.locator('[data-signup-url], [data-signup-key], [data-newsletter]')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Main', exact: true }).locator('ul a')).toHaveText(['About Me', 'Series', 'Project']);
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
        await expect(page.getByRole('link', { name: 'All writing', exact: true })).toHaveAttribute('href', '/writing');
      }
      if (path === '/') {
        await expect(page.locator('.home-intro')).toContainText('Vietnam');
        const contacts = page.getByRole('navigation', { name: 'Contact Son', exact: true });
        await expect(contacts.getByRole('link')).toHaveText(['son@sonwork.org', 'X @sonldv', 'GitHub sonlndv', 'LinkedIn in/sonle2003']);
        expect(await contacts.getByRole('link').evaluateAll(els => els.map(el => el.getAttribute('href')))).toEqual(['mailto:son@sonwork.org', 'https://x.com/sonldv', 'https://github.com/sonlndv', 'https://www.linkedin.com/in/sonle2003/']);
        await expect(page.locator('.home-feature, .planned-preview')).toHaveCount(0);
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
      }
      if (path === '/series' || retainedPaths.includes(path)) {
        await expect(page.locator('main')).toHaveText('Series.Coming soon');
        await expect(page).toHaveTitle('Series | Son.');
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Coming soon.');
        await expect(page.locator('main a, main li, main time, main article, main button')).toHaveCount(0);
        await expect(page.locator('main')).not.toContainText(/How I use|planned|Always-on|05/);
      }
      if (path === '/writing') {
        await expect(page.locator('main a[href^="/writing/"]')).toHaveCount(1);
        await expect(page.locator('main a[href="/writing/the-joy-of-malleable-products"]')).toHaveText('The joy of malleable products');
        await expect(page.locator('main .empty')).toHaveCount(0);
      }
      if (path === '/writing/the-joy-of-malleable-products') {
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
      }
    }
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About Me', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/`);
    await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About Me', exact: true })).toHaveAttribute('aria-current', 'page');
    expect((await page.request.get('/series/always-on-agents/available-isnt-always-thinking')).status()).toBe(404);
    expect((await page.request.get('/series/always-on-agents')).status()).toBe(404);
    await context.close();
  });
}
test('production excludes all three original draft posts and publishes exactly the approved Note in RSS', async ({ request }) => {
  const note = 'the-joy-of-malleable-products.mdx';
  const files = readdirSync('src/content/posts').filter(f => f.endsWith('.mdx'));
  expect(files.sort()).toHaveLength(4);
  expect(files).toContain(note);
  expect(readFileSync(`src/content/posts/${note}`, 'utf8')).toMatch(/^draft: false$/m);
  const drafts = files.filter(f => f !== note);
  expect(drafts).toEqual(['a-keyboard-plugin-is-done-when-it-types.mdx', 'a-new-default-must-not-break-the-old-one.mdx', 'no-answer-leaves-the-server.mdx']);
  for (const file of drafts) {
    expect(readFileSync(`src/content/posts/${file}`, 'utf8')).toMatch(/^draft: true$/m);
    expect((await request.get(`/writing/${file.replace(/\.mdx$/, '')}`)).status()).toBe(404);
  }
  expect((await request.get(`/writing/${note.replace(/\.mdx$/, '')}`)).status()).toBe(200);
  const feed = await (await request.get('/rss.xml')).text();
  expect(feed.match(/<item>/g)).toHaveLength(1);
  expect(feed).toContain('/writing/the-joy-of-malleable-products');
  for (const file of drafts) expect(feed).not.toContain(file.replace(/\.mdx$/, ''));
});


test('unknown error page is noindex without a canonical or OG URL to a gone path', async ({ page }) => {
  expect((await page.goto('/review-unknown-error-page'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});
