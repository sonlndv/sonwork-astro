import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Static content is the baseline; enhancement must never become a visibility gate.
test('About stays static; row arrival preserves geometry and cancels on preference change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    (window as any).shifts = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any) if (!entry.hadRecentInput) (window as any).shifts += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText("I'm Son");
  expect(await page.locator('h1').evaluate(el => el.getAnimations().length)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.locator('h1').boundingBox();
  await page.waitForTimeout(700);
  expect(await page.locator('h1').boundingBox()).toEqual(bounds);
  await page.locator('.row').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.row').first()).toHaveAttribute('data-motion-arrive', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  // Assert the animated FIRST load before addInitScript resets the counter.
  expect(await page.evaluate(() => (window as any).shifts)).toBe(0);
  await page.reload();
  expect(await page.locator('h1').evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(() => (window as any).shifts)).toBe(0);
});

test('theme state survives rapid toggles, reload and keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
  await page.goto('/');
  await page.locator('.theme-toggle').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); button.click(); });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const link = page.locator('.row h3 a').first();
  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
});

for (const [javaScriptEnabled, reducedMotion] of [[true, 'reduce'], [false, 'reduce'], [false, 'no-preference']] as const) {
  test(`static fallback is readable (JS ${javaScriptEnabled}, ${reducedMotion})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, reducedMotion, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    for (const path of ['/', '/work/', '/writing/', '/about/', '/subscribe/', '/missing-motion-page/']) {
      await page.goto(`${baseURL}${path}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    }
    await context.close();
  });
}

// Freeze the REAL arrival at active frames: never wait for contrast failures to end.
for (const colorScheme of ['dark', 'light'] as const) {
  test(`arrival keeps contrast and 44px layout targets at pinned frames (${colorScheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme });
    await page.addInitScript(() => {
      document.addEventListener('animationstart', event => {
        if (event.animationName === 'arrive' && event.target instanceof Element) {
          event.target.getAnimations().forEach(animation => animation.pause());
        }
      });
    });
    await page.goto('/writing/');
    await page.evaluate(() => document.fonts.ready);
    for (const row of await page.locator('.row').all()) {
      await row.scrollIntoViewIfNeeded();
      await expect.poll(() => row.evaluate(el => el.getAnimations().some(a => a.playState === 'paused'))).toBe(true);
    }
    for (const time of [0, 85.59, 160]) {
      await page.evaluate(time => {
        for (const animation of document.getAnimations()) {
          if (animation instanceof CSSAnimation && animation.animationName === 'arrive') {
            animation.currentTime = Number(animation.effect!.getTiming().delay) + time;
          }
        }
      }, time);
      expect((await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()).violations, `contrast during arrival at ${time}ms`).toEqual([]);
    }

    await page.goto('/');
    const keymarchy = page.locator('.side-project').filter({ has: page.getByRole('heading', { name: 'Keymarchy', exact: true }) });
    await keymarchy.scrollIntoViewIfNeeded();
    await expect.poll(() => keymarchy.evaluate(el => el.getAnimations().some(a => a.playState === 'paused'))).toBe(true);
    const dimensions = await keymarchy.evaluate(el => {
      for (const animation of el.getAnimations()) animation.currentTime = 85.59;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return {
        scaleX: matrix.a, scaleY: matrix.d,
        targets: [...el.querySelectorAll<HTMLAnchorElement>('.links a')].map(link => ({
          rect: link.getBoundingClientRect().height, client: link.clientHeight, layout: link.offsetHeight,
        })),
      };
    });
    await testInfo.attach('pinned-target-dimensions', { body: JSON.stringify(dimensions, null, 2), contentType: 'application/json' });
    expect(dimensions.scaleX).toBe(1);
    expect(dimensions.scaleY).toBe(1);
    for (const target of dimensions.targets) {
      expect(target.rect).toBeGreaterThanOrEqual(43.99); // tight float tolerance only
      expect(target.client).toBeGreaterThanOrEqual(44);
      expect(target.layout).toBeGreaterThanOrEqual(44);
    }
  });
}
