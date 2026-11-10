import { test, expect, type Page } from '@playwright/test';

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function expectSingletons(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText("I'm Son");
  await expect(page.locator('.mtn-scene')).toHaveCount(1);
  await expect(page.locator('.companion')).toHaveCount(1);
}

for (const [width, height] of [[375, 667], [390, 844]]) for (const theme of ['dark', 'light'] as const) {
  test(`phone primary project action fits ${width}x${height} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(t => localStorage.setItem('theme', t), theme);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expectSingletons(page);
    const h1 = page.locator('h1');
    const heading = (await h1.boundingBox())!;
    const lineHeight = parseFloat(await h1.evaluate(el => getComputedStyle(el).lineHeight));
    expect(heading.height).toBeLessThanOrEqual(lineHeight * 1.1);
    const primary = page.getByRole('link', { name: /^Play\b.*Trivia Hub$/ });
    await expect(primary).toHaveAttribute('href', 'https://games.sonwork.org');
    const action = (await primary.boundingBox())!;
    expect(action.height).toBeGreaterThanOrEqual(44);
    expect(action.width).toBeGreaterThanOrEqual(44);
    expect(action.y).toBeGreaterThanOrEqual(0);
    expect(action.y + action.height).toBeLessThanOrEqual(height);
    expect(action.x).toBeGreaterThanOrEqual(0);
    expect(action.x + action.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    const entries = page.locator('.build-entry');
    const first = (await entries.first().boundingBox())!;
    const second = (await entries.nth(1).boundingBox())!;
    expect(second.y - (first.y + first.height)).toBeGreaterThanOrEqual(16);
    expect(await entries.nth(1).evaluate(el => parseFloat(getComputedStyle(el).borderTopWidth))).toBe(1);
    await expect(entries.nth(1).getByRole('link', { name: /^Live page\b.*Keymarchy$/ })).toHaveClass('primary-action');
    await expect(page.getByRole('heading', { name: 'Selected projects', exact: true })).toHaveAttribute('id', 'home-projects');
    await expect(page.locator('.front-projects')).toHaveAttribute('aria-labelledby', 'home-projects');
    expect(await noOverflow(page)).toBe(true);
  });
}

for (const width of [320, 340, 430, 719, 720, 1440]) {
  test(`Home composition remains native and overflow-free at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expectSingletons(page);
    expect(await noOverflow(page)).toBe(true);
    if (width === 1440) {
      const entries = await page.locator('.build-entry').evaluateAll(els => els.map(el => {
        const { x, y, width } = el.getBoundingClientRect();
        return { x, y, width };
      }));
      expect(new Set(entries.map(entry => Math.round(entry.y))).size).toBe(1);
      expect(entries[1].x).toBeGreaterThan(entries[0].x + entries[0].width);
      expect(entries[2].x).toBeGreaterThan(entries[1].x + entries[1].width);
    }
    await page.locator('summary').click();
    expect(await noOverflow(page)).toBe(true);
  });
}

test('Home content geometry is static under reduced motion', async ({ browser, baseURL }) => {
  const heights: number[] = [];
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await page.evaluate(() => document.fonts.ready);
    heights.push(Math.round((await page.locator('.front-about').boundingBox())!.height));
    await context.close();
  }
  expect(heights[1]).toBe(heights[0]);
});

// R7 project feedback: genuine Tab traversal (no programmatic focus) reaches the native links.
async function tabTo(page: Page, selector: string) {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(sel => document.activeElement?.matches(sel) ?? false, selector)) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

const firstTitle = '.build-entry:first-child h3 a';
const playAction = '.build-entry:first-child .build-action a[href="https://games.sonwork.org"]';

for (const width of [375, 1440]) {
  test(`project title keyboard focus turns lume and keeps the native outline at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const title = page.locator(firstTitle);
    await expect(title).toHaveText('Trivia Hub');
    const inkBefore = await title.evaluate(el => getComputedStyle(el).color);
    await tabTo(page, firstTitle);
    expect(await title.evaluate(el => el.matches(':focus-visible'))).toBe(true);
    // Resolve the token through the browser on a probe, not through the element under test.
    const lume = await title.evaluate(el => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--lume)';
      el.parentElement!.appendChild(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    expect(lume).not.toBe(inkBefore);
    await expect(title).toHaveCSS('color', lume);
    const outline = await title.evaluate(el => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /^Play\b/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /^Case study\b/ })).toBeFocused();
    await tabTo(page, '.home-build summary');
    await page.keyboard.press('Enter');
    await expect(page.locator('.home-build')).toHaveAttribute('open', '');
    await expect(page.locator('.home-build p')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Full About and contributions', exact: true })).toBeFocused();
  });
}

test('project arrow nudges 2px on focus and fine-pointer hover only when motion is allowed', async ({ browser, baseURL }) => {
  const nudged = 'matrix(1, 0, 0, 1, 2, 0)';
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    // Explicitly a desktop, fine-pointer context (the mobile project would otherwise inherit touch).
    const context = await browser.newContext({ reducedMotion, isMobile: false, hasTouch: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
    const arrow = page.locator(`${playAction} .arrow`);
    await expect(arrow).toHaveCSS('transform', 'none');
    await tabTo(page, playAction);
    if (reducedMotion === 'no-preference') {
      await expect(arrow).toHaveCSS('transition-duration', '0.16s');
      await expect(arrow).toHaveCSS('transform', nudged);
    } else {
      await expect(arrow).toHaveCSS('transition-duration', '0s');
      await expect(arrow).toHaveCSS('transform', 'none');
    }
    await page.mouse.move(0, 0);
    await page.keyboard.press('Shift+Tab');
    await expect(arrow).toHaveCSS('transform', 'none');
    await page.locator(playAction).hover();
    await expect(arrow).toHaveCSS('transform', reducedMotion === 'no-preference' ? nudged : 'none');
    await context.close();
  }
});

for (const [width, height] of [[375, 667], [390, 844]]) {
  test(`Home keeps primary links and disclosure without JS at ${width}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await page.evaluate(() => document.fonts.ready);
    const primary = page.getByRole('link', { name: /^Play\b.*Trivia Hub$/ });
    await expect(primary).toHaveAttribute('href', 'https://games.sonwork.org');
    const action = (await primary.boundingBox())!;
    expect(action.y + action.height).toBeLessThanOrEqual(height);
    expect(action.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await tabTo(page, playAction);
    await expect(primary).toBeFocused();
    await page.keyboard.press('Tab');
    const caseStudy = page.getByRole('link', { name: /^Case study\b.*Trivia Hub$/ });
    await expect(caseStudy).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/work\/trivia-hub\/?$/);
    await page.goBack();
    await page.locator('summary').click();
    await expect(page.locator('details p')).toBeVisible();
    await expect(page.locator('.home-details .hermes-note')).toHaveCount(1);
    await expect(page.locator('.signup-closed, main a[href="/subscribe"], form, input')).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
    await context.close();
  });
}
