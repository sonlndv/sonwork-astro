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

    // Home: pin the one real build-phrase settle (mtn-settle) at its first frame, then compare with its end state.
    await page.addInitScript(() => {
      const settles = new Map<Element, CSSAnimation>();
      (window as any).__buildSettles = settles;
      // Capture every genuine sibling effect at the producer's marker mutation. A sibling's
      // natural end otherwise removes the shared marker before a later driver measurement.
      new MutationObserver(records => {
        for (const record of records) {
          const section = record.target;
          if (!(section instanceof Element) || !section.matches('.front-projects[data-mtn="go"]')) continue;
          for (const entry of section.querySelectorAll('.build-entry')) {
            const animation = entry.getAnimations().find((a): a is CSSAnimation =>
              a instanceof CSSAnimation && a.animationName === 'mtn-settle');
            if (!animation || animation.playState === 'finished' || animation.playState === 'idle') continue;
            animation.pause();
            settles.set(entry, animation);
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-mtn'] });
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const head = document.querySelector('.front-projects .section-head')!;
      scrollTo(0, scrollY + head.getBoundingClientRect().top - 120);
    });
    const keymarchy = page.locator('.build-entry').filter({ has: page.getByRole('heading', { name: 'Keymarchy', exact: true }) });
    await expect(keymarchy).toHaveCount(1);
    const paused = () => keymarchy.evaluate(el => {
      const section = el.closest('.front-projects[data-mtn="go"]');
      const entries = section ? [...section.querySelectorAll('.build-entry')] : [];
      const settles = (window as any).__buildSettles as Map<Element, CSSAnimation>;
      return entries.length > 0 && entries.includes(el) && settles.size === entries.length && entries.every(entry => {
        const animation = settles.get(entry);
        return !!animation && animation.animationName === 'mtn-settle' && animation.playState === 'paused' &&
          (animation.effect as KeyframeEffect).target === entry && entry.getAnimations().includes(animation);
      });
    });
    await expect.poll(paused, { timeout: 8000 }).toBe(true);
    // Both frames come from the same captured effect in one task; genuine cancellation still fails.
    const { start, end } = await keymarchy.evaluate(el => {
      const section = el.closest('.front-projects[data-mtn="go"]');
      const entries = section ? [...section.querySelectorAll('.build-entry')] : [];
      const settles = (window as any).__buildSettles as Map<Element, CSSAnimation>;
      if (!entries.length || !entries.includes(el) || settles.size !== entries.length || entries.some(entry => {
        const effect = settles.get(entry);
        return !effect || effect.animationName !== 'mtn-settle' || effect.playState !== 'paused' ||
          (effect.effect as KeyframeEffect).target !== entry || !entry.getAnimations().includes(effect);
      })) throw new Error('Every genuine build settle must remain captured and paused');
      const animation = settles.get(el)!;
      const timing = animation.effect!.getTiming();
      const measure = (at: 'start' | 'end') => {
        animation.currentTime = at === 'start' ? Number(timing.delay) : Number(timing.delay) + Number(timing.duration) - 1;
        const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return {
          scaleX: matrix.a, scaleY: matrix.d, shiftY: matrix.f,
          targets: [...el.querySelectorAll<HTMLAnchorElement>('.links a')].map(link => ({
            rect: link.getBoundingClientRect().height, client: link.clientHeight, layout: link.offsetHeight,
          })),
        };
      };
      const start = measure('start');
      const end = measure('end');
      if (animation.playState !== 'paused' || !el.getAnimations().includes(animation)) {
        throw new Error('The measured build settle must remain active on its genuine target');
      }
      return { start, end };
    });
    await testInfo.attach('pinned-target-dimensions', { body: JSON.stringify({ start, end }, null, 2), contentType: 'application/json' });
    expect(start.shiftY).toBeGreaterThan(7); // the settle really starts 8px low
    expect(end.shiftY).toBeLessThan(0.5); // and really arrives
    for (const state of [start, end]) {
      expect(state.scaleX).toBe(1);
      expect(state.scaleY).toBe(1);
      expect(state.targets.length).toBeGreaterThan(0);
      for (const target of state.targets) {
        expect(target.rect).toBeGreaterThanOrEqual(43.99); // tight float tolerance only
        expect(target.client).toBeGreaterThanOrEqual(44);
        expect(target.layout).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
