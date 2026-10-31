import { expect, test, type Page } from '@playwright/test';

// R5 craft: day/night aperture, finite hello response on the ridge edges, native navigation, 200% text.
// Real browser behaviour against the built dist/.
test.setTimeout(45_000);

const themeButton = (page: Page) => page.locator('.theme-toggle');
const state = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    stored: (() => { try { return localStorage.getItem('theme'); } catch { return 'denied'; } })(),
    marker: document.documentElement.dataset.themeVt ?? null,
    label: document.querySelector('.theme-toggle')!.getAttribute('aria-label'),
  }));
const startFrom = (page: Page, theme: 'dark' | 'light') =>
  page.addInitScript((t) => {
    try { if (!localStorage.getItem('theme')) localStorage.setItem('theme', t); } catch {}
  }, theme);
const supportsTransitions = (page: Page) => page.evaluate(() => typeof document.startViewTransition === 'function');
const nativeClick = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => (el as HTMLElement).click());

test.describe('day and night aperture', () => {
  test('click opens a finite circle from the button, then settles with no marker', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await expect(themeButton(page)).toHaveAttribute('aria-label', 'Switch to light theme');
    const box = (await themeButton(page).boundingBox())!;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const viewport = page.viewportSize()!;
    await themeButton(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-vt', 'aperture');
    // The reveal is a real animation on the new root snapshot, clipped to a circle at the button centre.
    // Read the actual KeyframeEffect's keyframes; nothing is mocked.
    const handle = await page.waitForFunction(() => {
      const found = document.getAnimations().find(
        (a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)',
      );
      if (!found) return null;
      return (found.effect as KeyframeEffect).getKeyframes().map((k) => String((k as any).clipPath));
    }, undefined, { timeout: 3_000 });
    const clips = (await handle.jsonValue()) as string[];
    const circles = clips.map((c) => {
      const m = /circle\(\s*([\d.]+)px at ([\d.]+)px ([\d.]+)px\s*\)/.exec(c);
      expect(m, `unexpected clip-path keyframe: ${c}`).not.toBeNull();
      return { r: Number(m![1]), x: Number(m![2]), y: Number(m![3]) };
    });
    expect(circles.length).toBe(2);
    expect(circles[0].r).toBe(0);
    for (const c of circles) {
      expect(Math.abs(c.x - centre.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.y - centre.y)).toBeLessThanOrEqual(1);
    }
    // The final circle reaches the farthest viewport corner from the button centre.
    const farthest = Math.hypot(Math.max(centre.x, viewport.width - centre.x), Math.max(centre.y, viewport.height - centre.y));
    expect(circles[1].r).toBeGreaterThanOrEqual(farthest - 1);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({
      theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme',
    });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  });

  test('keyboard activation reaches the same final state', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    await themeButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'dark', stored: 'dark', marker: null, label: 'Switch to light theme' });
  });

  test('rapid alternating clicks settle to the last intended theme', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startFrom(page, 'dark');
    await page.goto('/');
    for (let i = 0; i < 5; i++) await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
    for (let i = 0; i < 4; i++) await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
    expect(errors).toEqual([]);
  });

  test('missing API: theme still changes at once, with no marker', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'startViewTransition', { configurable: true, value: undefined });
    });
    await startFrom(page, 'dark');
    await page.goto('/');
    await nativeClick(page, '.theme-toggle');
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('throwing and rejected transitions still apply the theme and clear the marker', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startFrom(page, 'dark');
    await page.goto('/');
    await page.evaluate(() => {
      // First click: the API throws. Second: it runs the callback but every promise rejects.
      let calls = 0;
      (document as any).startViewTransition = (update: () => void) => {
        calls += 1;
        if (calls === 1) throw new Error('unavailable');
        update();
        return {
          ready: Promise.reject(new Error('ready rejected')),
          finished: Promise.reject(new Error('finished rejected')),
          updateCallbackDone: Promise.resolve(),
          skipTransition() {},
        };
      };
    });
    await nativeClick(page, '.theme-toggle');
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
    await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'dark', stored: 'dark', marker: null, label: 'Switch to light theme' });
    expect(errors).toEqual([]);
  });

  test('a callback that never ran is repaired when the transition ends', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    await page.evaluate(() => {
      (document as any).startViewTransition = () => ({
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      });
    });
    await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('reduced motion and forced colours bypass the aperture entirely', async ({ browser }) => {
    for (const media of [{ reducedMotion: 'reduce' as const }, { forcedColors: 'active' as const }]) {
      const context = await browser.newContext(media);
      const page = await context.newPage();
      await startFrom(page, 'dark');
      await page.goto('/');
      await page.evaluate(() => {
        (window as any).__vt = 0;
        const original = document.startViewTransition?.bind(document);
        if (original) document.startViewTransition = ((...a: any[]) => { (window as any).__vt += 1; return (original as any)(...a); }) as any;
      });
      await nativeClick(page, '.theme-toggle');
      expect(await page.evaluate(() => (window as any).__vt)).toBe(0);
      expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
      await context.close();
    }
  });

  test('reduced motion turning on during an active reveal settles it at once', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await themeButton(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-vt', 'aperture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('forced colours turning on during an active reveal settles it at once', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await themeButton(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-vt', 'aperture');
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('denied storage still changes the theme without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    });
    await page.goto('/');
    const before = await page.evaluate(() => document.querySelector('.theme-toggle')!.getAttribute('aria-label'));
    await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    const after = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      label: document.querySelector('.theme-toggle')!.getAttribute('aria-label'),
    }));
    expect(after.label).not.toBe(before);
    expect(['light', 'dark']).toContain(after.theme);
    expect(errors).toEqual([]);
  });

  test('without JS the page is complete and the button stays hidden', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(themeButton(page)).toBeHidden();
    await context.close();
  });
});

test.describe('aperture soft edge', () => {
  const owned = (page: Page) =>
    page.evaluate(() => ({
      edge: document.documentElement.dataset.themeVtEdge ?? null,
      x: document.documentElement.style.getPropertyValue('--aperture-x'),
      y: document.documentElement.style.getPropertyValue('--aperture-y'),
    }));
  const clean = { edge: null, x: '', y: '' };
  // One browser-side observation: the live reveal effect's keyframes and the root's owned state are read in
  // the same synchronous turn, so the 480ms animation cannot end between them.
  type Observed = {
    frames: { clip: string; r: string | null }[];
    owned: { edge: string | null; x: string; y: string };
  };
  const observeReveal = (page: Page) =>
    page.waitForFunction(() => {
      const found = document.getAnimations().find(
        (a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)',
      );
      if (!found) return null;
      const root = document.documentElement;
      return {
        frames: (found.effect as KeyframeEffect).getKeyframes().map((k) => ({
          clip: String((k as any).clipPath),
          r: (k as any)['--aperture-r'] === undefined ? null : String((k as any)['--aperture-r']),
        })),
        owned: {
          edge: root.dataset.themeVtEdge ?? null,
          x: root.style.getPropertyValue('--aperture-x'),
          y: root.style.getPropertyValue('--aperture-y'),
        },
      };
    }, undefined, { timeout: 3_000 }).then((h) => h.jsonValue() as Promise<Observed>);
  const settled = async (page: Page) => {
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    expect(await owned(page)).toEqual(clean);
  };

  test('where supported the same effect animates a typed radius beside the clip, and cleans up', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    const feather = await page.evaluate(() =>
      typeof CSS.registerProperty === 'function' &&
      CSS.supports('mask-image', 'radial-gradient(circle at 0px 0px, #000 0px, transparent 1px)'));
    test.skip(!feather, 'Typed properties or masks unavailable in this browser');
    const box = (await themeButton(page).boundingBox())!;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await themeButton(page).click();
    const { frames, owned: pos } = await observeReveal(page);
    expect(frames.length).toBe(2);
    const clipR = frames.map((f) => Number(/circle\(\s*([\d.]+)px/.exec(f.clip)![1]));
    expect(frames[0].r).toBe('0px');
    const endR = Number(/^([\d.]+)px$/.exec(frames[1].r!)![1]);
    // The mask end clears the clip circle, so the finished snapshot is fully opaque.
    expect(endR).toBeGreaterThan(clipR[1]);
    expect(endR - clipR[1]).toBeLessThanOrEqual(24);
    expect(pos).toEqual({
      edge: 'feather', x: expect.stringMatching(/px$/), y: expect.stringMatching(/px$/),
    });
    expect(Math.abs(parseFloat(pos.x) - centre.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(parseFloat(pos.y) - centre.y)).toBeLessThanOrEqual(1);
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('without registerProperty the sharp circle runs alone', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(CSS, 'registerProperty', { configurable: true, value: undefined });
    });
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await themeButton(page).click();
    const { frames, owned: seen } = await observeReveal(page);
    expect(frames.map((f) => f.r)).toEqual([null, null]);
    expect(frames.length).toBe(2);
    expect(seen).toEqual(clean);
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  test('without mask support the sharp circle runs alone', async ({ page }) => {
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      (CSS as any).supports = (...a: string[]) => (/^mask/.test(a[0]) ? false : (supports as any)(...a));
    });
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await themeButton(page).click();
    const { frames, owned: seen } = await observeReveal(page);
    expect(frames.map((f) => f.r)).toEqual([null, null]);
    expect(seen).toEqual(clean);
    await settled(page);
  });

  test('a rejected enhanced animation falls back to the sharp circle with no leftovers', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      const counts = ((window as any).__edgeCounts = { enhancedAttempts: 0, sharpFallbacks: 0 });
      Element.prototype.animate = function (this: Element, frames: any, ...rest: any[]) {
        if (frames && !Array.isArray(frames) && '--aperture-r' in frames) {
          counts.enhancedAttempts += 1;
          throw new Error('mask animation rejected');
        }
        if (frames && !Array.isArray(frames) && 'clipPath' in frames) counts.sharpFallbacks += 1;
        return (original as any).call(this, frames, ...rest);
      } as any;
    });
    await themeButton(page).click();
    // Flag and position are sampled while the fallback effect is still live, so a missing catch cleanup shows.
    const { frames, owned: seen } = await observeReveal(page);
    expect(frames.map((f) => f.r)).toEqual([null, null]);
    expect(frames.length).toBe(2);
    expect(seen).toEqual(clean);
    expect(await page.evaluate(() => (window as any).__edgeCounts)).toEqual({ enhancedAttempts: 1, sharpFallbacks: 1 });
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
    expect(errors).toEqual([]);
  });

  test('rapid alternating clicks leave no owned flag or position behind', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startFrom(page, 'dark');
    await page.goto('/');
    for (let i = 0; i < 5; i++) await nativeClick(page, '.theme-toggle');
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
    expect(errors).toEqual([]);
  });

  test('skipped callbacks and rejected promises leave no owned flag or position behind', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    // Stubbed API: this covers missing-update-callback repair and rejected promises only. Real native
    // cancellation is covered by the rapid-click and mid-reveal reduced/forced cases.
    await page.evaluate(() => {
      let calls = 0;
      (document as any).startViewTransition = (update: () => void) => {
        calls += 1;
        if (calls === 1) throw new Error('unavailable');
        if (calls === 2) update();
        return {
          ready: calls === 2 ? Promise.reject(new Error('ready rejected')) : Promise.resolve(),
          finished: calls === 2 ? Promise.reject(new Error('finished rejected')) : Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
          skipTransition() {},
        };
      };
    });
    for (let i = 0; i < 3; i++) {
      await nativeClick(page, '.theme-toggle');
      await settled(page);
    }
    expect(await state(page)).toMatchObject({ marker: null });
  });

  test('reduced motion or forced colours arriving mid-reveal clear the soft edge', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    test.skip(!(await supportsTransitions(page)), 'View Transitions unavailable in this browser');
    for (const media of [{ reducedMotion: 'reduce' as const }, { forcedColors: 'active' as const }]) {
      await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
      await themeButton(page).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme-vt', 'aperture');
      await page.emulateMedia(media);
      await settled(page);
    }
  });

  test('at rest nothing of the soft edge exists', async ({ page }) => {
    await page.goto('/');
    expect(await owned(page)).toEqual(clean);
    expect(await page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toMatch(/aperture/);
  });
});

test.describe('hello answers on the ridge edges', () => {
  const rim = (page: Page) => page.locator('.mtn-far .mtn-rim:visible').first();
  const stroke = (page: Page) => rim(page).evaluate((el) => getComputedStyle(el).stroke);

  test('greeting re-traces original rims finitely, restores solid paint and queues no ambient recurrence', async ({ page }) => {
    // Natural CSS arrival/completion; JS time below is only a no-recurrence observation.
    await page.clock.install();
    await page.goto('/');

    // Let the arrival sketch (data-intro, real-time CSS) finish so the rim is at its true rest.
    await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-intro', /.*/, { timeout: 3_000 });
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'running');
    const finishMist = async () => {
      await page.locator('.mtn-mist-ribbon').evaluate(el => {
        const effect = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'mtn-mist-pass');
        if (!effect) throw new Error('Missing actual owned mist effect');
        effect.finish();
      });
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'idle');
    };
    await finishMist(); // controlled preparation after observing the earned arrival
    const rest = await stroke(page);
    expect(await rim(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.locator('.companion').evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-source', 'greeting');
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-run', '');
    expect(await rim(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('mtn-rim-hello');
    // Superseded oracle (was: stroke brightens): the original ridge is re-traced, so the dash offset is
    // partway at some point in its short life while the stroke colour never leaves rest ...
    await page.waitForFunction(() => {
      const el = Array.from(document.querySelectorAll('.mtn-far .mtn-rim')).find((n) => n.getClientRects().length > 0)!;
      if (!el) throw new Error('no rendered far rim');
      const o = parseFloat(getComputedStyle(el).strokeDashoffset);
      return o > 0 && o < 1;
    }, undefined, { timeout: 2_000, polling: 50 });
    expect(await stroke(page)).toBe(rest);
    // ... and is back to the exact solid rest rim (no dash, no temporary pathLength) while the 7s mist
    // pass is still running. Require the scene flag, animation and dash gone together (finite, not dropped).
    await page.waitForFunction((r) => {
      const el = Array.from(document.querySelectorAll('.mtn-far .mtn-rim')).find((n) => n.getClientRects().length > 0) as unknown as SVGElement;
      if (!el) throw new Error('no rendered far rim');
      const s = getComputedStyle(el);
      return s.stroke === r && s.animationName === 'none' && s.strokeDasharray === 'none'
        && !document.querySelector('.mtn-scene')!.hasAttribute('data-trace');
    }, rest, { timeout: 3_000, polling: 50 });
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-run', '');
    // The temporary geometry attribute is gone after the answer.
    expect(await page.locator('.mtn-rim[pathLength]').count()).toBe(0);
    // Controlled mist completion; advancing JS time cannot finish the real CSS animation.
    await finishMist();
    await page.clock.runFor(8_000);
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(24_500);
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'idle');
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', '2');
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-source', 'greeting');
    expect(await rim(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('reduced motion: hello leaves the ridge edges alone', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('.companion').evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(400);
    expect(await page.locator('.mtn-far .mtn-rim:visible').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await context.close();
  });
});

test.describe('native navigation stays native', () => {
  test('internal links are never intercepted; back, forward, fragments and reload keep working', async ({ page }) => {
    const probes: boolean[] = [];
    await page.exposeFunction('__prevented', (v: boolean) => probes.push(v));
    await page.addInitScript(() => {
      addEventListener('click', (e) => { (window as any).__prevented(e.defaultPrevented); });
    });
    await page.goto('/');
    await page.locator('.site-nav a[href="/about"]').click();
    await page.waitForURL('**/about');
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.themeVt ?? null)).toBeNull();
    expect(probes).toEqual([false]);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toHaveText("I'm Son");
    await page.goForward();
    await expect(page).toHaveURL(/\/about$/);
    await page.goBack();
    await page.locator('.overlook-link, a[href="#home-projects"]').first().evaluate((el) => (el as HTMLElement).click());
    await expect(page).toHaveURL(/#home-projects$/);
    await page.reload();
    await expect(page).toHaveURL(/#home-projects$/);
    await expect(page.locator('h1')).toHaveText("I'm Son");
  });

  test('a real navigation carries the sonwork-page transition type', async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[][] = ((window as any).__types = []);
      addEventListener('pagereveal', (e: any) => { seen.push(e.viewTransition ? [...e.viewTransition.types] : []); });
      addEventListener('pageswap', (e: any) => { seen.push(e.viewTransition ? [...e.viewTransition.types] : []); });
      try {
        const prior = JSON.parse(sessionStorage.getItem('__types') ?? '[]');
        addEventListener('pageswap', (e: any) => {
          sessionStorage.setItem('__types', JSON.stringify([...prior, e.viewTransition ? [...e.viewTransition.types] : []]));
        });
      } catch {}
    });
    await page.goto('/');
    test.skip(
      !(await page.evaluate(() => CSS.supports('selector(:active-view-transition-type(sonwork-page))'))),
      'Transition types unavailable in this browser',
    );
    await page.locator('.site-nav a[href="/about"]').click();
    await page.waitForURL('**/about');
    // URL commit is not the reveal event; wait for the real pagereveal/pageswap to be observed.
    await page.waitForFunction(
      () => ((window as any).__types as string[][]).some((t) => t.includes('sonwork-page')),
      undefined,
      { timeout: 3_000 },
    );
    const revealed = await page.evaluate(() => (window as any).__types as string[][]);
    const swapped = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__types') ?? '[]') as string[][]);
    expect(revealed.some((t) => t.includes('sonwork-page'))).toBe(true);
    expect(swapped.some((t) => t.includes('sonwork-page'))).toBe(true);
  });

  test('a stored theme survives navigation and the aperture marker never leaks into it', async ({ page }) => {
    await startFrom(page, 'dark');
    await page.goto('/');
    await nativeClick(page, '.theme-toggle');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
    await page.locator('.site-nav a[href="/work"]').click();
    await page.waitForURL('**/work');
    expect(await state(page)).toEqual({ theme: 'light', stored: 'light', marker: null, label: 'Switch to dark theme' });
  });

  for (const [label, size] of [['phone', { width: 390, height: 780 }], ['desktop', { width: 1280, height: 800 }]] as const) {
    test(`${label}: theme change then repeated About, Build, Home navigation raises no errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      await page.setViewportSize(size);
      // Observe each document's native reveal. Rejections are recorded as failures, never swallowed.
      await page.addInitScript(() => {
        const rec: { state: string; types: string[]; failure: string | null } = ((window as any).__reveal = { state: 'waiting', types: [], failure: null });
        addEventListener('pagereveal', (e: any) => {
          const vt = e.viewTransition;
          if (!vt) { rec.state = 'none'; return; }
          rec.types = [...vt.types];
          rec.state = 'running';
          vt.finished.then(
            () => { rec.state = 'finished'; },
            (err: Error) => { rec.state = 'finished'; rec.failure = String(err); },
          );
        });
      });
      await startFrom(page, 'light');
      await page.goto('/');
      test.skip(!(await page.evaluate(() => 'onpagereveal' in window)), 'Native pagereveal unavailable in this browser');
      const typed = await page.evaluate(() => CSS.supports('selector(:active-view-transition-type(sonwork-page))'));

      // Native light -> dark settles with the marker gone.
      await nativeClick(page, '.theme-toggle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3_000 });
      expect(await state(page)).toEqual({ theme: 'dark', stored: 'dark', marker: null, label: 'Switch to light theme' });

      const journey: [string, RegExp][] = [
        ['.site-nav a[href="/about"]', /\/about$/],
        ['.site-nav a[href="/work"]', /\/work$/],
        ['.wordmark', /\/$/],
      ];
      for (let round = 0; round < 3; round++) {
        for (const [selector, url] of journey) {
          await nativeClick(page, selector);
          await page.waitForURL(url);
          // URL commit is not completion: wait for this document's own reveal to finish (or be absent).
          await page.waitForFunction(() => {
            const s = (window as any).__reveal?.state;
            return s === 'none' || s === 'finished';
          }, undefined, { timeout: 3_000 });
          const reveal = await page.evaluate(() => (window as any).__reveal as { state: string; types: string[]; failure: string | null });
          expect(reveal.failure).toBeNull();
          if (typed) expect(reveal.types).toContain('sonwork-page');
        }
      }
      expect(await state(page)).toMatchObject({ theme: 'dark', stored: 'dark', marker: null });
      expect(errors).toEqual([]);

      // The opt-in precedes every stylesheet, and is the only @view-transition rule in the CSSOM.
      const head = await page.evaluate(() => {
        const nodes = [...document.head.children];
        const optIn = nodes.findIndex((n) => n.tagName === 'STYLE' && /@view-transition/.test(n.textContent ?? ''));
        // Every stylesheet carrier: external links, and actual inline styles whose CSSOM sheet is enabled and nonempty
        // (the opt-in style itself is excluded; it is the subject of the ordering check).
        const active = (n: Element) => {
          const sheet = (n as HTMLStyleElement).sheet;
          try { return !!sheet && !sheet.disabled && sheet.cssRules.length > 0; } catch { return false; }
        };
        const sheets = nodes.flatMap((n, i) => (
          n.matches('link[rel~="stylesheet"]') || (n.tagName === 'STYLE' && i !== optIn && active(n)) ? [i] : []));
        let rules = 0;
        const walk = (list: CSSRuleList) => {
          for (const rule of Array.from(list)) {
            if (/^@view-transition/.test(rule.cssText)) rules += 1;
            if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
          }
        };
        for (const sheet of Array.from(document.styleSheets)) {
          try { walk(sheet.cssRules); } catch {}
        }
        return { optIn, sheets, rules };
      });
      expect(head.optIn).toBeGreaterThanOrEqual(0);
      expect(head.sheets.length).toBeGreaterThan(0);
      for (const index of head.sheets) expect(head.optIn).toBeLessThan(index);
      expect(head.rules).toBe(typed ? 1 : 0);
    });
  }

  test('page transitions are opt-in by type and cover only navigation', async ({ page }) => {
    await page.goto('/');
    const rules = await page.evaluate(() => {
      const found = { navigation: false, themeAnimatesWithMarkerOnly: true };
      const walk = (list: CSSRuleList) => {
        for (const rule of Array.from(list)) {
          const text = rule.cssText;
          if (/@view-transition/.test(text) && /navigation:\s*auto/.test(text) && /types:\s*sonwork-page/.test(text)) found.navigation = true;
          if (/^::view-transition-(old|new|group)\(root\)/.test((rule as CSSStyleRule).selectorText ?? '')) found.themeAnimatesWithMarkerOnly = false;
          if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try { walk(sheet.cssRules); } catch {}
      }
      return found;
    });
    // Unprefixed root rules would hit every theme change; the aperture rules all carry the marker.
    expect(rules.themeAnimatesWithMarkerOnly).toBe(true);
    // Browsers without transition types drop the whole at-rule, so only assert it where it parsed.
    if (await page.evaluate(() => CSS.supports('selector(:active-view-transition-type(sonwork-page))'))) {
      expect(rules.navigation).toBe(true);
    }
  });
});

test.describe('200% root text', () => {
  const enlarge = (page: Page) => page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const overflow = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  for (const width of [320, 390, 719]) {
    test(`home has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await enlarge(page);
      await page.waitForTimeout(150);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('.front-contact .facts > div')].map((row) => {
          const dt = row.querySelector('dt')!.getBoundingClientRect();
          const dd = row.querySelector('dd')!.getBoundingClientRect();
          return { stacked: dd.top >= dt.bottom - 1, right: Math.max(dt.right, dd.right) };
        }),
      );
      expect(rows.length).toBe(4);
      for (const row of rows) {
        // Stacks while the list is narrower than 17rem (544px at 200%); wider keeps the two columns.
        if (width <= 390) expect(row.stacked).toBe(true);
        expect(row.right).toBeLessThanOrEqual(width);
      }
      // The user's text is not shrunk or clipped to achieve this.
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowX)).not.toBe('hidden');
    });
  }

  for (const path of ['/about', '/work']) {
    test(`${path} shares the footer and has no horizontal overflow at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await enlarge(page);
      await page.waitForTimeout(150);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowX)).not.toBe('hidden');
    });
  }

  test('normal size keeps the two-column contact grid at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const sideBySide = await page.evaluate(() =>
      [...document.querySelectorAll('.front-contact .facts > div')].every((row) => {
        const dt = row.querySelector('dt')!.getBoundingClientRect();
        const dd = row.querySelector('dd')!.getBoundingClientRect();
        return dd.left >= dt.right && dd.top < dt.bottom;
      }),
    );
    expect(sideBySide).toBe(true);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`normal size keeps five equal footer cells on one row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const cells = await page.evaluate(() =>
        [...document.querySelectorAll('.contact-links li')].map((li) => {
          const box = li.getBoundingClientRect();
          const a = li.querySelector('a')!.getBoundingClientRect();
          return { top: box.top, width: box.width, label: li.textContent!.trim(), anchorHeight: a.height };
        }),
      );
      expect(cells.length).toBe(5);
      expect(cells.map((cell) => cell.label)).toEqual(['Email', 'X', 'GitHub', 'LinkedIn', 'RSS']);
      for (const cell of cells) {
        expect(Math.abs(cell.top - cells[0].top)).toBeLessThanOrEqual(1);
        expect(Math.abs(cell.width - cells[0].width)).toBeLessThanOrEqual(1);
        expect(cell.anchorHeight).toBeGreaterThanOrEqual(44);
      }
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('contact links stay meaningful and reachable when enlarged', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    await enlarge(page);
    for (const [name, href] of [
      ['son@sonwork.org', 'mailto:son@sonwork.org'],
      ['@sonldv', 'https://x.com/sonldv'],
      ['sonlndv', 'https://github.com/sonlndv'],
      ['in/sonle2003', 'https://www.linkedin.com/in/sonle2003'],
    ]) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });
});
