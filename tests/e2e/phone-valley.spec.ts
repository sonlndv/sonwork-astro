import { expect, test, type Page } from '@playwright/test';

// Phone feedback: a content-height opening and a dark valley that can actually be seen.
// Real browser behaviour against the built dist/.

const seed = (page: Page, theme: 'dark' | 'light') =>
  page.addInitScript((t) => {
    try { if (!localStorage.getItem('theme')) localStorage.setItem('theme', t); } catch {}
  }, theme);

const stops = (page: Page) =>
  page.evaluate(() => {
    const read = (cls: string) => {
      const el = document.querySelector(`.${cls}`)!;
      const m = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(el).stopColor);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };
    return { far: read('mtn-s-far'), mid: read('mtn-s-mid'), near: read('mtn-s-near') };
  });
const sum = (c: number[] | null) => c!.reduce((a, b) => a + b, 0);

for (const [width, height] of [[375, 812], [390, 812], [390, 844]] as const) {
  for (const theme of ['dark', 'light'] as const) {
    test(`phone ${width}x${height} ${theme}: opening is content-height and projects begin in view`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seed(page, theme);
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const h1 = (await page.locator('h1').boundingBox())!;
      const jump = (await page.locator('.overlook-link').boundingBox())!;
      const wrapper = (await page.locator('.home-overlook').boundingBox())!;
      const gap = jump.y - (h1.y + h1.height);
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(gap).toBeLessThanOrEqual(24);
      expect(wrapper.height).toBeLessThanOrEqual(h1.height + 24 + jump.height + 2);
      expect(jump.height).toBeGreaterThanOrEqual(44);
      const lineHeight = parseFloat(await page.locator('h1').evaluate((el) => getComputedStyle(el).lineHeight));
      // R7: the unchanged-size name is a single line at ordinary phone sizes.
      expect(h1.height).toBeGreaterThanOrEqual(lineHeight * 0.9);
      expect(h1.height).toBeLessThanOrEqual(lineHeight * 1.1);
      expect(h1.x + h1.width).toBeLessThanOrEqual(width);
      expect(parseFloat(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(52);
      const head = (await page.locator('#home-projects').boundingBox())!;
      expect(head.y).toBeLessThan(height);
      // The whole genuine 44px native Trivia Hub title target is inside the first viewport.
      const title = page.locator('.build-entry').first().getByRole('link', { name: 'Trivia Hub', exact: true });
      const titleBox = (await title.boundingBox())!;
      expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(height);
      expect(titleBox.height).toBeGreaterThanOrEqual(44);
      expect(titleBox.width).toBeGreaterThanOrEqual(44);
      await expect(page.locator('.home-intro')).toBeVisible();
      await expect(page.locator('summary')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Native navigation witness: the in-fold title link really goes to its page.
      await title.click();
      await expect(page).toHaveURL(/\/work\/trivia-hub\/?$/);
    });
  }
}

test('phone: a real touch tap on the in-fold Trivia Hub title navigates', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await page.evaluate(() => document.fonts.ready);
  const title = page.locator('.build-entry').first().getByRole('link', { name: 'Trivia Hub', exact: true });
  await title.tap();
  await expect(page).toHaveURL(/\/work\/trivia-hub\/?$/);
  await context.close();
});

test('static fallback without JS keeps the same compact opening', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/');
  const h1 = (await page.locator('h1').boundingBox())!;
  const jump = (await page.locator('.overlook-link').boundingBox())!;
  const gap = jump.y - (h1.y + h1.height);
  expect(gap).toBeGreaterThanOrEqual(8);
  expect(gap).toBeLessThanOrEqual(24);
  await context.close();
});

test('at 720px and wider the opening keeps its default geometry', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto('/');
  await expect(page.locator('.home-overlook')).toHaveCSS('display', 'contents');
  await expect(page.locator('.overlook-link')).toBeHidden();
});

test.describe('valley paint in both themes', () => {
  // The old dark stops, kept here only as the "before" yardstick for the lift.
  const before = { far: [28, 41, 70], mid: [22, 35, 63], near: [16, 28, 56] };
  // Approved sitewide light stops at 375x812: fixed RGB channels from #d6dde7, #bcc7d6 and #9aa9be.
  const lightStops = { far: [214, 221, 231], mid: [188, 199, 214], near: [154, 169, 190] };

  test('dark stops stay lifted, R8 light stops resolve through the real manual toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seed(page, 'dark');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const scene = page.locator('.mtn-scene');
    await expect(scene).toHaveCount(1);
    expect(await scene.evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width >= innerWidth && r.height >= innerHeight;
    })).toBe(true);

    const dark = await stops(page);
    for (const key of ['far', 'mid', 'near'] as const) {
      expect(sum(dark[key])).toBeGreaterThan(sum(before[key]) * 1.2);
    }
    expect(sum(dark.far)).toBeGreaterThan(sum(dark.mid));
    expect(sum(dark.mid)).toBeGreaterThan(sum(dark.near));

    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await stops(page)).toEqual(lightStops);
    expect(await scene.evaluate((el) => Number(getComputedStyle(el).opacity) > 0)).toBe(true);
    // Light stops sit above dark ones, so the two themes really resolve differently.
    for (const key of ['far', 'mid', 'near'] as const) expect(sum(lightStops[key])).toBeGreaterThan(sum(dark[key]));

    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await stops(page)).toEqual(dark);
  });

  // Superseded oracle: the hello used to brighten the stroke (alpha cap 0.16 light / 0.60 dark). It is now an
  // original-ridge re-trace, so the contrast contract is that colour and alpha never leave rest.
  // Controlled entrance admission ONLY for the 150ms paint samples below. No JS clock is installed;
  // natural entrance timing remains independently required by atmosphere and release-ui.
  async function finishSampleArrival(page: Page) {
    const probe = await page.locator('.mtn-scene').evaluateHandle(el => {
      const root = el as HTMLElement;
      const layers = root.querySelectorAll<HTMLElement>(':scope > .mtn-layer.mtn-near');
      const mist = root.querySelector<HTMLElement>('.mtn-mist')!;
      const state = () => ({
        arrival: root.dataset.arrival, intro: root.hasAttribute('data-intro'),
        state: mist.dataset.state, passes: mist.dataset.passes, source: mist.dataset.source,
        normalizedRims: root.querySelectorAll('.mtn-rim[pathLength]').length,
      });
      if (layers.length !== 1) throw new Error('Expected one outer near layer: ' + JSON.stringify({ count: layers.length, state: state() }));
      const near = layers[0]!;
      const effects = near.getAnimations().filter(a => a instanceof CSSAnimation && a.animationName === 'mtn-near-in');
      const effect = effects[0];
      if (effects.length !== 1 || !(effect instanceof CSSAnimation) ||
          !(effect.effect instanceof KeyframeEffect) || effect.effect.target !== near ||
          !near.isConnected || !root.hasAttribute('data-intro') || effect.playState !== 'running') {
        throw new Error('Expected the genuine running entrance: ' + JSON.stringify({
          state: state(), effects: near.getAnimations().map(a => ({
            name: a instanceof CSSAnimation ? a.animationName : null, playState: a.playState,
          })),
        }));
      }
      const timing = effect.effect.getTiming();
      const receipt = {
        control: 'Original attached CSS entrance finish(); no fake clock or natural-time claim',
        before: state(),
        effect: { name: effect.animationName, count: effects.length, duration: Number(timing.duration),
          delay: timing.delay, iterations: timing.iterations, pending: effect.pending },
        nativeEnd: null as null | { name: string; trusted: boolean; targetIsNear: boolean;
          elapsedTime: number; afterOwner: ReturnType<typeof state> },
      };
      const onEnd = (event: AnimationEvent) => {
        if (event.target !== near || event.animationName !== 'mtn-near-in') return;
        // The actual mountains.js listener registered earlier on this same root has run first.
        receipt.nativeEnd = { name: event.animationName, trusted: event.isTrusted, targetIsNear: event.target === near,
          elapsedTime: event.elapsedTime, afterOwner: state() };
        root.removeEventListener('animationend', onEnd);
      };
      root.addEventListener('animationend', onEnd);
      effect.finish();
      return { receipt, cleanup: () => root.removeEventListener('animationend', onEnd) };
    });
    try {
      await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-intro', /.*/, { timeout: 3_000 });
      const receipt = await probe.evaluate(p => p.receipt);
      expect(receipt.before).toMatchObject({ arrival: 'first', intro: true, state: 'idle', passes: '0' });
      expect(receipt.before.normalizedRims).toBeGreaterThan(0);
      expect(receipt.effect).toMatchObject({ name: 'mtn-near-in', count: 1, duration: 1600, delay: 150, iterations: 1 });
      expect(receipt.nativeEnd).not.toBeNull();
      expect(receipt.nativeEnd).toMatchObject({
        name: 'mtn-near-in', trusted: true, targetIsNear: true,
        afterOwner: { intro: false, state: 'running', passes: '1', source: 'ambient', normalizedRims: 0 },
      });
      expect(receipt.nativeEnd!.elapsedTime).toBeCloseTo(1.6, 6);
    } finally {
      try {
        await test.info().attach('phone-controlled-entrance-native-completion', {
          body: JSON.stringify(await probe.evaluate(p => p.receipt), null, 2), contentType: 'application/json',
        });
      } finally {
        await probe.evaluate(p => p.cleanup());
        await probe.dispose();
      }
    }
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: controlled sample of the real hello re-trace is partway drawn with the rest stroke unchanged`, async ({ page }) => {
      // Controlled admission of the original entrance, then its actual mist, before sampling hello.
      await page.setViewportSize({ width: 375, height: 812 });
      await seed(page, theme);
      await page.goto('/');
      await finishSampleArrival(page);
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'running');
      await page.locator('.mtn-mist-ribbon').evaluate(el => {
        const effect = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'mtn-mist-pass');
        if (!effect) throw new Error('Missing earned arrival effect');
        effect.finish();
      });
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'idle');
      const rim = page.locator('.mtn-far .mtn-rim:visible').first();
      const rest = await rim.evaluate((el) => getComputedStyle(el).stroke);
      await page.locator('.companion').evaluate((el) => (el as HTMLElement).click());
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-source', 'greeting');
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-run', '');
      // Controlled sampling, not natural-time evidence: seek the actual CSSAnimation to 150ms, read the
      // computed dash offset and stroke, then let it play on so it still finishes.
      const sample = await rim.evaluate((el) => {
        const anim = el.getAnimations().find((a) => (a as CSSAnimation).animationName === 'mtn-rim-hello');
        if (!anim) return null;
        anim.pause();
        anim.currentTime = 150;
        const s = getComputedStyle(el);
        const value = { offset: parseFloat(s.strokeDashoffset), stroke: s.stroke, pathLength: el.getAttribute('pathLength') };
        anim.play();
        return value;
      });
      expect(sample).not.toBeNull();
      expect(Number.isFinite(sample!.offset)).toBe(true);
      expect(sample!.offset).toBeGreaterThan(0);
      expect(sample!.offset).toBeLessThan(1);
      expect(sample!.pathLength).toBe('1');
      expect(sample!.stroke).toBe(rest);
      await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-trace', /.*/, { timeout: 3_000 });
      expect(await page.locator('.mtn-rim[pathLength]').count()).toBe(0);
      expect(await rim.evaluate((el) => getComputedStyle(el).stroke)).toBe(rest);
    });
  }

  test('forced colours still hides the decorative scene', async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: 'active', viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.mtn-scene')).toHaveCSS('display', 'none');
    await context.close();
  });
});
