import { expect, test, type Page } from '@playwright/test';

// Connected valley: Mount's hello answered by the mist, same-valley navigation, reserved footer slot.
// Real CSS effects own completion; JS clock advances below prove only absence of queued timers.
test.setTimeout(45_000);

const mist = (page: Page) => page.locator('.mtn-mist');
const ribbon = (page: Page) => page.locator('.mtn-mist-ribbon');
const mount = (page: Page) => page.locator('.companion');
const toggle = (page: Page) => page.locator('.atmosphere-toggle');
const nativeClick = (loc: ReturnType<Page['locator']>) => loc.evaluate((el) => (el as HTMLElement).click());
const attr = (page: Page, name: string) => mist(page).getAttribute(name);


// Controlled CSS finish; natural moving/finite evidence remains a separate test contract.
async function completeMist(page: Page) {
  await ribbon(page).evaluate(el => {
    const effect = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'mtn-mist-pass');
    if (!effect) throw new Error('Missing actual mist effect');
    effect.finish();
  });
  await expect(mist(page)).toHaveAttribute('data-state', 'idle');
}
async function quietArrival(page: Page) {
  await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-intro', /.*/, { timeout: 3_000 });
  await expect(mist(page)).toHaveAttribute('data-state', 'running');
  await completeMist(page);
}

test.describe('hello answered by the valley', () => {
  test('hello starts one finite greeting pass at once, through the same controller', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await quietArrival(page);
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await nativeClick(mount(page));
    // Synchronous with the accepted hello: no wait beyond the event itself.
    expect(await page.evaluate(() => {
      const m = document.querySelector('.mtn-mist') as HTMLElement;
      return { state: m.dataset.state, source: m.dataset.source, passes: m.dataset.passes, greetings: m.dataset.greetings };
    })).toEqual({ state: 'running', source: 'greeting', passes: '2', greetings: '1' });
    const a = await ribbon(page).evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(1_500); // CSS animations run in real time
    const b = await ribbon(page).evaluate((el) => ({ t: getComputedStyle(el).transform, o: Number(getComputedStyle(el).opacity) }));
    expect(b.t).not.toBe(a);
    expect(b.o).toBeGreaterThan(0);
    // A second hello while running neither restarts nor counts another pass.
    await page.clock.runFor(800);
    await nativeClick(mount(page));
    await expect(mist(page)).toHaveAttribute('data-passes', '2');
    await expect(mist(page)).toHaveAttribute('data-greetings', '1');
    // Actual finite CSS completion; later JS time never queues an ambient recurrence.
    await completeMist(page);
    await expect(mist(page)).toHaveAttribute('data-state', 'idle');
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
    await page.clock.runFor(20_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '2');
    await page.clock.runFor(6_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '2');
    await expect(mist(page)).toHaveAttribute('data-source', 'greeting');
  });

  test('keyboard hello gives the same outcome', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await quietArrival(page);
    await mount(page).focus();
    await page.keyboard.press('Enter');
    await expect(mist(page)).toHaveAttribute('data-source', 'greeting');
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await expect(mount(page)).toHaveAttribute('data-greeting', 'true');
    await expect(mount(page)).toHaveAttribute('aria-label', 'Say hello to the mountain');
  });

  test('touch hello gives the same outcome', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch input needs the mobile project');
    await page.clock.install();
    await page.goto('/');
    await quietArrival(page);
    await mount(page).tap();
    await expect(mist(page)).toHaveAttribute('data-source', 'greeting');
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
  });

  test('Pause atmosphere stops the greeting pass immediately', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await quietArrival(page);
    await nativeClick(mount(page));
    await expect(mist(page)).toHaveAttribute('data-state', 'running');
    await nativeClick(toggle(page));
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');
    await expect(mist(page)).not.toHaveAttribute('data-run', '');
  });

  test('guards: paused, prose, scrolled and forced colours start nothing and queue nothing', async ({ page, browser }) => {
    // Paused (persisted preference).
    await page.addInitScript(() => localStorage.setItem('sonwork-atmosphere', 'paused'));
    await page.clock.install();
    await page.goto('/');
    await page.clock.runFor(400);
    await nativeClick(mount(page));
    await page.clock.runFor(60_000);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    await expect(mist(page)).toHaveAttribute('data-state', 'paused');

    // Prose page: hello never starts the mist.
    const prose = await browser.newPage();
    await prose.clock.install();
    await prose.goto('/about');
    await prose.clock.runFor(400);
    await nativeClick(mount(prose));
    await expect(mist(prose)).toHaveAttribute('data-passes', '0');
    await prose.close();

    // Scrolled Home: hello does not start it, and scrolling back queues no missed pass.
    const scrolled = await browser.newPage();
    await scrolled.clock.install();
    await scrolled.goto('/');
    await scrolled.clock.runFor(400);
    await scrolled.evaluate(() => scrollTo(0, 400));
    await scrolled.waitForTimeout(150);
    await nativeClick(mount(scrolled));
    await expect(mist(scrolled)).toHaveAttribute('data-passes', '0');
    await scrolled.close();

    // Forced colours.
    const forced = await browser.newContext({ forcedColors: 'active' });
    const fp = await forced.newPage();
    await fp.clock.install();
    await fp.goto('/');
    await fp.clock.runFor(400);
    await nativeClick(mount(fp));
    await expect(mist(fp)).toHaveAttribute('data-passes', '0');
    await forced.close();
  });

  test('reduced motion: hello does not start the mist', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await nativeClick(mount(page));
    await page.waitForTimeout(400);
    await expect(mist(page)).toHaveAttribute('data-passes', '0');
    await context.close();
  });
});

test.describe('same valley navigation', () => {
  const scene = (page: Page) => page.locator('.mtn-scene');

  test('direct entry draws; internal link skips only the repeated draw; reload draws again', async ({ page }) => {
    await page.goto('/');
    await expect(scene(page)).toHaveAttribute('data-arrival', 'first');
    await page.locator('.site-nav a[href="/work"]').click();
    await page.waitForURL('**/work');
    await expect(scene(page)).toHaveAttribute('data-arrival', 'continuous');
    expect(await scene(page).evaluate((el) => el.hasAttribute('data-intro'))).toBe(false);
    expect(await scene(page).locator('.mtn-rim[pathLength]').count()).toBe(0);
    await expect(page.locator('main')).toBeVisible();
    await page.reload();
    await expect(scene(page)).toHaveAttribute('data-arrival', 'first');
  });

  test('external referrer and fresh entry still draw', async ({ page }) => {
    await page.goto('/', { referer: 'https://example.com/somewhere' });
    await expect(scene(page)).toHaveAttribute('data-arrival', 'first');
    await page.goto('/work', { referer: 'not a url' });
    await expect(scene(page)).toHaveAttribute('data-arrival', 'first');
  });

  test('reduced motion stays static and noJS has no arrival state', async ({ browser }) => {
    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const rp = await reduced.newPage();
    await rp.goto('/');
    await expect(rp.locator('.mtn-scene')).toHaveAttribute('data-arrival', 'static');
    await reduced.close();
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const np = await nojs.newPage();
    await np.goto('/');
    expect(await np.locator('.mtn-scene').evaluate((el) => el.hasAttribute('data-arrival') || el.hasAttribute('data-intro'))).toBe(false);
    await nojs.close();
  });
});

test.describe('footer slot is reserved before the script arrives', () => {
  test('delayed atmosphere.js releases without moving the footer or shifting layout', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/atmosphere.js', async (route) => {
      await gate;
      await route.continue();
    });
    await page.addInitScript(() => {
      (window as any).__shifts = [];
      (window as any).__shiftSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift');
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__shifts.push(e.value);
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/', { waitUntil: 'commit' });
    await page.locator('.site-footer .atmosphere-toggle').waitFor({ state: 'attached' });
    const measure = () =>
      page.evaluate(() => {
        const f = document.querySelector('.site-footer')!.getBoundingClientRect();
        const t = document.querySelector('.atmosphere-toggle') as HTMLElement;
        const r = t.getBoundingClientRect();
        return {
          footerTop: f.top + scrollY, footerHeight: f.height, docHeight: document.documentElement.scrollHeight,
          toggleHeight: r.height, toggleWidth: r.width, hidden: t.hidden, visibility: getComputedStyle(t).visibility,
          shifts: ((window as any).__shifts as number[]).reduce((a, b) => a + b, 0),
        };
      });
    await page.waitForFunction(() => document.readyState !== 'loading' || !!document.querySelector('.site-footer'));
    await page.waitForTimeout(400);
    const before = await measure();
    // The observation is real: the reserved, still-hidden control already occupies its 44px box.
    expect(before.hidden).toBe(true);
    expect(before.visibility).toBe('hidden');
    expect(before.toggleHeight).toBeGreaterThanOrEqual(44);
    expect(before.toggleWidth).toBeGreaterThan(44);
    release();
    await expect(mist(page)).toHaveAttribute('data-state', /idle|running/, { timeout: 5_000 });
    await page.waitForTimeout(400);
    const after = await measure();
    expect(after.hidden).toBe(false);
    expect(after.visibility).toBe('visible');
    expect(await page.evaluate(() => (window as any).__shiftSupported)).toBe(true);
    expect(Math.abs(after.footerTop - before.footerTop)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.footerHeight - before.footerHeight)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.docHeight - before.docHeight)).toBeLessThanOrEqual(0.5);
    // No layout shift was introduced by releasing the script.
    expect(after.shifts - before.shifts).toBe(0);
  });

  test('noJS, reduced motion and forced colours reserve no empty control', async ({ browser }) => {
    for (const options of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' as const }, { forcedColors: 'active' as const }]) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForTimeout(300);
      expect(await toggle(page).evaluate((el) => getComputedStyle(el).display)).toBe('none');
      await context.close();
    }
  });

  test('label swap keeps the control box identical', async ({ page }) => {
    await page.goto('/');
    await expect(toggle(page)).toBeVisible();
    const a = await toggle(page).boundingBox();
    await nativeClick(toggle(page));
    await expect(toggle(page)).toHaveText('Resume atmosphere');
    const b = await toggle(page).boundingBox();
    expect(b!.width).toBe(a!.width);
    expect(b!.height).toBe(a!.height);
    expect(await attr(page, 'data-state')).toBe('paused');
  });
});
