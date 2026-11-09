import { createHash } from 'node:crypto';
import { expect, test, type Browser, type BrowserContextOptions, type Locator, type Page } from '@playwright/test';
import { builtPages } from './routes';

// Every case builds its own explicit context, so each project runs the same real native behaviour
// (fine-pointer desktop, coarse-touch phone, reduced motion, no JavaScript) with no conditional skips.
const hermes = 'Hermes is my main driver now. I use it to build things, try ideas, and learn as I go.';
const ROUTES = ['/', '/work/', '/writing/', '/about/', '/subscribe/'];
const UNKNOWN = '/no-such-page-sitewide-background';
const FAVICON_SHA256 = '410266c6050fb5ed9ea44768a987748c2e51600e091a8fd8797cd2f8498243c4';

const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false, reducedMotion: 'no-preference' };
const touch: BrowserContextOptions = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'no-preference' };
const reduced: BrowserContextOptions = { ...desktop, reducedMotion: 'reduce' };
const noJs: BrowserContextOptions = { ...desktop, javaScriptEnabled: false };

const mountPaths = [
  // Approved refined original Mount: one shared contour, a straight crease, matching rounded upright eyes.
  'M38 332C38 324 46 316 62 298L148 144C168 102 186 78 204 76C224 74 238 92 252 118L266 142C278 126 296 124 308 140L364 236C376 258 372 290 366 318C364 330 352 338 340 338L66 338C50 338 38 336 38 332Z',
  'M204 76C224 74 238 92 252 118L266 142C278 126 296 124 308 140L364 236C376 258 372 290 366 318C364 330 352 338 340 338L246 338Z',
  'M62 298L148 144C168 102 186 78 204 76C214 75 222 80 230 90',
  'M152 212Q152 202 162 202L170 202Q180 202 180 212L180 256Q180 266 170 266L162 266Q152 266 152 256Z',
  'M244 212Q244 202 254 202L262 202Q272 202 272 212L272 256Q272 266 262 266L254 266Q244 266 244 256Z',
];

async function open(browser: Browser, baseURL: string | undefined, options: BrowserContextOptions, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ baseURL, ...options });
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

const toBottom = (page: Page) => page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
// Scroll so the Selected projects heading sits near the top, which is where Mount perches by the builds.
const toBuilds = (page: Page) => page.evaluate(() => {
  const head = document.querySelector('.front-projects .section-head')!;
  scrollTo(0, scrollY + head.getBoundingClientRect().top - 120);
});

test('Mount is the native 68x44 button beside the Son wordmark, with the footer seat to match', async ({ browser, baseURL }) => {
  for (const options of [desktop, touch]) {
    await open(browser, baseURL, options, async page => {
      for (const path of ROUTES) {
        await page.goto(path);
        const brand = page.locator('.personal-brand');
        await expect(brand.locator('.wordmark')).toHaveText('Son');
        const mount = brand.locator('button.companion');
        await expect(mount).toHaveCount(1);
        expect(await mount.locator('svg path').evaluateAll(els => els.map(el => el.getAttribute('d')))).toEqual(mountPaths);
        await expect(mount).toBeEnabled();
        const box = (await mount.boundingBox())!;
        expect(box.width).toBeCloseTo(68, 0);
        expect(box.height).toBeCloseTo(44, 0);
        const build = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Build', exact: true });
        await expect(build).toHaveAttribute('href', '/work');
        await expect(page.locator('footer .footer-name span').first()).toHaveText('Son');
        const slot = page.locator('.footer-slot');
        await slot.scrollIntoViewIfNeeded();
        const slotBox = (await slot.boundingBox())!;
        expect(slotBox.width).toBeCloseTo(box.width, 0);
        expect(slotBox.height).toBeCloseTo(box.height, 0);
        await expect(page.locator('#companion-return.footer-top')).toHaveCount(1);
      }
    });
  }
});

test('companion.css wins the cascade over the bundled styles', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/');
    await expect(page.locator('.wordmark')).toHaveCSS('padding-inline-end', '4px');
    await expect(page.locator('.front-projects')).toHaveCSS('container-type', 'inline-size');
    const heading = page.locator('.build-entry h3').first();
    await expect(heading).toHaveCSS('display', 'flex');
    await expect(heading).toHaveCSS('min-height', '44px');
    await expect(page.locator('.build-list')).toHaveCSS('list-style-type', 'none');
    await expect(page.locator('.front-lead .hermes-note')).toHaveCSS('font-size', '17px');
    expect(await page.locator('.build-entry').evaluateAll(els => new Set(els.map(el => Math.round(el.getBoundingClientRect().width))).size)).toBe(1);
  });
});

test('the original Mount favicon is linked on every route and served byte-identical', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    for (const path of ROUTES) {
      await page.goto(path);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg?v=mount-1');
    }
    const response = await page.request.get('/favicon.svg?v=mount-1');
    expect(response.status()).toBe(200);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(FAVICON_SHA256);
  });
});

test('the landscape is on every built HTML page and the 404, in both themes, and never takes input', async ({ browser, baseURL }) => {
  test.setTimeout(90_000); // all pages x two sizes x two themes
  const paths = [...builtPages(), UNKNOWN];
  for (const options of [desktop, touch]) {
    for (const theme of ['dark', 'light'] as const) {
      await open(browser, baseURL, { ...options, colorScheme: theme }, async page => {
        for (const path of paths) {
          await page.goto(path);
          const scene = page.locator('.mtn-scene');
          await expect(scene, `${path} scene`).toHaveCount(1);
          await expect(page.locator('body'), `${path} body`).toHaveClass(/mountains/);
          // Versioned resources: exactly one of each, at the exact pathname with the declared cache-bust query.
          const resources = (selector: string, attribute: string, pathname: string) => page.evaluate(([s, a, p]) =>
            [...document.querySelectorAll(s)].map(n => new URL(n.getAttribute(a)!, location.href))
              .filter(u => u.pathname === p).map(u => u.pathname + u.search), [selector, attribute, pathname]);
          // Every route (Home, index, calm and the 404) loads the build-processed landscape asset through one marked ordinary
          // classic deferred <script>: no legacy duplicate, the companion -> landscape -> atmosphere order unchanged, and a real
          // same-origin hashed JS body. The Home-only marker distinguishes Home and must stay absent everywhere else (every
          // route's scene is data-mode="home" now, so Home itself is told apart by the scene's data-route).
          await expect(scene, `${path} every route emits Home's scene`).toHaveAttribute('data-mode', 'home');
          const isHomePage = (await scene.getAttribute('data-route')) === 'home';
          expect(await resources('script[src]', 'src', '/mountains/mountains.js'), `${path} no legacy landscape URL`).toEqual([]);
          const scripts = await page.evaluate(() => [...document.querySelectorAll<HTMLScriptElement>('head script[src]')].map(s => ({
            src: s.getAttribute('src')!, runtime: s.getAttribute('data-landscape-runtime'), home: s.getAttribute('data-home-runtime'),
            defer: s.hasAttribute('defer'), async: s.hasAttribute('async'), type: s.getAttribute('type'),
            origin: new URL(s.src, location.href).origin === location.origin,
          })));
          expect(scripts.map(s => s.runtime), `${path} exactly one marked landscape script`).toEqual([null, 'mountains', null]);
          expect(scripts.map(s => s.home), `${path} Home-only marker only on Home`).toEqual([null, isHomePage ? 'mountains' : null, null]);
          expect(scripts.map(s => s.src)[0], `${path} companion`).toBe('/companion.js');
          expect(scripts.map(s => s.src)[2], `${path} atmosphere`).toBe('/atmosphere.js');
          const generated = scripts[1];
          expect(generated.src, `${path} generated hashed landscape asset`).toMatch(/^\/[^?#]*[-.][A-Za-z0-9_-]{6,}\.js$/);
          expect(generated.origin, `${path} same origin`).toBe(true);
          expect([generated.defer, generated.async, generated.type], `${path} ordinary classic deferred script`).toEqual([true, false, null]);
          const response = await page.request.get(generated.src);
          expect(response.status(), `${path} generated asset is served`).toBe(200);
          const body = await response.text();
          expect(body.length, `${path} generated asset is the processed (smaller) build`).toBeGreaterThan(1000);
          expect(body.length, `${path} generated asset is not the original public script`).toBeLessThan(30000);
          expect(body, `${path} never instantiates a Web Worker`).not.toMatch(/new\s+Worker\s*\(/);
          expect(await page.evaluate(() => typeof (window as any).sonworkLandscape?.isActive), `${path} the landscape runtime connected`).toBe('function');
          await expect(scene).toHaveAttribute('aria-hidden', 'true');
          await expect(scene).toHaveAttribute('inert', '');
          expect(await scene.evaluate(el => ({ z: getComputedStyle(el).zIndex, p: getComputedStyle(el).pointerEvents, pos: getComputedStyle(el).position }))).toEqual({ z: '-1', p: 'none', pos: 'fixed' });
          await expect(scene.locator('path.mtn-rim'), `${path} original rim paths`).toHaveCount(6);
          await page.evaluate(() => document.fonts.ready);
          const hits = async (link: Locator) => {
            await link.scrollIntoViewIfNeeded();
            const box = (await link.boundingBox())!;
            return link.evaluate((el, [x, y]) => {
              const top = document.elementFromPoint(x, y);
              return top === el || el.contains(top);
            }, [box.x + box.width / 2, box.y + box.height / 2]);
          };
          // A visible link inside main is the content check; nav links are the fallback only where main has none.
          const inMain = page.locator('main a[href]:visible').first();
          const content = (await inMain.count()) > 0 ? inMain : page.locator('.site-nav ul a:visible').first();
          expect(await hits(content), `${path} content link hit test`).toBe(true);
          expect(await hits(page.locator('.site-nav .wordmark')), `${path} wordmark hit test`).toBe(true);
        }
        await page.goto('/');
        const build = page.locator('.build-entry h3 a').first();
        await build.scrollIntoViewIfNeeded();
        const box = (await build.boundingBox())!;
        expect(await build.evaluate((el, [x, y]) => document.elementFromPoint(x, y) === el, [box.x + box.width / 2, box.y + box.height / 2])).toBe(true);
      });
    }
  }
});

test('the Hermes note is exact on Home and About, and nowhere else', async ({ browser, baseURL }) => {
  for (const options of [desktop, touch]) {
    await open(browser, baseURL, options, async page => {
      for (const path of ['/', '/about/']) {
        await page.goto(path);
        const note = page.locator('.hermes-note');
        await expect(note).toHaveCount(1);
        await expect(note).toHaveText(hermes);
        await expect(note.locator('a')).toHaveAttribute('href', 'https://hermes-agent.nousresearch.com/docs/');
      }
      for (const path of ['/work/', '/writing/', '/subscribe/']) {
        await page.goto(path);
        await expect(page.locator('.hermes-note')).toHaveCount(0);
      }
      await page.goto('/about/');
      await expect(page.locator('.prose a[href="/work"]')).toHaveText('Build');
    });
  }
});

test('the Hermes link has a centred 44px target that hit-tests to the same anchor', async ({ browser, baseURL }) => {
  for (const options of [desktop, touch]) {
    await open(browser, baseURL, options, async page => {
      for (const path of ['/', '/about/']) {
        await page.goto(path);
        const link = page.locator('.hermes-note a');
        await link.scrollIntoViewIfNeeded();
        await expect(link).toHaveCSS('position', 'relative');
        const result = await link.evaluate(el => {
          const after = getComputedStyle(el, '::after');
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const hit = (y: number) => document.elementFromPoint(x, y) === el;
          return { position: after.position, height: parseFloat(after.height), glyphHeight: r.height, above: hit(cy - 20), below: hit(cy + 20), centre: hit(cy), beyond: hit(cy + 30) };
        });
        expect(result.position).toBe('absolute');
        expect(result.height).toBe(44);
        expect(result.glyphHeight).toBeLessThan(44);
        expect(result.centre && result.above && result.below, `${path} expanded target hits the Hermes anchor`).toBe(true);
        expect(result.beyond, `${path} target stops at 44px`).toBe(false);
      }
    });
  }
});

test('Mount looks toward a fine pointer with real signed eye and tilt values', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/');
    const mount = page.locator('.companion');
    const centre = (await mount.boundingBox())!;
    const cx = centre.x + centre.width / 2;
    const look = () => mount.evaluate(el => ['x', 'y', 'r'].map(k => parseFloat(el.style.getPropertyValue(`--look-${k}`))));
    // Moves keep cancelling the pending first stroll; gaze starts once the greeting is out of the way.
    let wiggle = 0;
    await expect.poll(async () => {
      await page.mouse.move(cx + 700 + (wiggle++ % 2), 800);
      return mount.getAttribute('data-look');
    }, { timeout: 6000 }).toBe('true');
    const right = await look();
    expect(right[0]).toBeGreaterThan(1);
    expect(right[1]).toBeGreaterThan(0.5);
    expect(right[2]).toBeGreaterThan(0.2);
    await expect.poll(async () => {
      await page.mouse.move(Math.max(1, cx - 500 - (wiggle++ % 2)), 800);
      return (await look())[0];
    }, { timeout: 4000 }).toBeLessThan(-1);
    expect((await look())[2]).toBeLessThan(-0.2);
    await page.mouse.down();
    await expect(mount).not.toHaveAttribute('data-look', 'true');
    expect(await mount.evaluate(el => el.style.getPropertyValue('--look-x'))).toBe('');
    await page.mouse.up();
  });
});

test('the index route draws its rim in once, then takes no mouse depth: its sky is Home\'s, so terrain never follows the pointer', async ({ browser, baseURL }) => {
  // The whole-scene mouse depth of the old index route is retired (one sky, Son-approved 2026-11-03); the first-arrival rim
  // draw-in stays on index routes, and Home's own sky-only response is the next test.
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/work');
    const scene = page.locator('.mtn-scene');
    await expect(scene).toHaveAttribute('data-intro', '');
    expect(await scene.locator('.mtn-rim').first().getAttribute('pathLength')).toBe('1');
    await expect(scene).not.toHaveAttribute('data-intro', /.*/, { timeout: 3000 });
    expect(await scene.locator('.mtn-rim').first().getAttribute('pathLength')).toBeNull();

    const layers = () => scene.evaluate(el => ['.mtn-far', '.mtn-middle', '.mtn-near'].map(sel => getComputedStyle(el.querySelector(`:scope > ${sel}`)!).transform));
    const cameraKeys = () => scene.evaluate(el => ['fx', 'fy', 'nx', 'ny'].map(k => el.style.getPropertyValue(`--mtn-${k}`)));
    const rest = await layers();
    const frames = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    for (const [x, y] of [[1439, 899], [1, 1], [720, 450]]) {
      await page.mouse.move(x, y);
      await frames();
      await expect(scene).not.toHaveAttribute('data-cam', /.*/);
      expect(await cameraKeys(), `no terrain camera at (${x}, ${y})`).toEqual(['', '', '', '']);
      expect(await layers(), `terrain stays put at (${x}, ${y})`).toEqual(rest);
    }

    await page.mouse.wheel(0, 120);
    await expect(scene).not.toHaveAttribute('data-cam', /.*/);
    expect(await cameraKeys()).toEqual(['', '', '', '']);
  });
});

// Home is a static world: the pointer moves no terrain and no body, and writes no data-look, --ow-x/--ow-y or --mtn camera key.
// The only thing a fine mouse produces is the small inert decorative star, shown strictly over genuine open sky. Producer
// semantics (public/mountains/mountains.js placeStar): the first coalesced pointer frame after a cancel or scroll only records an
// anchor, a later frame >= 6px away shows the star, and a scroll holds it off for a quiet moment and needs fresh travel again.
test('Home mouse takes no scene, terrain or body depth: only the decorative star answers in open sky, and scroll and held input clean it up', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
    await page.bringToFront();
    const scene = page.locator('.mtn-scene');
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), 'this context is a real fine pointer').toBe(true);
    await expect(scene).toHaveAttribute('data-arrival', 'static');
    await expect(scene).not.toHaveAttribute('data-intro', /.*/);
    expect(await scene.locator('.mtn-rim[pathLength]').count()).toBe(0);
    const frames = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const starOn = () => page.evaluate(() => !!document.querySelector('.ow-star[data-on]'));
    // Complete static paint: every visible body image (rect, filter, opacity, href), the planet backing, the far ridge, and
    // every attribute the retired pointer and camera paths used to write.
    const paint = () => page.evaluate(() => {
      const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
      const read = (sel: string) => Array.from(root.querySelectorAll(sel)).filter(el => el.getClientRects().length > 0).map(el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return { rect: [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100), filter: s.filter, opacity: s.opacity, href: el.getAttribute('href') };
      });
      const sky = root.querySelector('.sv-home-sky') as SVGGElement;
      return {
        planet: read('.sv-hs-planet > .sv-ow-pimg image'), backing: read('.sv-hs-planet > .sv-hs-body'),
        a: read('.sv-ow-a image'), b: read('.sv-ow-b image'), c: read('.sv-ow-c image'), ridge: read('.mtn-wide #sv-surface-far-wide'),
        retired: {
          look: document.querySelectorAll('.sv-home-sky[data-look]').length, cam: root.hasAttribute('data-cam'),
          ox: sky.style.getPropertyValue('--ow-x'), oy: sky.style.getPropertyValue('--ow-y'),
          camera: ['fx', 'fy', 'nx', 'ny'].map(k => (root as HTMLElement).style.getPropertyValue(`--mtn-${k}`)),
        },
      };
    });
    // An independently measured, nonvacuous open-sky target (not in a glyph, control, header, visible body or sun, padded).
    const target = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
      const boxes: number[][] = [];
      const add = (r: DOMRect, pad: number) => { if (r.width || r.height) boxes.push([r.left - pad, r.top - pad, r.right + pad, r.bottom + pad]); };
      for (const el of Array.from(root.querySelectorAll('.sv-hs-planet > .sv-hs-body, .sv-hs-planet > .sv-ow-pimg image, .sv-ow-a image, .sv-ow-b image, .sv-ow-c image, .sv-hs-sun circle'))) {
        if (el.getClientRects().length > 0) add(el.getBoundingClientRect(), 40);
      }
      for (const el of Array.from(document.querySelectorAll('a[href], button, summary, input, .companion'))) add(el.getBoundingClientRect(), 28);
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent!.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const g of Array.from(range.getClientRects())) add(g, 28);
      }
      for (let y = Math.ceil(header + 20); y <= Math.min(innerHeight * 0.45, header + 220); y += 12) {
        for (let x = 28; x <= innerWidth - 28; x += 16) {
          if (!boxes.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) return [x, y];
        }
      }
      return null;
    });
    expect(target, 'a genuinely open-sky target exists').not.toBeNull();
    const [tx, ty] = target!;
    const before = await paint();
    for (const key of ['planet', 'backing', 'a', 'b', 'c', 'ridge'] as const) expect(before[key].length, `${key} is painted (no empty-selector pass)`).toBeGreaterThan(0);
    expect(before.retired).toEqual({ look: 0, cam: false, ox: '', oy: '', camera: ['', '', '', ''] });
    const arm = () => expect.poll(async () => {
      await page.mouse.move(tx, ty);
      await frames();
      await page.mouse.move(tx + 8, ty + 8);
      await frames();
      return starOn();
    }, { timeout: 4000 }).toBe(true);
    await arm();
    expect(await page.evaluate(() => { const s = document.querySelector('.ow-star')!; return [s.getAttribute('aria-hidden'), s.hasAttribute('inert'), getComputedStyle(s).pointerEvents]; })).toEqual(['true', true, 'none']);
    expect(await paint(), 'terrain, bodies and every retired attribute are unchanged while the star is visible').toEqual(before);
    await expect(scene).not.toHaveAttribute('data-cam', /.*/);
    // Native scroll cancels at once; the static sky is exactly as before, and one pixel of jitter cannot flash the star back.
    await page.mouse.wheel(0, 120);
    await expect(page.locator('.ow-star[data-on]')).toHaveCount(0);
    await page.mouse.move(tx + 9, ty + 9);
    await frames();
    expect(await starOn(), 'no star during the scroll-idle gate or without fresh travel').toBe(false);
    await page.mouse.wheel(0, -120);
    await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 2000 }).toBe(0);
    expect(await paint()).toEqual(before);
    // Fresh eligible travel re-arms it; held input then cancels it and nothing about the scene changes.
    await arm();
    await page.mouse.down();
    await expect(page.locator('.ow-star[data-on]')).toHaveCount(0);
    await page.mouse.up();
    expect(await paint()).toEqual(before);
  });
});

test('Home keeps Mount at the header, its 68x44 target unchanged, and the native Back to top instant', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/');
    const mount = page.locator('.companion');
    await toBuilds(page);
    await page.waitForTimeout(600);
    await expect(mount).toHaveAttribute('data-perch', 'header');
    await expect(mount).not.toHaveAttribute('data-moving', /.*/);
    expect(await mount.getAttribute('data-strolls')).toBe('0');
    const box = (await mount.boundingBox())!;
    expect(box.width).toBeCloseTo(68, 0);
    expect(box.height).toBeCloseTo(44, 0);
    await toBottom(page);
    await page.waitForTimeout(400);
    await expect(mount).toHaveAttribute('data-perch', 'header');
    const top = page.locator('#companion-return');
    await expect(top).toBeVisible();
    await top.click();
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 1000 }).toBe(0); // instant on Home
    await expect(mount).toBeFocused();
    await expect(mount).toHaveAttribute('data-perch', 'header');
  });
});

// The original perch travel (build seat is Home-specific and gone; the footer seat) stays on the index route /work.
test('Mount perches at the footer on an index route, and the native Back to top returns', async ({ browser, baseURL }) => {
  await open(browser, baseURL, desktop, async page => {
    await page.goto('/work');
    const mount = page.locator('.companion');
    await toBottom(page);
    await expect(mount).toHaveAttribute('data-perch', 'footer', { timeout: 5000 });
    await expect(mount).not.toHaveAttribute('data-moving', /.*/, { timeout: 3000 });
    const slot = (await page.locator('.footer-slot').boundingBox())!;
    const onSlot = (await mount.boundingBox())!;
    expect(slot.width).toBeCloseTo(68, 0);
    expect(slot.height).toBeCloseTo(44, 0);
    expect(onSlot.x).toBeCloseTo(slot.x, 0);
    expect(onSlot.y).toBeCloseTo(slot.y, 0);
    expect(onSlot.width).toBeCloseTo(68, 0);
    expect(onSlot.height).toBeCloseTo(44, 0);

    await mount.click();
    const top = page.locator('#companion-return');
    await expect(top).toBeVisible();
    await expect(top).toBeFocused();
    await top.click();
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBe(0);
    await expect(mount).toBeFocused();
    await expect(mount).toHaveAttribute('data-perch', 'header');
    await expect(top).toBeHidden();
  });
});

test('the Home build phrase is gone: nothing starts, settles or sweeps when the builds come into view', async ({ browser, baseURL }) => {
  for (const options of [desktop, touch]) {
    await open(browser, baseURL, options, async page => {
      await page.addInitScript(() => {
        const log = ((window as any).phrase = { go: 0, settle: 0, sweep: 0 });
        new MutationObserver(records => {
          for (const record of records) if ((record.target as Element).getAttribute('data-mtn') === 'go') log.go++;
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-mtn'] });
        document.addEventListener('animationstart', event => {
          if (event.animationName === 'mtn-settle') log.settle++;
          if (event.animationName === 'mtn-sweep') log.sweep++;
        });
      });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => (window as any).phrase.go)).toBe(0);
      await toBuilds(page);
      await page.waitForTimeout(1_500); // the old phrase started within 8s of arriving at the builds; give it ample time
      expect(await page.evaluate(() => (window as any).phrase)).toEqual({ go: 0, settle: 0, sweep: 0 });
      await expect(page.locator('.front-projects')).not.toHaveAttribute('data-mtn', /.*/);
      await expect(page.locator('.build-entry')).toHaveCount(3);
    });
  }
});

test('reduced motion keeps everything still, with Back to top still native', async ({ browser, baseURL }) => {
  await open(browser, baseURL, reduced, async page => {
    await page.goto('/');
    const scene = page.locator('.mtn-scene');
    await expect(scene).not.toHaveAttribute('data-intro', /.*/);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.mouse.move(100, 100);
    await page.mouse.move(1300, 800);
    await page.waitForTimeout(300);
    await expect(scene).not.toHaveAttribute('data-cam', /.*/);
    expect(await scene.evaluate(el => el.style.getPropertyValue('--mtn-fx'))).toBe('');
    await expect(page.locator('.companion')).not.toHaveAttribute('data-look', /.*/);
    await toBuilds(page);
    await page.waitForTimeout(400);
    await expect(page.locator('.companion')).toHaveAttribute('data-perch', 'header');
    await expect(page.locator('.front-projects')).not.toHaveAttribute('data-mtn', /.*/);
    await toBottom(page);
    await expect(page.locator('.companion')).toHaveAttribute('data-perch', 'header');
    await expect(page.locator('#companion-return')).toBeVisible();
    await page.locator('#companion-return').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });
});

test('coarse touch shows the tall composition, takes no mouse depth, star or gaze, and Mount stays at the header', async ({ browser, baseURL }) => {
  await open(browser, baseURL, touch, async page => {
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
    await expect(page.locator('.mtn-tall').first()).toBeVisible();
    await expect(page.locator('.mtn-wide').first()).toBeHidden();
    const scene = page.locator('.mtn-scene');
    await expect(scene).not.toHaveAttribute('data-intro', /.*/, { timeout: 3000 });
    await page.mouse.move(380, 830);
    await page.touchscreen.tap(200, 400);
    await page.waitForTimeout(300);
    await expect(scene).not.toHaveAttribute('data-cam', /.*/);
    expect(await scene.evaluate(el => el.style.getPropertyValue('--mtn-fx'))).toBe('');
    await expect(page.locator('.companion')).not.toHaveAttribute('data-look', /.*/);
    const mount = (await page.locator('.companion').boundingBox())!;
    expect(mount.width).toBeCloseTo(68, 0);
    expect(mount.height).toBeCloseTo(44, 0);
    await toBottom(page);
    await page.waitForTimeout(400);
    await expect(page.locator('.companion')).toHaveAttribute('data-perch', 'header'); // Home: no perch travel
    await expect(page.locator('#companion-return')).toBeVisible(); // the native Back to top stays reachable
    expect(await page.locator('.ow-star[data-on]').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test('without JavaScript the scene sits in its static pose and Mount and builds stay readable', async ({ browser, baseURL }) => {
  await open(browser, baseURL, noJs, async page => {
    await page.goto('/');
    const scene = page.locator('.mtn-scene');
    await expect(scene).toHaveCount(1);
    await expect(scene).not.toHaveAttribute('data-intro', /.*/);
    expect(await scene.locator('div.mtn-near').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).f)).toBeCloseTo((await page.evaluate(() => innerHeight)) * ((await page.evaluate(() => innerWidth)) >= 900 ? 0.38 : 0.46), 1); // approved desktop near rest 38svh, narrow 46svh
    expect(await scene.locator('div.mtn-far').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).f)).toBeCloseTo((await page.evaluate(() => innerHeight)) * 0.34, 1);
    await expect(page.locator('.companion')).toBeDisabled();
    await expect(page.locator('.build-entry')).toHaveCount(3);
    await expect(page.locator('.hermes-note')).toHaveText(hermes);
    await expect(page.locator('#companion-return')).toBeHidden();
  });
});

for (const width of [375, 901]) {
  test(`200% text at ${width}px keeps all four whole nav labels and the document inside the viewport`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { ...desktop, viewport: { width, height: 800 } }, async page => {
      for (const path of ['/', '/work/', '/work/trivia-hub/', '/writing/', '/about/', '/subscribe/']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // Snapshot every computed size BEFORE mutating, then double each one inline.
        const sizes = await page.evaluate(() => {
          const els = [document.body, ...document.body.querySelectorAll<HTMLElement>('*')];
          const before = els.map(el => parseFloat(getComputedStyle(el).fontSize));
          els.forEach((el, i) => (el as HTMLElement).style?.setProperty('font-size', `${before[i] * 2}px`, 'important'));
          return before;
        });
        await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
        const grown = await page.evaluate(() => {
          const els = [document.body, ...document.body.querySelectorAll<HTMLElement>('*')];
          const size = (el: Element | null) => (el ? els.indexOf(el as HTMLElement) : -1);
          const pick = [document.querySelector('main h1'), document.querySelector('main p')].map(el => ({ index: size(el), now: el ? parseFloat(getComputedStyle(el).fontSize) : 0 }));
          const nav = [...document.querySelectorAll<HTMLElement>('.site-nav li a')].map(a => {
            const r = a.getBoundingClientRect();
            return { text: a.textContent, left: r.left, right: r.right, whole: a.scrollWidth <= a.clientWidth + 1 };
          });
          return { pick, nav, docWidth: document.documentElement.scrollWidth, viewport: innerWidth };
        });
        for (const item of grown.pick) {
          expect(item.index, `${path} heading/paragraph present`).toBeGreaterThanOrEqual(0);
          expect(item.now, `${path} grew x2`).toBeCloseTo(sizes[item.index] * 2, 1);
        }
        expect(grown.docWidth, `${path} document width`).toBe(grown.viewport);
        expect(grown.nav.map(link => link.text)).toEqual(['Build', 'Writing', 'About', 'Subscribe']);
        for (const link of grown.nav) {
          expect(link.left, `${path} ${link.text} left`).toBeGreaterThanOrEqual(-0.5);
          expect(link.right, `${path} ${link.text} right`).toBeLessThanOrEqual(grown.viewport + 0.5);
          expect(link.whole, `${path} ${link.text} label whole`).toBe(true);
        }
      }
    });
  });
}

test('Home, Build and About load with no page errors, console errors or failed requests, and Subscribe stays disabled', async ({ browser, baseURL }) => {
  for (const options of [desktop, touch]) {
    await open(browser, baseURL, options, async page => {
      const problems: string[] = [];
      page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
      page.on('response', response => { if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`); });
      page.on('requestfailed', request => problems.push(`failed ${request.url()}`));
      for (const path of ['/', '/work/', '/about/']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(300);
      }
      await page.goto('/');
      await expect(page.locator('form.subscribe-form button[type="submit"]')).toBeDisabled();
      expect(problems).toEqual([]);
    });
  }
});

test('while signup is off, Subscribe is a plain nav item, and on its own page it is marked like any current item', async ({ browser, baseURL }) => {
  for (const colorScheme of ['dark', 'light'] as const) {
    await open(browser, baseURL, { ...desktop, colorScheme }, async page => {
      const nav = () => page.locator('.site-nav li a').evaluateAll(links => links.map(a => ({
        label: a.textContent?.trim(), current: a.getAttribute('aria-current') === 'page', color: getComputedStyle(a).color,
      })));
      await page.goto('/writing/');
      const writing = await nav();
      // Signup is off in every release build, so nothing carries the accent: Subscribe takes the same ink-2 as Build and About.
      const plain = writing.filter(link => !link.current);
      expect(plain.map(link => link.label), `${colorScheme} unmarked items on /writing`).toEqual(['Build', 'About', 'Subscribe']);
      expect(new Set(plain.map(link => link.color)).size, `${colorScheme} one colour for unmarked items ${JSON.stringify(plain)}`).toBe(1);
      await expect(page.locator('.site-nav li.nav-accent')).toHaveCount(0);
      await page.goto('/subscribe/');
      const current = (await nav()).filter(link => link.current);
      expect(current.map(link => link.label), `${colorScheme} current item on /subscribe`).toEqual(['Subscribe']);
      expect(current[0].color, `${colorScheme} Subscribe is marked like Writing on its own page`).toBe(writing.find(link => link.current)?.color);
    });
  }
});
