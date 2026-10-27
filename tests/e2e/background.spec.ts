import { expect, test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { builtPages } from './routes';

// The living-valley scenery is part of the shared layout: every HTML page and the 404 must show it,
// painted (not just present), fixed to the viewport, never in the way of input.
const UNKNOWN = '/no-such-page-sitewide-background';
const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false, reducedMotion: 'no-preference' };
const phone: BrowserContextOptions = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'no-preference' };

async function open(browser: Browser, baseURL: string | undefined, options: BrowserContextOptions, run: (page: Page, errors: string[]) => Promise<void>) {
  const context = await browser.newContext({ baseURL, ...options });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    // Only the genuine unknown-path document may be a 404 (and its matching console line); nothing else is excused.
    const expected = (url: string) => new URL(url).pathname === UNKNOWN;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !expected(message.location().url || 'http://x/')) errors.push(`console: ${message.text()}`);
    });
    page.on('requestfailed', request => errors.push(`failed ${request.url()}`));
    page.on('response', response => {
      if (response.status() >= 400 && !(response.status() === 404 && expected(response.url()))) errors.push(`${response.status()} ${response.url()}`);
    });
    await run(page, errors);
    expect(errors, 'page errors').toEqual([]);
  } finally {
    await context.close();
  }
}

// Navigate and require 404 on the unknown path, 200 on every real route.
async function visit(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} status`).toBe(path === UNKNOWN ? 404 : 200);
}

// Wait on real settled state: fonts loaded and the one-shot arrival (data-intro) gone, if JS started it.
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-intro', /.*/, { timeout: 4000 });
}

// The scene is visible, covers the viewport, is fixed, and its drawn paths have real geometry.
async function geometry(page: Page) {
  return page.locator('.mtn-scene').evaluate(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const rims = [...el.querySelectorAll<SVGGraphicsElement>('path.mtn-rim')].filter(p => p.getBoundingClientRect().width > 0 && getComputedStyle(p.closest('svg')!).display !== 'none');
    return {
      position: cs.position,
      display: cs.display,
      visibility: cs.visibility,
      opacity: parseFloat(cs.opacity),
      left: r.left, top: r.top, width: r.width, height: r.height,
      viewW: innerWidth, viewH: innerHeight,
      drawnRims: rims.length,
      stroke: rims[0] ? getComputedStyle(rims[0]).stroke : '',
      overflowX: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

// Proof of paint: the lower viewport differs pixel-for-pixel when only the scene is hidden. For this isolated
// diagnostic the companion is hidden and every other animation/transition is frozen, so identical content state
// is compared and Mount or arrival effects cannot account for a difference. The styles are removed afterwards.
async function painted(page: Page, js = true) {
  const { viewW, viewH } = await geometry(page);
  const clip = { x: 0, y: 300, width: viewW, height: viewH - 300 };
  // Inserted synchronously: addStyleTag awaits a load event, which never comes with JavaScript disabled.
  const style = (css: string) => page.evaluateHandle(css => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.append(s);
    return s;
  }, css);
  const still = await style('*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; } .companion, #companion-return { visibility: hidden !important; }');
  try {
    // Without JavaScript a page-side frame promise never resolves; screenshots paint synchronously.
    if (js) await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    else await page.waitForTimeout(32);
    const withScene = await page.screenshot({ clip, animations: 'disabled' });
    const hide = await style('.mtn-scene { visibility: hidden !important; }');
    const without = await page.screenshot({ clip, animations: 'disabled' });
    await hide.evaluate(el => el.remove());
    const again = await page.screenshot({ clip, animations: 'disabled' });
    // The scene-visible state is reproducible, so the difference above is the landscape alone.
    return !withScene.equals(without) && withScene.equals(again);
  } finally {
    await still.evaluate(el => el.remove());
  }
}

for (const [name, options] of [['desktop', desktop], ['phone', phone]] as const) {
  for (const theme of ['dark', 'light'] as const) {
    test(`every page and the 404 paint the scenery, fixed over the viewport (${name}, ${theme})`, async ({ browser, baseURL }) => {
      test.setTimeout(90_000); // multi-page matrix with several screenshots per page
      await open(browser, baseURL, { ...options, colorScheme: theme }, async page => {
        for (const path of [...builtPages(), UNKNOWN]) {
          await visit(page, path);
          await settle(page);
          await expect(page.locator('.mtn-scene'), `${path} scene count`).toHaveCount(1);
          const g = await geometry(page);
          expect(g.position, path).toBe('fixed');
          expect(g.display, path).not.toBe('none');
          expect(g.visibility, path).toBe('visible');
          expect(g.opacity, path).toBeGreaterThan(0.3);
          expect(g.drawnRims, `${path} drawn ridge lines`).toBeGreaterThan(0);
          expect(g.stroke, path).not.toBe('none');
          expect([g.left, g.top], path).toEqual([0, 0]);
          expect(g.width, path).toBe(g.viewW);
          expect(g.height, path).toBe(g.viewH);
          expect(g.overflowX, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
          expect(await painted(page), `${path} scene changes pixels`).toBe(true);
        }
      });
    });
  }
}

test('an inner page scrolls with the camera: the scene stays fixed, depth moves, no errors', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/about/');
    await settle(page);
    const scene = page.locator('.mtn-scene');
    const near = () => scene.evaluate(el => parseFloat(el.style.getPropertyValue('--mtn-near-y')));
    const before = await near();
    await page.mouse.wheel(0, 3000);
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 4000 }).toBeGreaterThan(0);
    await expect.poll(near, { timeout: 4000 }).toBeLessThan(before);
    const g = await geometry(page);
    expect([g.top, g.left, g.width, g.height]).toEqual([0, 0, g.viewW, g.viewH]);
    // Mouse camera is live on inner pages too (fine pointer), and the guarded frame loop never throws.
    await page.mouse.move(1439, 899);
    await expect.poll(async () => scene.evaluate(el => parseFloat(el.style.getPropertyValue('--mtn-fx'))), { timeout: 3000 }).toBeLessThan(-2.5);
  });
});

test('reduced motion keeps a still, painted scene on an inner page', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { ...desktop, reducedMotion: 'reduce' }, async page => {
    await page.goto('/work/');
    await page.evaluate(() => document.fonts.ready);
    const scene = page.locator('.mtn-scene');
    await expect(scene).not.toHaveAttribute('data-intro', /.*/);
    await page.mouse.move(100, 100);
    await page.mouse.move(1300, 800);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(250);
    await expect(scene).not.toHaveAttribute('data-cam', /.*/);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await scene.locator('div.mtn-near').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).f)).toBe(72);
    expect((await geometry(page)).drawnRims).toBeGreaterThan(0);
    expect(await painted(page)).toBe(true);
  });
});

for (const theme of ['dark', 'light'] as const) {
  test(`without JavaScript every built page and the 404 keep a static painted scene (${theme})`, async ({ browser, baseURL }) => {
    test.setTimeout(90_000); // multi-page matrix: four screenshots per page
    await open(browser, baseURL, { ...desktop, javaScriptEnabled: false, colorScheme: theme }, async page => {
      for (const path of [...builtPages(), UNKNOWN]) {
        await visit(page, path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('.mtn-scene'), path).toHaveCount(1);
        expect(await painted(page, false), `${path} ${theme}`).toBe(true);
      }
    });
  });
}

test('system and manual themes both recolour the scenery on an inner page', async ({ browser, baseURL }) => {
  const fill = async (page: Page) => {
    await page.evaluate(() => document.fonts.ready);
    // Resolved colours: the gradient stops (far, mid, near) and the current rim stroke.
    return page.locator('.mtn-scene').evaluate(el => {
      const stop = (k: string) => getComputedStyle(el.querySelector(`.mtn-s-${k}`)!).stopColor;
      return [stop('far'), stop('mid'), stop('near'), getComputedStyle(el.querySelector('path.mtn-rim')!).stroke].join('|');
    });
  };
  const seen: Record<string, string> = {};
  for (const scheme of ['dark', 'light'] as const) {
    await open(browser, baseURL, { ...desktop, colorScheme: scheme }, async page => {
      await page.goto('/subscribe/');
      seen[`system-${scheme}`] = await fill(page);
    });
    // Manual choice wins over the opposite system scheme.
    const opposite = scheme === 'dark' ? 'light' : 'dark';
    await open(browser, baseURL, { ...desktop, colorScheme: opposite }, async page => {
      await page.addInitScript(t => localStorage.setItem('theme', t), scheme);
      await page.goto('/subscribe/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      seen[`manual-${scheme}`] = await fill(page);
    });
  }
  expect(seen['system-dark']).not.toBe(seen['system-light']);
  expect(seen['manual-dark']).toBe(seen['system-dark']);
  expect(seen['manual-light']).toBe(seen['system-light']);
});

test('forced colors hide the decoration and leave inner pages readable and unscrolled sideways', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { ...desktop, forcedColors: 'active' }, async page => {
    for (const path of ['/work/', '/about/', UNKNOWN]) {
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.mtn-scene'), path).toHaveCount(1);
      await expect(page.locator('.mtn-scene')).toHaveCSS('display', 'none');
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} overflow`).toBeLessThanOrEqual(0);
    }
  });
});
