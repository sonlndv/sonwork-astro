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
  // Home has no rows; the one-shot row arrival lives on the index pages.
  await page.goto('/writing/');
  await page.evaluate(() => document.fonts.ready);
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
  const link = page.locator('.build-entry h3 a').first();
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
      const arrivals = new Map<Element, CSSAnimation>();
      (window as any).__rowArrivals = arrivals;
      // The real IntersectionObserver adds this marker once. Capture its actual effect in the
      // mutation microtask, before a delayed animationstart dispatch can outlive the finite effect.
      new MutationObserver(records => {
        for (const record of records) {
          const row = record.target;
          if (!(row instanceof Element) || !row.matches('.row[data-motion-arrive]')) continue;
          const animation = row.getAnimations().find((a): a is CSSAnimation =>
            a instanceof CSSAnimation && a.animationName === 'arrive');
          if (!animation || animation.playState === 'finished' || animation.playState === 'idle') continue;
          animation.pause();
          arrivals.set(row, animation);
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-motion-arrive'] });
    });
    await page.goto('/writing/');
    await page.evaluate(() => document.fonts.ready);
    const rowCount = await page.locator('.row').count();
    expect(rowCount).toBeGreaterThan(0);
    for (const row of await page.locator('.row').all()) {
      await row.scrollIntoViewIfNeeded();
      await expect.poll(() => row.evaluate(el => {
        const animation = (window as any).__rowArrivals.get(el) as CSSAnimation | undefined;
        return !!animation && animation.animationName === 'arrive' && animation.playState === 'paused' &&
          (animation.effect as KeyframeEffect).target === el && el.getAnimations().includes(animation);
      })).toBe(true);
    }
    for (const time of [0, 85.59, 160]) {
      const samples = await page.evaluate(time => {
        const rows = [...document.querySelectorAll('.row')];
        const arrivals = (window as any).__rowArrivals as Map<Element, CSSAnimation>;
        if (!rows.length || arrivals.size !== rows.length) throw new Error('Every row must have an observed arrival');
        return rows.map(row => {
          const animation = arrivals.get(row);
          if (!animation || animation.playState !== 'paused' || !row.getAnimations().includes(animation)) {
            throw new Error('The observed arrival must still be paused on its row');
          }
          animation.currentTime = Number(animation.effect!.getTiming().delay) + time;
          const style = getComputedStyle(row);
          return { shiftY: new DOMMatrixReadOnly(style.transform).m42, opacity: style.opacity };
        });
      }, time);
      expect(samples).toHaveLength(rowCount);
      for (const sample of samples) {
        expect(sample.opacity).toBe('1');
        if (time === 0) expect(sample.shiftY).toBeGreaterThan(3);
        if (time === 160) expect(sample.shiftY).toBeLessThan(0.5);
      }
      expect((await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()).violations, `contrast during arrival at ${time}ms`).toEqual([]);
    }

    // Home: the build phrase (mtn-settle) is intentionally gone (static, content-first Home). The accepted contract is
    // that no entrance ever starts when the projects scroll into view, and that every project action keeps its native
    // 44px target at rest with unchanged contrast.
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const head = document.querySelector('.front-projects .section-head')!;
      scrollTo(0, scrollY + head.getBoundingClientRect().top - 120);
    });
    await page.waitForTimeout(800);
    await expect(page.locator('.front-projects')).not.toHaveAttribute('data-mtn', /.*/);
    const entries = await page.locator('.build-entry').count();
    expect(entries).toBeGreaterThan(0);
    expect(await page.locator('.build-entry').evaluateAll(list =>
      list.flatMap(entry => entry.getAnimations().map(a => (a as CSSAnimation).animationName)))).toEqual([]);
    const targets = await page.locator('.build-entry .links a').evaluateAll(links => links.map(link => ({
      rect: link.getBoundingClientRect().height, client: (link as HTMLElement).clientHeight, layout: (link as HTMLElement).offsetHeight,
    })));
    await testInfo.attach('static-target-dimensions', { body: JSON.stringify(targets, null, 2), contentType: 'application/json' });
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target.rect).toBeGreaterThanOrEqual(43.99); // tight float tolerance only
      expect(target.client).toBeGreaterThanOrEqual(44);
      expect(target.layout).toBeGreaterThanOrEqual(44);
    }
    expect((await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()).violations, 'contrast on the static Home projects').toEqual([]);
  });
}
