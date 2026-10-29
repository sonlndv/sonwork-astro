import { test, expect, type Page } from '@playwright/test';

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function expectSingletons(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText("I'm Son");
  await expect(page.locator('.mtn-scene')).toHaveCount(1);
  await expect(page.locator('.companion')).toHaveCount(1);
  await expect(page.locator('.home-overlook')).toHaveCount(1);
  await expect(page.locator('.overlook-link')).toHaveCount(1);
}

for (const width of [375, 390]) for (const theme of ['dark', 'light'] as const) {
  test(`valley overlook phone ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(t => localStorage.setItem('theme', t), theme);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expectSingletons(page);
    const wrapper = page.locator('.home-overlook');
    await expect(wrapper).toHaveAttribute('data-home-direction', 'valley-overlook-r4');
    await expect(wrapper).toHaveCSS('display', 'flex');
    await expect(wrapper).toHaveCSS('flex-direction', 'column');
    const h1 = page.locator('h1');
    const h1Box = (await h1.boundingBox())!;
    const lineHeight = parseFloat(await h1.evaluate(el => getComputedStyle(el).lineHeight));
    // R7: the unchanged-size name sits on one line at ordinary phone sizes.
    expect(h1Box.height).toBeGreaterThanOrEqual(lineHeight * 0.9);
    expect(h1Box.height).toBeLessThanOrEqual(lineHeight * 1.1);
    expect(h1Box.x + h1Box.width).toBeLessThanOrEqual(width);
    expect(parseFloat(await h1.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(52);
    const box = (await wrapper.boundingBox())!;
    // Content-driven: headline, one small scale-based gap and the 44px jump; no scenic spacer.
    const jumpBox = (await page.locator('.overlook-link').boundingBox())!;
    const gap = jumpBox.y - (h1Box.y + h1Box.height);
    expect(gap).toBeGreaterThanOrEqual(8);
    expect(gap).toBeLessThanOrEqual(24);
    expect(box.height).toBeLessThanOrEqual(h1Box.height + 24 + jumpBox.height + 2);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const link = page.locator('.overlook-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Selected projects');
    await expect(link).toHaveAttribute('href', '#home-projects');
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => innerWidth)).toBe(width);
    expect(await noOverflow(page)).toBe(true);
    const intro = (await page.locator('.home-intro').boundingBox())!;
    expect(intro.y + intro.height).toBeLessThan(844);
    const summary = (await page.locator('summary').boundingBox())!;
    expect(summary.y + summary.height).toBeLessThan(844);

    await link.click();
    await expect(page).toHaveURL(/#home-projects$/);
    const target = page.locator('#home-projects');
    await expect(target).toBeInViewport();
    const headerBottom = await page.evaluate(() => document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
    expect((await target.boundingBox())!.y).toBeGreaterThanOrEqual(headerBottom);
  });
}

for (const width of [320, 340, 430, 719]) {
  test(`valley overlook boundary ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => innerWidth)).toBe(width);
    expect(await noOverflow(page)).toBe(true);
    await expect(page.locator('.home-overlook')).toHaveCSS('display', 'flex');
    await expect(page.locator('.overlook-link')).toBeVisible();
    await page.locator('summary').click();
    expect(await noOverflow(page)).toBe(true);
  });
}

for (const width of [720, 1440]) {
  test(`valley overlook ${width} keeps default geometry`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expectSingletons(page);
    await expect(page.locator('.home-overlook')).toHaveCSS('display', 'contents');
    await expect(page.locator('.overlook-link')).toBeHidden();
    expect(await noOverflow(page)).toBe(true);
  });
}

test('valley overlook is static under reduced motion', async ({ browser, baseURL }) => {
  const heights: number[] = [];
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await page.evaluate(() => document.fonts.ready);
    await expectSingletons(page);
    heights.push(Math.round((await page.locator('.home-overlook').boundingBox())!.height));
    const size = await page.locator('h1').evaluate(el => getComputedStyle(el).fontSize);
    expect(parseFloat(size)).toBeGreaterThanOrEqual(52);
    expect(Number.isFinite(heights.at(-1))).toBe(true);
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
const firstAction = '.build-entry:first-child .build-action a';

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
    const arrow = page.locator(`${firstAction} .arrow`).first();
    await expect(arrow).toHaveCSS('transform', 'none');
    await tabTo(page, firstAction);
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
    await page.locator(firstAction).first().hover();
    await expect(arrow).toHaveCSS('transform', reducedMotion === 'no-preference' ? nudged : 'none');
    await context.close();
  }
});

test('valley overlook keeps native link and disclosure without JS',async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('h1')).toHaveText("I'm Son");
  await expect(page.locator('.home-overlook')).toHaveCSS('display', 'flex');
  const link = page.getByRole('link', { name: 'Selected projects', exact: true });
  await expect(link).toHaveAttribute('href', '#home-projects');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/#home-projects$/);
  await expect(page.locator('#home-projects')).toBeInViewport();
  await page.locator('summary').click();
  await expect(page.locator('details p')).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  await context.close();
});
