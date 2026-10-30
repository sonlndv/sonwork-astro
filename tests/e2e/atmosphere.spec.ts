import { expect, test, type Page } from '@playwright/test';

// Valley mist + contextual Mount. Real timing and computed styles, run against the built dist/.
test.setTimeout(45_000);

const routes = ['/', '/work', '/writing', '/about', '/subscribe', '/this-route-does-not-exist'];
const mist = (page: Page) => page.locator('.mtn-mist');
const ribbon = (page: Page) => page.locator('.mtn-mist-ribbon');
const toggle = (page: Page) => page.locator('.atmosphere-toggle');
const ribbonStyle = (page: Page) =>
  ribbon(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return { opacity: Number(s.opacity), transform: s.transform };
  });

// Collects page errors and console errors. `missingDocument` names one deliberately unknown route:
// only the browser's own "Failed to load resource" console line whose location is exactly that URL,
// and only when that URL's DOCUMENT response really was 404, is excused. Script/asset 404s and any
// other console error still fail.
function watchErrors(page: Page, missingDocument?: string) {
  const errors: string[] = [];
  const confirmed404 = new Set<string>();
  page.on('response', (r) => {
    if (r.request().resourceType() === 'document' && r.status() === 404) confirmed404.add(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location().url;
    const excused =
      !!missingDocument && new URL(url || 'about:blank', 'http://x').pathname === missingDocument &&
      confirmed404.has(url) && /Failed to load resource.*404/.test(m.text());
    if (!excused) errors.push(m.text());
  });
  return errors;
}


// Controlled completion of the actual owned CSS effect, not elapsed-time or natural-time proof.
async function finishMist(page: Page) {
  await ribbon(page).evaluate(el => {
    const effect = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'mtn-mist-pass');
    if (!effect) throw new Error('Expected an actual owned mist effect');
    effect.finish();
  });
  await expect(mist(page)).toHaveAttribute('data-state', 'idle');
}

// Deterministic setup ONLY for the clock-driven negative probes. Finish the genuine attached
// entrance and observe its native bubbling completion after the actual owner handles it.
// Clock installation stays before navigation; the separate natural-time test owns elapsed timing.
async function finishArrival(page: Page) {
  const probe = await page.locator('.mtn-scene').evaluateHandle(el => {
    const root = el as HTMLElement;
    const layers = root.querySelectorAll<HTMLElement>(':scope > .mtn-layer.mtn-near');
    if (layers.length !== 1) throw new Error('Expected one actual outer near layer');
    const near = layers[0]!;
    const effects = near.getAnimations().filter(a => a instanceof CSSAnimation && a.animationName === 'mtn-near-in');
    const effect = effects[0];
    if (effects.length !== 1 || !(effect instanceof CSSAnimation) ||
        !(effect.effect instanceof KeyframeEffect) || effect.effect.target !== near ||
        !near.isConnected || !root.hasAttribute('data-intro') || effect.playState !== 'running') {
      throw new Error('Expected the nonempty, attached, running mtn-near-in entrance');
    }
    const mist = root.querySelector<HTMLElement>('.mtn-mist')!;
    const state = () => ({
      arrival: root.dataset.arrival, intro: root.hasAttribute('data-intro'),
      state: mist.dataset.state, passes: mist.dataset.passes, source: mist.dataset.source,
      normalizedRims: root.querySelectorAll('.mtn-rim[pathLength]').length,
    });
    const timing = effect.effect.getTiming();
    const receipt = {
      control: 'finish() on the original CSS entrance; not natural-time evidence',
      before: state(),
      effect: { name: effect.animationName, count: effects.length, duration: Number(timing.duration),
        delay: timing.delay, iterations: timing.iterations, pending: effect.pending },
      nativeEnd: null as null | { name: string; trusted: boolean; targetIsNear: boolean;
        elapsedTime: number; afterOwner: ReturnType<typeof state> },
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target !== near || event.animationName !== 'mtn-near-in') return;
      // mountains.js registered first on this root: these are states AFTER finishIntro(true).
      receipt.nativeEnd = { name: event.animationName, trusted: event.isTrusted, targetIsNear: event.target === near,
        elapsedTime: event.elapsedTime, afterOwner: state() };
      root.removeEventListener('animationend', onEnd);
    };
    root.addEventListener('animationend', onEnd);
    effect.finish();
    return { receipt, cleanup: () => root.removeEventListener('animationend', onEnd) };
  });
  try {
    // Original 3000ms admission assertion; no added wait or larger deadline.
    await expect(mist(page)).toHaveAttribute('data-state', 'running', { timeout: 3_000 });
    const receipt = await probe.evaluate(p => p.receipt);
    expect(receipt.before.arrival).toBe('first');
    expect(receipt.before.intro).toBe(true);
    expect(receipt.before.state).toBe('idle');
    expect(receipt.before.passes).toBe('0');
    expect(receipt.before.normalizedRims).toBeGreaterThan(0);
    expect(receipt.effect).toMatchObject({ name: 'mtn-near-in', count: 1, duration: 1600, delay: 150, iterations: 1 });
    expect(receipt.nativeEnd).not.toBeNull();
    expect(receipt.nativeEnd).toMatchObject({
      name: 'mtn-near-in', trusted: true, targetIsNear: true,
      afterOwner: { intro: false, state: 'running', passes: '1', source: 'ambient', normalizedRims: 0 },
    });
    expect(receipt.nativeEnd!.elapsedTime).toBeCloseTo(1.6, 6);
  } finally {
    // Preserve the witness even when admission/native-completion assertions fail.
    try {
      await test.info().attach('controlled-entrance-native-completion', {
        body: JSON.stringify(await probe.evaluate(p => p.receipt), null, 2), contentType: 'application/json',
      });
    } finally {
      await probe.evaluate(p => p.cleanup());
      await probe.dispose();
    }
  }
}

test.describe('shared scene', () => {
  for (const route of routes) {
    test(`mist layer sits between far and near on ${route}`, async ({ page }) => {
      const unknown = route === '/this-route-does-not-exist';
      const errors = watchErrors(page, unknown ? route : undefined);
      const response = await page.goto(route);
      expect(response!.status()).toBe(unknown ? 404 : 200);
      await expect(page.locator('.mtn-scene .mtn-mist')).toHaveCount(1);
      const order = await page.evaluate(() =>
        [...document.querySelector('.mtn-scene')!.children].map((c) => c.className),
      );
      // The night sky is no direct child: it lives inside each of the two far-ridge SVGs.
      expect(order).toEqual(['mtn-layer mtn-far', 'mtn-layer mtn-middle', 'mtn-mist', 'mtn-layer mtn-near']);
      await expect(page.locator('.mtn-scene .mtn-sky')).toHaveCount(0);
      await expect(page.locator('.mtn-scene > .mtn-far > svg.mtn-ridge > g.sv-sky')).toHaveCount(2);
      await expect(page.locator('.mtn-scene g.sv-sky')).toHaveCount(2);
      await expect(page.locator('.atmosphere-toggle')).toHaveCount(1);
      await expect(mist(page)).toHaveAttribute('aria-hidden', 'true');
      expect(errors).toEqual([]);
    });
  }

  test('original ridge geometry is untouched by the mist layer', async ({ page }) => {
    await page.goto('/');
    const counts = await page.evaluate(() => ({
      far: document.querySelectorAll('.mtn-far .mtn-lit').length,
      middle: document.querySelectorAll('.mtn-middle .mtn-lit').length,
      near: document.querySelectorAll('.mtn-near .mtn-lit').length,
      mistPaths: document.querySelectorAll('.mtn-mist path').length,
    }));
    expect(counts).toEqual({ far: 2, middle: 2, near: 2, mistPaths: 0 });
  });
});

test.describe('mist pass', () => {
  test('first pass starts promptly, moves, then ends finite', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    const t0 = Date.now();
    await expect(mist(page)).toHaveAttribute('data-run', '', { timeout: 3_000 });
    expect(Date.now() - t0).toBeLessThan(3_000);
    const a = await ribbonStyle(page);
    await page.waitForTimeout(2_000);
    const b = await ribbonStyle(page);
    expect(b.opacity).toBeGreaterThan(0);
    expect(b.transform).not.toBe(a.transform);
    expect(b.opacity).toBeLessThanOrEqual(1);
    await expect(mist(page)).toHaveAttribute('data-state', 'idle', { timeout: 8_000 });
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    expect((await ribbonStyle(page)).opacity).toBe(0);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
    expect(errors).toEqual([]);
  });

  test('completed arrival remains idle beyond the old interval (controlled CSS finish, JS clock absence)', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await finishArrival(page);
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await finishMist(page);
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(19_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
    await page.clock.runFor(6_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
  });

  test('calm prose pages earn no ambient pass or recurring work', async ({ page }) => {
    await page.clock.install();
    await page.goto('/about');
    await page.clock.runFor(1_800);
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(7_200);
    await page.clock.runFor(60_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    expect(await ribbon(page).evaluate(el => el.getAnimations().length)).toBe(0);
  });

  test('scrolling interrupts an active pass', async ({ page }) => {
    await page.goto('/');
    await expect(mist(page)).toHaveAttribute('data-state', 'running', { timeout: 3_000 });
    await page.evaluate(() => scrollTo(0, 400));
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    await page.waitForTimeout(500);
    expect((await ribbonStyle(page)).opacity).toBe(0);
  });

  test('hidden tab cancels and does not replay in a burst', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await finishArrival(page);
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(60_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
  });
});

test.describe('pause control', () => {
  const status = (page: Page) => page.locator('#atmosphere-status');

  test('native click while the pass is active pauses at once, with a described state', async ({ page }) => {
    await page.goto('/');
    await expect(toggle(page)).toHaveText('Pause atmosphere');
    expect(await toggle(page).evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(toggle(page)).toHaveAttribute('aria-describedby', 'atmosphere-status');
    await expect(toggle(page)).not.toHaveAttribute('aria-pressed', /.*/);
    await expect(status(page)).toHaveText('Atmosphere running');
    await expect(mist(page)).toHaveAttribute('data-state', 'running', { timeout: 3_000 });
    // The footer is below the fold on a live page, so activate the native button through the DOM.
    await toggle(page).evaluate((el) => (el as HTMLButtonElement).click());
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    await expect(toggle(page)).toHaveText('Resume atmosphere');
    await expect(status(page)).toHaveText('Atmosphere paused');
    await page.waitForTimeout(300);
    expect(Number((await ribbonStyle(page)).opacity)).toBe(0);
  });

  test('footer keyboard activation is 44px, shows focus, and persists across routes', async ({ page }) => {
    await page.goto('/');
    await toggle(page).scrollIntoViewIfNeeded();
    const box = await toggle(page).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Tab'); // real keyboard modality so :focus-visible applies
    await toggle(page).focus();
    expect(await toggle(page).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(toggle(page)).toHaveText('Resume atmosphere');
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await page.goto('/work');
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await expect(toggle(page)).toHaveText('Resume atmosphere');
    await page.waitForTimeout(2_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    // Resume from the footer: unpaused and idle (the reading/scroll guard keeps it still down here).
    await toggle(page).scrollIntoViewIfNeeded();
    await toggle(page).click();
    await expect(toggle(page)).toHaveText('Pause atmosphere');
    await expect(status(page)).toHaveText('Atmosphere running');
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.waitForTimeout(1_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
  });

  test('resume and returning to top align scenery without queuing a missed pass', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await finishArrival(page); // controlled admission; natural arrival timing is tested separately
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await toggle(page).evaluate((el) => (el as HTMLButtonElement).click());
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    await toggle(page).evaluate((el) => (el as HTMLButtonElement).click());
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(60_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1'); // nothing queued while scrolled
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.clock.runFor(23_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
    await page.clock.runFor(2_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
  });

  test('simulated bfcache restore queues no new pass (pagehide/pageshow events, not a native bfcache)', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await finishArrival(page); // controlled admission; natural arrival timing is tested separately
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(20_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
    await page.clock.runFor(5_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
    await page.clock.runFor(1_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
  });

  test('repeated native scroll events do not arm an idle recurrence', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await finishArrival(page); // controlled admission; natural arrival timing is tested separately
    await finishMist(page); // actual CSS completion; JS time cannot finish it
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await page.clock.runFor(20_000);
    for (let i = 0; i < 3; i++) {
      await page.evaluate((y) => scrollTo(0, y), 2 + i * 2); // real scroll events inside the top guard must not extend the delay
      await page.waitForTimeout(50);
    }
    await page.clock.runFor(5_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '1');
  });

  test('works with storage denied (in-memory only)', async ({ page }) => {
    await page.addInitScript(() => {
      const deny = () => {
        throw new DOMException('denied', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
    });
    const errors = watchErrors(page);
    await page.goto('/');
    await toggle(page).click();
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await expect(toggle(page)).toHaveText('Resume atmosphere');
    expect(errors).toEqual([]);
  });

  test('hello and Back to top are intact', async ({ page }) => {
    await page.goto('/');
    const mount = page.locator('.companion');
    await expect(mount).toBeEnabled();
    await expect(mount).toHaveAttribute('aria-label', 'Say hello to the mountain');
    await page.waitForTimeout(1_000);
    await mount.click();
    await expect(mount).toHaveAttribute('data-greeting', 'true');
    await expect(page.locator('#companion-return')).toHaveCount(1);
  });
});

test.describe('reduced motion, noJS, forced colours', () => {
  test('reduced motion never runs and hides the control', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(2_500);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    await expect(toggle(page)).toBeHidden();
    expect(await mist(page).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await context.close();
  });

  test('live reduced-motion change cancels the pass', async ({ page }) => {
    await page.goto('/');
    await expect(mist(page)).toHaveAttribute('data-state', 'running', { timeout: 3_000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    await expect(toggle(page)).toBeHidden();
  });

  test('noJS: scenery is static, mist and control are hidden', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.mtn-scene > .mtn-far')).toHaveCount(1);
    expect(await mist(page).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect(toggle(page)).toBeHidden();
    await expect(page.locator('main')).toBeVisible();
    await context.close();
  });

  test('forced colours: no decoration, no control', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await page.waitForTimeout(2_000);
    expect(await mist(page).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    await expect(toggle(page)).toBeHidden();
  });
});

test.describe('prose stays readable', () => {
  test('mist never overflows the page or hides text', async ({ page }) => {
    await page.goto('/about');
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      z: getComputedStyle(document.querySelector('.mtn-scene')!).zIndex,
      events: getComputedStyle(document.querySelector('.mtn-mist')!).pointerEvents,
    }));
    expect(m).toEqual({ overflow: 0, z: '-1', events: 'none' });
    expect((await ribbonStyle(page)).opacity).toBeLessThanOrEqual(1);
    expect((await ribbonStyle(page)).opacity).toBe(0);
  });
});

test.describe('contextual Mount', () => {
  const mount = (page: Page) => page.locator('.companion');
  const entryLink = (page: Page) => page.locator('.build-entry h3 a').first();

  // Mount's own first stroll is scheduled 650ms after load and lasts 900ms; wait out that whole
  // window (1550ms + margin) so the perk is observed on a resting friend, then check the poses.
  async function settleIntro(page: Page) {
    await expect(mount(page)).toBeEnabled();
    await page.waitForTimeout(1_650);
    await expect(mount(page)).not.toHaveAttribute('data-stroll', 'true');
    await expect(mount(page)).not.toHaveAttribute('data-pose', /.+/);
    await expect(mount(page)).not.toHaveAttribute('data-greeting', 'true');
  }

  // The app handles focusin on document. Sample at window in the same dispatch, before the
  // finite 560ms pose can expire during a driver round trip. No timers or poses are changed.
  async function observeProjectFocus(page: Page, selector: string, hello = false) {
    await page.evaluate(({ selector, hello }) => {
      const probe = { live: null as unknown, hello: null as unknown };
      (window as any).__projectFocusProbe = probe;
      const observe = (event: FocusEvent) => {
        if (!(event.target instanceof Element) || !event.target.matches(selector)) return;
        window.removeEventListener('focusin', observe);
        const m = document.querySelector<HTMLElement>('.companion')!;
        const body = m.querySelector('.body')!;
        const bounds = body.getBoundingClientRect();
        const eyes = [...m.querySelectorAll('.eye')].map((eye) => eye.getBoundingClientRect());
        probe.live = {
          pose: m.dataset.pose ?? null, perks: m.dataset.perks,
          focusVisible: event.target.matches(':focus-visible'),
          translate: getComputedStyle(m.querySelector('.eye')!).translate,
          animation: getComputedStyle(body).animationName,
          inside: eyes.every((r) => r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom),
        };
        if (hello) {
          // Same native DOM activation as before, while the independently captured perk is live.
          m.click();
          probe.hello = { greeting: m.dataset.greeting ?? null, pose: m.dataset.pose ?? null };
        }
      };
      window.addEventListener('focusin', observe);
    }, { selector, hello });
  }

  async function observedFocus(page: Page) {
    const probe = await page.evaluate(() => (window as any).__projectFocusProbe);
    expect(probe.live).not.toBeNull();
    expect(probe.live.pose).toBe('perk');
    expect(probe.live.perks).toBe('1');
    expect(probe.live.focusVisible).toBe(true);
    return probe;
  }

  // Observe the actual clearPose timer, without changing its delay, callback receiver/arguments,
  // returned handle or cancellation. Installed after the intro, around native or Playwright timers.
  async function observePerkTimer(page: Page) {
    await page.evaluate(() => {
      const set = window.setTimeout;
      const clear = window.clearTimeout;
      const records: any[] = [];
      const pending = new Map<Parameters<typeof clear>[0], any>();
      const listeners = new Map<any, Set<() => void>>();
      let focusStartedAt: number | null = null;
      const state = () => {
        const m = document.querySelector<HTMLElement>('.companion')!;
        return {
          at: performance.now(), pose: m.dataset.pose ?? null, perks: m.dataset.perks,
          gaze: ['--look-x', '--look-y', '--look-r'].map(p => m.style.getPropertyValue(p)),
          focusVisible: document.activeElement?.matches('a[href]:focus-visible') ?? false,
        };
      };
      addEventListener('focusin', () => { focusStartedAt = performance.now(); }, true);
      window.setTimeout = function (this: Window, handler: TimerHandler, delay?: number, ...args: any[]) {
        const m = document.querySelector<HTMLElement>('.companion');
        if (typeof handler !== 'function' || handler.name !== 'clearPose' || m?.dataset.pose !== 'perk') {
          return Reflect.apply(set, this, [handler, delay, ...args]);
        }
        const record = {
          // Native time brackets the producer's private perkAt; paused time makes them identical.
          activationStart: focusStartedAt, admitted: state(), delay,
          scheduledAt: performance.now(), registeredAt: 0, handle: 0,
          deadline: { earliest: 0, latest: 0 },
          firedAt: null as number | null, before: null as ReturnType<typeof state> | null,
          after: null as ReturnType<typeof state> | null, returned: false,
          clears: [] as { at: number; duringCallback: boolean }[],
        };
        const handle = Reflect.apply(set, this, [function (this: Window, ...callbackArgs: any[]) {
          record.firedAt = performance.now();
          record.before = state();
          try {
            const result = Reflect.apply(handler, this, callbackArgs);
            record.returned = true;
            return result;
          } finally {
            record.after = state();
            pending.delete(handle);
            listeners.get(record)?.forEach(notify => notify());
          }
        }, delay, ...args]);
        record.registeredAt = performance.now();
        record.deadline = {
          earliest: record.scheduledAt + Number(delay),
          latest: record.registeredAt + Number(delay),
        };
        record.handle = handle;
        records.push(record);
        pending.set(handle, record);
        return handle;
      } as typeof window.setTimeout;
      window.clearTimeout = function (this: Window, ...args: Parameters<typeof window.clearTimeout>) {
        const record = pending.get(args[0]!);
        if (record) {
          record.clears.push({ at: performance.now(), duringCallback: record.firedAt !== null });
          pending.delete(args[0]!);
        }
        return Reflect.apply(clear, this, args);
      };
      (window as any).__perkTimerProbe = {
        records, state,
        // The same 900ms finite observation budget, anchored to scheduling, not a later poll.
        // This watchdog only observes; it neither invokes nor cancels the application timer.
        waitForExpiry: (budget: number) => new Promise<void>(resolve => {
          const record = records[0];
          if (!record || record.after) { resolve(); return; }
          let watchdog: ReturnType<typeof set>;
          const finish = () => {
            clear.call(window, watchdog);
            listeners.delete(record);
            resolve();
          };
          listeners.set(record, new Set([finish]));
          watchdog = set.call(window, finish, Math.max(0, record.scheduledAt + budget - performance.now()));
        }),
      };
    });
  }

  async function perkEvidence(page: Page) {
    return page.evaluate(() => {
      const p = (window as any).__perkTimerProbe;
      return { timers: p.records, current: p.state(), focus: (window as any).__projectFocusProbe };
    });
  }

  // Native Tab journey until focus lands on a link inside the project list.
  async function tabToProject(page: Page, selector: string) {
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
    }
    throw new Error(`Tab never reached ${selector}`);
  }

  test('keyboard focus on a project link perks once, finitely, and returns to rest', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await settleIntro(page);
    await observePerkTimer(page);
    await observeProjectFocus(page, '.build-entry h3 a');
    await page.keyboard.press('Tab'); // make focus-visible heuristics keyboard-driven
    await entryLink(page).focus();
    const activation = await perkEvidence(page);
    await testInfo.attach('native-perk-activation', { body: JSON.stringify(activation, null, 2), contentType: 'application/json' });
    await page.evaluate(() => (window as any).__perkTimerProbe.waitForExpiry(900));
    const expiry = await perkEvidence(page);
    await testInfo.attach('native-perk-expiry', { body: JSON.stringify({ timing: 'natural time', ...expiry }, null, 2), contentType: 'application/json' });
    const { live } = await observedFocus(page);
    await expect(mount(page)).toHaveAttribute('data-perks', '1');
    expect(live.translate).not.toBe('none');
    expect(live.animation).toBe('companion-perk');
    expect(live.inside).toBe(true);
    expect(expiry.timers).toHaveLength(1);
    const timer = expiry.timers[0];
    expect(timer.delay).toBe(560);
    expect(timer.activationStart).not.toBeNull();
    expect(timer.scheduledAt).toBeGreaterThanOrEqual(timer.activationStart);
    expect(timer.admitted.pose).toBe('perk');
    expect(timer.deadline.earliest).toBe(timer.scheduledAt + 560);
    expect(timer.deadline.latest).toBe(timer.registeredAt + 560);
    expect(timer.firedAt).not.toBeNull();
    // Exact 559/560 boundaries are asserted under the paused clock below; natural callback
    // dispatch is observed against the unchanged finite budget, without assuming sub-ms precision.
    expect(timer.firedAt).toBeGreaterThanOrEqual(timer.scheduledAt);
    expect(timer.firedAt).toBeLessThanOrEqual(timer.scheduledAt + 900);
    expect(timer.before.pose).toBe('perk');
    expect(timer.returned).toBe(true);
    expect(timer.after.pose).toBeNull();
    expect(timer.after.gaze).toEqual(['', '', '']);
    expect(timer.clears).toEqual([{ at: expect.any(Number), duringCallback: true }]);
    await expect(mount(page)).not.toHaveAttribute('data-pose', 'perk', { timeout: 900 });
    expect(await mount(page).evaluate((el) => el.style.getPropertyValue('--look-x'))).toBe('');
    // Debounce boundaries are independently proven below; a later driver task is not a clock.
    expect(errors).toEqual([]);
  });

  test('perk expiry and same-entry debounce use original activation time (paused simulated clock)', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    // Pause in the empty document before navigation; no app timer is fast-forwarded by pauseAt.
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await page.goto('/');
    await page.clock.runFor(1_650); // genuine original first-stroll timers, then a resting Mount
    await observePerkTimer(page);
    await observeProjectFocus(page, '.build-entry h3 a');
    await page.keyboard.press('Tab');
    await entryLink(page).focus();
    const activation = await perkEvidence(page);
    await page.clock.runFor(559);
    const beforeExpiry = await perkEvidence(page);
    await page.clock.runFor(1);
    const atExpiry = await perkEvidence(page);
    await page.clock.runFor(639); // 1199ms from original activation, after the genuine 560ms callback
    const refocus = () => entryLink(page).evaluate(a => {
      (a as HTMLElement).blur();
      (a as HTMLElement).focus();
    });
    await refocus();
    const inside = await perkEvidence(page);
    await page.clock.runFor(2); // 1201ms from ORIGINAL activation; suppressed refocus must not reset it
    await refocus();
    const outside = await perkEvidence(page);
    await page.clock.runFor(560);
    const secondExpiry = await perkEvidence(page);
    await testInfo.attach('clock-driven-perk-boundaries', {
      body: JSON.stringify({ timing: 'paused Playwright clock; simulated milliseconds, native focus handlers', activation, beforeExpiry, atExpiry, inside, outside, secondExpiry }, null, 2),
      contentType: 'application/json',
    });
    await observedFocus(page); // retains genuine focus-visible and the admitted original perk
    expect(activation.timers).toHaveLength(1);
    const first = activation.timers[0];
    expect(first.activationStart).toBe(first.scheduledAt);
    expect(first.registeredAt).toBe(first.scheduledAt);
    expect(first.admitted.pose).toBe('perk');
    expect(first.delay).toBe(560);
    expect(first.deadline).toEqual({ earliest: first.scheduledAt + 560, latest: first.scheduledAt + 560 });
    expect(beforeExpiry.current.at - first.scheduledAt).toBe(559);
    expect(beforeExpiry.current.pose).toBe('perk');
    expect(beforeExpiry.timers[0].firedAt).toBeNull();
    expect(atExpiry.current.at - first.scheduledAt).toBe(560);
    expect(atExpiry.timers[0].firedAt).toBe(first.scheduledAt + 560);
    expect(atExpiry.timers[0].before.pose).toBe('perk');
    expect(atExpiry.timers[0].returned).toBe(true);
    expect(atExpiry.timers[0].after.pose).toBeNull();
    expect(atExpiry.timers[0].after.gaze).toEqual(['', '', '']);
    expect(inside.current.at - first.scheduledAt).toBe(1199);
    expect(inside.current.focusVisible).toBe(true);
    expect(inside.current.pose).toBeNull();
    expect(inside.current.perks).toBe('1');
    expect(inside.timers).toHaveLength(1); // no busy poseTimer remains to mask the debounce guard
    expect(outside.current.at - first.scheduledAt).toBe(1201);
    expect(outside.current.focusVisible).toBe(true);
    expect(outside.current.perks).toBe('2');
    expect(outside.current.pose).toBe('perk');
    expect(outside.timers).toHaveLength(2);
    const second = secondExpiry.timers[1];
    expect(second.activationStart - first.scheduledAt).toBe(1201);
    expect(second.scheduledAt).toBe(second.activationStart);
    expect(second.delay).toBe(560);
    expect(second.deadline).toEqual({ earliest: second.scheduledAt + 560, latest: second.scheduledAt + 560 });
    expect(second.firedAt).toBe(second.scheduledAt + 560);
    expect(second.before.pose).toBe('perk');
    expect(second.returned).toBe(true);
    expect(second.after.pose).toBeNull();
    expect(second.after.gaze).toEqual(['', '', '']);
    expect(secondExpiry.current.perks).toBe('2');
    expect(secondExpiry.current.pose).toBeNull();
    expect(errors).toEqual([]);
  });

  test('hover perks on a hover-capable pointer without repeating on descendants', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover needs a fine mouse; the touch path is covered below');
    await page.goto('/');
    await settleIntro(page);
    const link = entryLink(page);
    await link.hover();
    await expect(mount(page)).toHaveAttribute('data-perks', '1');
    const box = (await link.boundingBox())!;
    await page.mouse.move(box.x + 6, box.y + 8);
    await page.mouse.move(box.x + 10, box.y + 12);
    await page.waitForTimeout(800);
    await expect(mount(page)).not.toHaveAttribute('data-pose', 'perk');
    await expect(mount(page)).toHaveAttribute('data-perks', '1');
  });

  test('native Tab journey perks on Home and Build project links', async ({ page }) => {
    for (const [route, selector] of [
      ['/', '.build-entry a[href]'],
      ['/work', 'section:has(#work-live) a[href]'],
    ] as const) {
      await page.goto(route);
      await settleIntro(page);
      await observeProjectFocus(page, selector);
      await tabToProject(page, selector);
      await observedFocus(page);
      await expect(mount(page)).toHaveAttribute('data-perks', '1');
      await expect(mount(page)).not.toHaveAttribute('data-pose', 'perk', { timeout: 900 });
    }
  });

  test('touch pointerdown perks before the link navigates; the first tap is not swallowed', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch input needs the mobile project');
    await page.goto('/');
    await settleIntro(page);
    // Observation only: after the page's own pointerdown handlers ran, note the pose and whether the
    // event was cancelled. Nothing is prevented or forced; the native tap proceeds to navigate.
    // The window BUBBLE listener runs after the app's document listener, synchronously, and reports
    // to a parent-owned binding, so nothing is lost to a later navigation.
    const probes: unknown[] = [];
    await page.exposeFunction('__touchProbe', (p: unknown) => probes.push(p));
    await page.evaluate(() => {
      addEventListener('pointerdown', (e) => {
        const m = document.querySelector('.companion') as HTMLElement;
        (window as any).__touchProbe({ pose: m.dataset.pose ?? null, perks: m.dataset.perks, cancelled: e.defaultPrevented });
      });
    });
    const href = await entryLink(page).getAttribute('href');
    await entryLink(page).tap();
    await page.waitForURL((url) => url.pathname !== '/', { timeout: 5_000 });
    expect(new URL(page.url()).pathname).toBe(new URL(href!, page.url()).pathname);
    expect(probes).toEqual([{ pose: 'perk', perks: '1', cancelled: false }]);
  });

  test('perk yields to hello and leaves no stale reaction', async ({ page }) => {
    await page.goto('/');
    await settleIntro(page);
    await observeProjectFocus(page, '.build-entry h3 a', true);
    await page.keyboard.press('Tab');
    await entryLink(page).focus();
    const probe = await observedFocus(page);
    expect(probe.hello).toEqual({ greeting: 'true', pose: null });
    await expect(mount(page)).not.toHaveAttribute('data-pose', 'perk');
    await page.waitForTimeout(900);
    await expect(mount(page)).not.toHaveAttribute('data-greeting', 'true');
    await expect(mount(page)).toHaveAttribute('data-perks', '1');
  });

  test('reduced motion: no perk', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.keyboard.press('Tab');
    await entryLink(page).focus();
    await page.waitForTimeout(300);
    await expect(mount(page)).not.toHaveAttribute('data-pose', 'perk');
    await context.close();
  });
});
