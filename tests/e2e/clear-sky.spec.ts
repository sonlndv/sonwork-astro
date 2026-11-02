import { expect, test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';

// Clear-sky Home revision. Explicit contexts below set the input model; a mobile-sized viewport is not
// automatically a fine-hover mouse, so every pointer case asserts the media query first.
const base: BrowserContextOptions = {
  viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false,
  reducedMotion: 'no-preference', colorScheme: 'light',
};
const phone: BrowserContextOptions = {
  viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
  reducedMotion: 'no-preference', colorScheme: 'light',
};

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'each case builds its own explicit context');
});

async function open(browser: Browser, options: BrowserContextOptions, path = '/', theme?: 'light' | 'dark') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  if (theme) await page.addInitScript(value => localStorage.setItem('theme', value), theme);
  await page.goto(path);
  await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
  return { context, page };
}

const shown = (page: Page, selector: string) =>
  page.evaluate(sel => Array.from(document.querySelectorAll(sel)).some(el => el.getClientRects().length > 0), selector);

// Used (resolved) transforms of the three outer layers: the actual painted pose, independent of how CSS serializes variables.
const pose = (page: Page) => page.evaluate(() =>
  ['.mtn-far', '.mtn-middle', '.mtn-near'].map(sel => getComputedStyle(document.querySelector(`.mtn-scene > ${sel}`)!).transform));

test('Home light has no clouds, wisps, cast shadows or mist (manual and system light)', async ({ browser }) => {
  for (const theme of ['light', undefined] as const) {
    const { context, page } = await open(browser, base, '/', theme);
    for (const sel of ['.sv-hs-clouds', '.sv-hs-cloud-far', '.sv-hs-cloud-near', '.sv-cloud-surface', '.mtn-mist']) {
      expect(await shown(page, `.mtn-scene[data-mode='home'] ${sel}`), `${sel} (${theme ?? 'system'})`).toBe(false);
    }
    expect(await shown(page, '.mtn-scene[data-mode="home"] .sv-hs-sun')).toBe(true);
    expect(await shown(page, '.mtn-scene[data-mode="home"] .sv-hs-planet')).toBe(true);
    await context.close();
  }
});

test('Home scene is stable under native scroll and Mount keeps its header seat', async ({ browser }) => {
  const { context, page } = await open(browser, base, '/', 'dark');
  const snapshot = () => page.evaluate(() => {
    const scene = document.querySelector('.mtn-scene') as HTMLElement;
    const style = getComputedStyle(scene);
    const rect = (document.querySelector('.companion') as HTMLElement).getBoundingClientRect();
    return {
      inline: scene.getAttribute('style'), progress: scene.dataset.progress,
      scene: style.getPropertyValue('--sv-scene'), depth: style.getPropertyValue('--sv-depth'),
      far: getComputedStyle(scene.querySelector('.mtn-far')!).transform,
      near: getComputedStyle(scene.querySelector('.mtn-near')!).transform,
      mount: [rect.left, rect.top, rect.width, rect.height].map(Math.round),
      perch: (document.querySelector('.companion') as HTMLElement).dataset.perch,
    };
  });
  const before = await snapshot();
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120); }
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(400);
  expect(await snapshot()).toEqual(before);
  expect(before.perch).toBe('header');
  expect(before.mount.slice(2)).toEqual([68, 44]);
  await context.close();
});

test('only celestial art answers a fine mouse, within 2px by 1px, and every cancel is immediate', async ({ browser }) => {
  const { context, page } = await open(browser, base, '/', 'dark');
  expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
  await page.waitForSelector('.mtn-scene[data-sky="full"]');
  const star = page.locator('.mtn-wide .sv-hs-full circle').first();
  const ridge = page.locator('.mtn-wide #sv-surface-far-wide');
  const read = async () => ({ star: await star.boundingBox(), ridge: await ridge.boundingBox() });
  const rest = await read();
  await page.mouse.move(40, 40);
  await page.mouse.move(60, 50);
  await page.waitForSelector('.sv-home-sky[data-look]');
  await page.waitForTimeout(450); // let the one finite transition settle
  const moved = await read();
  const dx = Math.abs(moved.star!.x - rest.star!.x), dy = Math.abs(moved.star!.y - rest.star!.y);
  expect(dx).toBeGreaterThan(0.2);
  expect(dx).toBeLessThanOrEqual(2.05);
  expect(dy).toBeLessThanOrEqual(1.05);
  expect(moved.ridge).toEqual(rest.ridge); // terrain never follows
  expect(await page.evaluate(() => document.querySelector('.mtn-scene')!.hasAttribute('data-cam'))).toBe(false);
  // Native scroll cancels at once and nothing replays.
  await page.mouse.wheel(0, 300);
  await expect(page.locator('.sv-home-sky[data-look]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('.sv-home-sky')!.style.getPropertyValue('--ow-x'))).toBe('');
  // Held input cancels too.
  await page.mouse.move(300, 300);
  await page.waitForSelector('.sv-home-sky[data-look]');
  await page.mouse.down();
  await expect(page.locator('.sv-home-sky[data-look]')).toHaveCount(0);
  await page.mouse.up();
  await context.close();
});

test('reduced motion and coarse input never move the sky', async ({ browser }) => {
  const reduced = await open(browser, { ...base, reducedMotion: 'reduce' }, '/', 'dark');
  await reduced.page.mouse.move(80, 80);
  await reduced.page.mouse.move(120, 90);
  await reduced.page.waitForTimeout(300);
  await expect(reduced.page.locator('.sv-home-sky[data-look]')).toHaveCount(0);
  const entry = await open(browser, base, '/', 'dark');
  expect(await pose(reduced.page)).toEqual(await pose(entry.page));
  await entry.context.close();
  await reduced.context.close();

  const touch = await open(browser, phone, '/', 'dark');
  expect(await touch.page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
  await touch.page.mouse.move(100, 100);
  await touch.page.mouse.move(160, 140);
  await touch.page.waitForTimeout(300);
  await expect(touch.page.locator('.sv-home-sky[data-look]')).toHaveCount(0);
  await touch.context.close();
});

test('Mount fits its 68x44 target at 44px, keeps the header height and Back to top is instant', async ({ browser }) => {
  const home = await open(browser, phone, '/', 'dark');
  const about = await open(browser, phone, '/about', 'dark');
  const header = (page: Page) => page.locator('.site-header').evaluate(el => Math.round(el.getBoundingClientRect().height));
  expect(await header(home.page)).toBe(await header(about.page));
  const art = await home.page.locator('.companion svg').boundingBox();
  const target = await home.page.locator('.companion').boundingBox();
  expect(art!.width).toBeCloseTo(44, 0);
  expect(art!.height).toBeCloseTo(44, 0);
  expect(art!.x + art!.width).toBeLessThanOrEqual(target!.x + target!.width + 0.5);
  expect(target!.height).toBeCloseTo(44, 0);
  expect(await about.page.locator('.companion svg').boundingBox().then(box => Math.round(box!.width))).toBe(38);
  await home.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const top = home.page.locator('.footer-top');
  await expect(top).toBeVisible();
  await top.click();
  await expect.poll(() => home.page.evaluate(() => scrollY), { timeout: 400 }).toBe(0);
  expect(await home.page.locator('.companion').getAttribute('data-perch')).toBe('header');
  await home.context.close();
  await about.context.close();
});

test('no-JS Home is clear and fixed; other routes keep their incumbent day sky', async ({ browser }) => {
  const plain = await browser.newContext({ ...base, javaScriptEnabled: false });
  const page = await plain.newPage();
  await page.goto('/');
  expect(await shown(page, '.sv-hs-clouds')).toBe(false);
  expect(await shown(page, '.sv-cloud-surface')).toBe(false);
  // Same entry pose as the scripted page: compare the used layer transforms, not custom-property text.
  const normal = await open(browser, base, '/', 'light');
  expect(await pose(page)).toEqual(await pose(normal.page));
  await normal.context.close();
  await plain.close();

  for (const route of ['/about', '/work']) {
    const { context, page: other } = await open(browser, base, route, 'light');
    expect(await shown(other, '.sv-hs-clouds'), route).toBe(true);
    expect(await shown(other, '.sv-hs-planet'), route).toBe(false);
    expect(await shown(other, '.sv-ow-bodies'), route).toBe(false);
    await context.close();
  }
});

test('Home night catalogue is visibly fuller than the incumbent route and other routes keep their math', async ({ browser }) => {
  const stars = async (path: string) => {
    const { context, page } = await open(browser, base, path, 'dark');
    await page.waitForSelector('.mtn-scene[data-sky="full"]');
    const values = await page.evaluate(() => Array.from(document.querySelectorAll('.mtn-wide .sv-hs-full circle'), c => [Number(c.getAttribute('r')), Number(c.getAttribute('opacity'))]));
    await context.close();
    return values;
  };
  const home = await stars('/');
  const about = await stars('/about');
  expect(home.length).toBeLessThanOrEqual(600);
  expect(Math.min(...home.map(v => v[0]))).toBeGreaterThanOrEqual(0.85);
  expect(Math.min(...home.map(v => v[1]))).toBeGreaterThanOrEqual(0.3);
  expect(Math.max(...home.map(v => v[0]))).toBeLessThanOrEqual(2.6);
  expect(Math.min(...about.map(v => v[0]))).toBeLessThan(0.85);
  expect(Math.min(...about.map(v => v[1]))).toBeLessThan(0.2);
});

// ---- Overhead sky: large, intentionally cropped, pre-shaded bodies (DESIGN.md "Superseding addendum") ----
// Producer shapes: the planet is `.sv-hs-planet > .sv-ow-pimg` holding `image.sv-ow-pm` (morning) and `image.sv-ow-pn`
// (night); bodies A and B are `.sv-ow-a` / `.sv-ow-b` holding the same pair. The original raster `.sv-hs-planet > image`
// stays in the markup for other routes and must not paint on Home.
type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Phase = { lit: number; unlit: number; litCount: number; unlitCount: number; minUnlitAlpha: number };
type Skies = {
  planet: { classes: string[]; box: Box | null; href: string | null; phase: Phase | null };
  a: { classes: string[]; box: Box | null; href: string | null; phase: Phase | null };
  b: { classes: string[]; box: Box | null; href: string | null; phase: Phase | null };
  original: number; header: number; width: number; height: number;
  scrollWidth: number; clientWidth: number;
  canvas: { content: string; position: string; left: string; right: string; mask: string; alpha: number };
  strips: string[];
};

const skies = (page: Page, light: boolean) => page.evaluate(async (isLight): Promise<Skies> => {
  const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
  const shown = (sel: string) => Array.from(root.querySelectorAll<SVGImageElement>(sel)).filter(node => node.getClientRects().length > 0);
  const toBox = (el: Element): Box => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  // Light direction used by render-spheres.mjs: upper-left in the morning, lower-left at night.
  const dir = isLight ? [-0.7071, -0.7071] : [-0.7926, 0.6097];
  const decode = async (href: string): Promise<Phase> => {
    const img = new Image();
    img.src = href;
    await img.decode();
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let lit = 0, unlit = 0, litCount = 0, unlitCount = 0, minUnlitAlpha = 255;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = (i + 0.5 - size / 2) / (size / 2 - 2), y = (j + 0.5 - size / 2) / (size / 2 - 2);
      if (Math.hypot(x, y) > 0.92) continue;
      const toward = x * dir[0] + y * dir[1], o = (j * size + i) * 4;
      const luma = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      if (toward > 0.55) { lit += luma; litCount += 1; }
      else if (toward < -0.35) { unlit += luma; unlitCount += 1; minUnlitAlpha = Math.min(minUnlitAlpha, data[o + 3]); }
    }
    return { lit: lit / Math.max(1, litCount), unlit: unlit / Math.max(1, unlitCount), litCount, unlitCount, minUnlitAlpha };
  };
  const body = async (sel: string) => {
    const images = shown(sel);
    return {
      classes: images.map(node => node.getAttribute('class') || ''),
      box: images.length ? toBox(images[0]) : null,
      href: images.length ? images[0].getAttribute('href') : null,
      phase: images.length ? await decode(images[0].getAttribute('href')!) : null,
    };
  };
  const front = document.querySelector('.front')!;
  const style = getComputedStyle(front, '::before');
  const alphaOf = (color: string) => {
    const slash = /\/\s*([\d.]+)\s*\)/.exec(color), comma = /rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(color);
    return slash ? Number(slash[1]) : comma ? Number(comma[1]) : 1;
  };
  return {
    planet: await body('.sv-hs-planet > .sv-ow-pimg image'), a: await body('.sv-ow-a image'), b: await body('.sv-ow-b image'),
    original: shown('.sv-hs-planet > image').length,
    header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
    width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
    canvas: { content: style.content, position: style.position, left: style.left, right: style.right, mask: style.maskImage || style.webkitMaskImage, alpha: alphaOf(style.backgroundColor) },
    strips: ['.home-intro', '.hermes-note', '.home-build', '.home-more', '.front-projects', '.front-contact', '.front-newsletter']
      .map(sel => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)!, '::before').content : 'missing')),
  };
}, light);

const sizes: [number, number][] = [
  [320, 812], [360, 780], [375, 812], [402, 681], [500, 900], [719, 1000], [720, 1024], [768, 1024], [899, 1000],
  [900, 700], [1024, 768], [1024, 1366], [1199, 800], [1200, 800], [1359, 900], [1360, 900], [1440, 900], [1440, 1200],
];
const diameterFloor = (w: number) => (w < 720 ? 240 : w < 900 ? 176 : w < 1200 ? 216 : 590);

async function openWatched(browser: Browser, options: BrowserContextOptions, theme?: 'light' | 'dark') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const failed: string[] = [], statuses: number[] = [];
  page.on('requestfailed', request => { if (request.url().includes('/mountains/ow-')) failed.push(request.url()); });
  page.on('response', response => { if (response.url().includes('/mountains/ow-')) statuses.push(response.status()); });
  if (theme) await page.addInitScript(value => localStorage.setItem('theme', value), theme);
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
  return { context, page, failed, statuses };
}

for (const [width, height] of sizes) {
  for (const theme of ['light', 'dark'] as const) {
    test(`pre-shaded phased bodies are large, cropped, opaque and overflow-free at ${width}x${height} (${theme})`, async ({ browser }) => {
      const touch = width < 900;
      const { context, page, failed, statuses } = await openWatched(
        browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: theme }, theme);
      const r = await skies(page, theme === 'light');
      const material = theme === 'light' ? 'sv-ow-pm' : 'sv-ow-pn';
      // Exactly one correct theme material per visible body, and the original full raster never paints on Home.
      expect(r.planet.classes, 'planet material').toEqual([material]);
      expect(r.a.classes, 'A material').toEqual([material]);
      expect(r.original, 'original raster hidden on Home').toBe(0);
      const portraitPhone = width < 720 && height > width;
      if (portraitPhone) expect(r.b.classes, 'B is omitted on phones').toEqual([]); else expect(r.b.classes, 'B material').toEqual([material]);
      // Real decoded assets, no failed requests.
      expect(failed, 'no failed sky asset request').toEqual([]);
      expect(statuses.length, 'sky assets were requested').toBeGreaterThanOrEqual(2);
      expect(statuses.every(status => status === 200), `sky asset statuses ${statuses}`).toBe(true);
      // A substantial primary body that is intentionally cropped by the top or right edge, never contained whole.
      const p = r.planet.box!;
      expect(Math.min(p.width, p.height), 'primary apparent diameter').toBeGreaterThanOrEqual(diameterFloor(width));
      expect(p.right > r.width || p.top < 0, 'primary body is cropped by the top or right edge').toBe(true);
      expect(r.planet.phase!.litCount, 'lit samples').toBeGreaterThan(50);
      expect(r.planet.phase!.unlitCount, 'unlit samples').toBeGreaterThan(50);
      for (const [name, body] of [['planet', r.planet], ['A', r.a]] as const) {
        const ph = body.phase!;
        expect(ph.minUnlitAlpha, `${name} unlit hemisphere is opaque`).toBe(255);
        expect(ph.lit, `${name} directional lit vs unlit material`).toBeGreaterThan(ph.unlit * 1.5 + 8);
        if (theme === 'dark') expect(ph.unlit, `${name} night unlit side is dark`).toBeLessThan(30);
      }
      if (portraitPhone) expect(r.a.box!.left, 'phone A is cropped by the left edge').toBeLessThan(0);
      // No new horizontal overflow, one real canvas, no per-paragraph strips.
      expect(r.scrollWidth, 'document does not overflow horizontally').toBeLessThanOrEqual(r.clientWidth);
      expect(r.canvas.content).not.toBe('none');
      expect(r.canvas.position).toBe('absolute');
      expect(r.canvas.left).toBe('0px');
      expect(r.canvas.right).toBe('0px');
      expect(r.canvas.mask).toContain('linear-gradient');
      if (theme === 'light') expect(r.canvas.alpha, 'morning canvas stays robust').toBeGreaterThan(0.7);
      else expect(r.canvas.alpha, 'night canvas is materially lighter').toBeLessThan(0.4);
      expect(r.strips.length).toBeGreaterThan(0);
      for (const content of r.strips) expect(content, 'no individual reading strip').not.toMatch(/^"/);
      await context.close();
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`Home sky and canvas stay constant through native wheel 0-400 and back (${theme})`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...phone, colorScheme: theme }, '/', theme);
    const snap = () => page.evaluate(() => {
      const scene = document.querySelector('.mtn-scene')!;
      const img = Array.from(scene.querySelectorAll('.sv-ow-pimg image')).filter(node => node.getClientRects().length > 0);
      const r = img[0].getBoundingClientRect();
      const glyphs: number[] = [];
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent!.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const g of Array.from(range.getClientRects())) if (g.bottom > 98 && g.top < innerHeight) glyphs.push(g.top);
      }
      return {
        count: img.length, style: scene.getAttribute('style'), progress: scene.getAttribute('data-progress'),
        layers: ['.mtn-far', '.mtn-middle', '.mtn-near'].map(sel => getComputedStyle(scene.querySelector(`:scope > ${sel}`)!).transform),
        planet: [r.left, r.top, r.width].map(Math.round),
        canvas: getComputedStyle(document.querySelector('.front')!, '::before').backgroundColor,
        scrollY: Math.round(scrollY), visibleGlyphs: glyphs.length,
      };
    });
    const start = await snap();
    expect(start.count).toBe(1);
    expect(start.visibleGlyphs, 'text is visible at the opening').toBeGreaterThan(0);
    const same = (s: Awaited<ReturnType<typeof snap>>) => ({ ...s, scrollY: 0, visibleGlyphs: 0 });
    let target = 0;
    for (const delta of [60, 60, 60, 60, 60, 100]) {
      target += delta;
      await page.mouse.wheel(0, delta);
      await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 2000 }).toBeGreaterThanOrEqual(target - 2);
      const s = await snap();
      expect(same(s), `scenic state at ${target}`).toEqual(same(start));
      expect(s.visibleGlyphs, `text stays visible at ${target}`).toBeGreaterThan(0);
    }
    for (const delta of [-100, -60, -60, -60, -60, -60]) {
      target += delta;
      await page.mouse.wheel(0, delta);
      await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 2000 }).toBeLessThanOrEqual(target + 2);
      expect(same(await snap()), `scenic state at ${target} (reverse)`).toEqual(same(start));
    }
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(0);
    await context.close();
  });
}

test('system light and dark, reduced motion and forced colours keep one correct pre-shaded family', async ({ browser }) => {
  for (const [label, extra, light] of [
    ['system light', { colorScheme: 'light' as const }, true], ['system dark', { colorScheme: 'dark' as const }, false],
    ['reduced light', { reducedMotion: 'reduce' as const, colorScheme: 'light' as const }, true],
    ['reduced dark', { reducedMotion: 'reduce' as const, colorScheme: 'dark' as const }, false],
  ] as const) {
    const { context, page } = await open(browser, { ...phone, ...extra }, '/');
    const r = await skies(page, light);
    expect(r.planet.classes, label).toEqual([light ? 'sv-ow-pm' : 'sv-ow-pn']);
    expect(r.original, label).toBe(0);
    expect(r.planet.box!.width, label).toBeGreaterThanOrEqual(240);
    expect(r.scrollWidth, label).toBeLessThanOrEqual(r.clientWidth);
    await context.close();
  }
  const forced = await browser.newContext({ ...phone, forcedColors: 'active' });
  const forcedPage = await forced.newPage();
  await forcedPage.goto('/');
  expect(await forcedPage.evaluate(() => getComputedStyle(document.querySelector('.mtn-scene')!).display)).toBe('none');
  expect(await forcedPage.evaluate(() => getComputedStyle(document.querySelector('.front')!, '::before').display)).toBe('none');
  await forced.close();
});

test('no-JS Home is pre-shaded, bounded and overflow-free (synchronous diagnostics)', async ({ browser }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const plain = await browser.newContext({ ...base, viewport, javaScriptEnabled: false });
    const page = await plain.newPage();
    await page.goto('/');
    const r = await skies(page, true);
    expect(r.planet.classes, `no-JS ${viewport.width}`).toEqual(['sv-ow-pm']);
    expect(r.original).toBe(0);
    expect(r.planet.box!.width).toBeGreaterThanOrEqual(diameterFloor(viewport.width));
    expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
    await plain.close();
  }
});

test('200% text keeps the planet but drops the small bodies and overflows nothing', async ({ browser }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }]) {
    const { context, page } = await open(browser, { ...phone, viewport }, '/', 'light');
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.waitForFunction(() => document.querySelector('.mtn-scene')!.hasAttribute('data-big'));
    const r = await skies(page, true);
    expect(r.header).toBeGreaterThan(viewport.width < 720 ? 120 : 90);
    expect(r.planet.classes, 'planet is painted').toEqual(['sv-ow-pm']);
    expect(r.a.classes, 'A is hidden at 200%').toEqual([]);
    expect(r.b.classes, 'B is hidden at 200%').toEqual([]);
    expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
    await context.close();
  }
});

// The older tall-desktop planet rule (scale 1.03, translate -140px 85px) must not act on the nested pre-shaded image:
// its computed individual transforms are identity and its centre matches the opaque backing's centre.
for (const [width, height] of [[1280, 1280], [1440, 1200]] as const) {
  test(`nested planet image has identity transforms and shares the backing centre at ${width}x${height}`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...base, viewport: { width, height }, colorScheme: 'dark' }, '/', 'dark');
    const r = await page.evaluate(() => {
      const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
      const image = Array.from(root.querySelectorAll('.sv-hs-planet > .sv-ow-pimg image')).filter(node => node.getClientRects().length > 0);
      const body = Array.from(root.querySelectorAll('.sv-hs-planet > .sv-hs-body')).filter(node => node.getClientRects().length > 0);
      const centre = (el: Element) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
      const style = image.length ? getComputedStyle(image[0]) : null;
      return {
        images: image.length, bodies: body.length,
        scale: style?.scale, translate: style?.translate, rotate: style?.rotate,
        image: image.length ? centre(image[0]) : [0, 0], body: body.length ? centre(body[0]) : [0, 0],
      };
    });
    expect(r.images, 'one visible nested image').toBe(1);
    expect(r.bodies, 'one visible backing').toBe(1);
    expect(['none', '1', '1 1', '1 1 1']).toContain(r.scale);
    expect(['none', '0px', '0px 0px']).toContain(r.translate);
    expect(['none', '0deg']).toContain(r.rotate);
    expect(Math.abs(r.image[0] - r.body[0]), 'centre x').toBeLessThan(2);
    expect(Math.abs(r.image[1] - r.body[1]), 'centre y').toBeLessThan(2);
    await context.close();
  });
}

// Central companion .sv-ow-c (C9): a subordinate deeper-space body in the open sky between the heading glyphs and the
// primary body, shown only from 900px wide and 600px high at normal text; Home only.
for (const [width, height] of [[1440, 900], [1360, 900]] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`central companion sits in open sky at ${width}x${height} (${theme})`, async ({ browser }) => {
      const { context, page } = await open(browser, { ...base, viewport: { width, height }, colorScheme: theme }, '/', theme);
      const r = await page.evaluate(() => {
        const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
        const rect = (el: Element) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width }; };
        const visible = (sel: string) => Array.from(root.querySelectorAll(sel)).filter(node => node.getClientRects().length > 0);
        const c = visible('.sv-ow-c image');
        const glyphs: { left: number; top: number; right: number; bottom: number }[] = [];
        const title = document.getElementById('home-title');
        if (title) {
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const g of Array.from(range.getClientRects())) glyphs.push({ left: g.left, top: g.top, right: g.right, bottom: g.bottom });
          }
        }
        return {
          total: root.querySelectorAll('.sv-ow-c image').length, classes: c.map(node => node.getAttribute('class')),
          box: c.length ? rect(c[0]) : null,
          header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
          intro: document.querySelector('.home-intro')!.getBoundingClientRect().top,
          main: rect(visible('.sv-hs-planet > .sv-ow-pimg image')[0]),
          others: [...visible('.sv-hs-planet > .sv-ow-pimg image'),...visible('.sv-ow-a image'), ...visible('.sv-ow-b image')].map(rect),
          glyphs, viewport: innerWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(r.total, 'both variants carry a theme pair').toBeGreaterThanOrEqual(4);
      expect(r.classes, 'one active material').toEqual([theme === 'light' ? 'sv-ow-pm' : 'sv-ow-pn']);
      const b = r.box!;
      // A companion of the giant: separated from the primary's left limb, but close enough to read as related.
      const gap = r.main.left - b.right;
      expect(gap, 'clear sky between the companion and the primary body').toBeGreaterThanOrEqual(36);
      expect(gap, 'close enough to read as a companion of the primary body').toBeLessThanOrEqual(80);
      expect(b.width, 'subordinate size').toBeGreaterThan(98);
      expect(b.width, 'subordinate size').toBeLessThan(132);
      expect(b.top, 'clear of the header').toBeGreaterThanOrEqual(r.header + 12);
      expect(b.bottom, 'clear of the first prose').toBeLessThanOrEqual(r.intro - 16);
      expect(r.glyphs.length, 'heading text was measured').toBeGreaterThan(0);
      const apart = (x: { left: number; top: number; right: number; bottom: number }) => x.right <= b.left || x.left >= b.right || x.bottom <= b.top || x.top >= b.bottom;
      for (const g of r.glyphs) expect(apart(g), 'clear of the heading glyphs').toBe(true);
      expect(r.others.length, 'primary and rocky bodies are visible').toBeGreaterThanOrEqual(2);
      for (const o of r.others) expect(apart(o), 'separate from the other bodies').toBe(true);
      expect(r.overflow).toBeLessThanOrEqual(0);
      await context.close();
    });
  }
}

test('central companion is omitted where no sky gap exists, outside Home and at 200% text', async ({ browser }) => {
  for (const [width, height] of [[375, 812], [768, 1024], [899, 1000], [900, 700], [1280, 1280], [1359, 900], [1440, 500]] as const) {
    const touch = width < 900;
    const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: 'light' }, '/', 'light');
    expect(await shown(page, '.sv-ow-c'), `hidden at ${width}x${height}`).toBe(false);
    await context.close();
  }
  const about = await open(browser, base, '/about', 'light');
  expect(await shown(about.page, '.sv-ow-c')).toBe(false);
  await about.context.close();
  const { context, page } = await open(browser, { ...base, colorScheme: 'light' }, '/', 'light');
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.waitForFunction(() => document.querySelector('.mtn-scene')!.hasAttribute('data-big'));
  expect(await shown(page, '.sv-ow-c'), 'hidden at 200% text on a wide window').toBe(false);
  await context.close();
});

// ---- Pointer as a weak secondary star (Son chose "Both: subtle relighting and a small visible star") ----
// Producers: `div.ow-star[data-on]` (created by mountains.js on the first fine-mouse frame) and, per visible body image,
// `foreignObject.sv-ow-relight[data-body][data-on]` holding a canvas that is screen-blended over the pre-shaded image.
const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
};
const starState = (page: Page) => page.evaluate(() => {
  const star = document.querySelector('.ow-star');
  const box = star ? star.getBoundingClientRect() : null;
  const layers = Array.from(document.querySelectorAll('.sv-ow-relight')).filter(node => node.getClientRects().length > 0);
  return {
    present: !!star, on: !!star && star.hasAttribute('data-on'),
    centre: box ? [box.left + box.width / 2, box.top + box.height / 2] : null, width: box ? box.width : 0,
    aria: star ? star.getAttribute('aria-hidden') : null, inert: !!star && star.hasAttribute('inert'),
    events: star ? getComputedStyle(star).pointerEvents : null, position: star ? getComputedStyle(star).position : null,
    litLayers: layers.filter(node => node.hasAttribute('data-on')).length,
  };
});
const relit = (page: Page, body: string) => page.evaluate(label => {
  const fo = Array.from(document.querySelectorAll(`.sv-ow-relight[data-body="${label}"]`)).find(node => node.getClientRects().length > 0);
  if (!fo) return null;
  const canvas = fo.querySelector('canvas') as HTMLCanvasElement;
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0, sx = 0, max = 0;
  for (let j = 0; j < canvas.height; j++) for (let i = 0; i < canvas.width; i++) {
    const k = (j * canvas.width + i) * 4, v = (data[k] + data[k + 1] + data[k + 2]) * (data[k + 3] / 255);
    sum += v; sx += v * i; max = Math.max(max, data[k], data[k + 1], data[k + 2]);
  }
  return { sum, cx: sum ? sx / sum / canvas.width : 0.5, max, on: fo.hasAttribute('data-on') };
}, body);
const establish = async (page: Page, x: number, y: number) => {
  await expect.poll(async () => {
    await page.mouse.move(x, y);
    await page.mouse.move(x + 1, y + 1);
    return (await starState(page)).on;
  }, { timeout: 8000 }).toBe(true);
};
// Resolves after two real animation frames, so the coalesced pointer frame has run (no fixed sleep, no protocol timing).
const frames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const stable = (page: Page) => page.evaluate(() => {
  const scene = document.querySelector('.mtn-scene')!;
  const rect = (el: Element | null) => { const r = el ? el.getBoundingClientRect() : null; return r ? [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100) : null; };
  return {
    layers: ['.mtn-far', '.mtn-middle', '.mtn-near'].map(sel => getComputedStyle(scene.querySelector(`:scope > ${sel}`)!).transform),
    mount: rect(document.querySelector('.companion')), intro: rect(document.querySelector('.home-intro')), header: rect(document.querySelector('.site-header')),
  };
});

for (const theme of ['light', 'dark'] as const) {
  test(`a small drawn star follows the native mouse and relights the bodies (${theme})`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...base, colorScheme: theme }, '/', theme);
    const errors = watchErrors(page);
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
    const before = await stable(page);
    await establish(page, 700, 420);
    await page.mouse.move(760, 440);
    await frames(page);
    const s = await starState(page);
    expect(s.present && s.on, 'star is drawn').toBe(true);
    expect(Math.abs(s.centre![0] - 760), 'star x follows the pointer').toBeLessThan(1.5);
    expect(Math.abs(s.centre![1] - 440), 'star y follows the pointer').toBeLessThan(1.5);
    expect(s.width).toBeGreaterThanOrEqual(6);
    expect(s.width).toBeLessThanOrEqual(10);
    expect(s.aria).toBe('true');
    expect(s.inert).toBe(true);
    expect(s.events).toBe('none');
    expect(s.position).toBe('fixed');
    // Pixel-proven relight of the primary body: the lit side follows the pointer, and the contribution stays weak.
    const centre = await page.evaluate(() => {
      const img = Array.from(document.querySelectorAll('.sv-hs-planet > .sv-ow-pimg image')).find(node => node.getClientRects().length > 0)!;
      const r = img.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    const left = await expect.poll(async () => {
      await page.mouse.move(centre[0] - 330, centre[1] + 20);
      await page.mouse.move(centre[0] - 329, centre[1] + 21);
      const r = await relit(page, 'planet');
      return !!r && r.on && r.sum > 0;
    }, { timeout: 8000 }).toBe(true).then(() => relit(page, 'planet'));
    await page.mouse.move(Math.min(1435, centre[0] + 60), centre[1] + 300);
    await page.mouse.move(Math.min(1435, centre[0] + 61), centre[1] + 301);
    await frames(page);
    const right = await relit(page, 'planet');
    expect(left!.sum, 'relight has real pixels').toBeGreaterThan(0);
    expect(right!.sum, 'relight has real pixels on the other side').toBeGreaterThan(0);
    expect(left!.cx, 'the relit side moves with the pointer').toBeLessThan(right!.cx - 0.08);
    expect(left!.max, 'weak secondary star').toBeLessThanOrEqual(theme === 'light' ? 40 : 24);
    // No idle chase: the pixels do not change while the pointer rests.
    const rest = await relit(page, 'planet');
    await page.waitForTimeout(400);
    expect((await relit(page, 'planet'))!.sum).toBe(rest!.sum);
    // Terrain, Mount, content and header geometry are exactly as before.
    expect(await stable(page)).toEqual(before);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('every cancellation path removes the star and the relight at once and needs fresh mouse input', async ({ browser }) => {
  const { context, page } = await open(browser, { ...base, colorScheme: 'light' }, '/', 'light');
  const errors = watchErrors(page);
  const gone = async (label: string) => {
    await expect.poll(async () => { const s = await starState(page); return [s.on, s.litLayers]; }, { message: label, timeout: 2000 }).toEqual([false, 0]);
  };
  await establish(page, 640, 400);
  await page.mouse.wheel(0, 120);
  await gone('wheel');
  await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(0);
  // The generic held-button and held-key exercise runs in actual empty sky: a click at (640,400) would hit the real
  // <summary>What I'm exploring</summary>, whose keyboard-visible focus rightly keeps the pointer effects off (own test below).
  const SKY = [700, 110] as const;
  expect(await page.evaluate(([x, y]) => {
    for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
      if (el.matches('a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]')) return true;
    }
    return false;
  }, SKY), 'the fixture point has no interactive ancestor').toBe(false);
  await establish(page, ...SKY);
  await page.mouse.down();
  await gone('held pointer');
  await page.mouse.move(720, 122);
  await page.mouse.move(728, 128);
  await frames(page);
  expect(await starState(page), 'native mouse movement while the button is held stays off').toMatchObject({ on: false, litLayers: 0 });
  await page.mouse.up();
  await establish(page, ...SKY); // a fresh mouse after release works
  await page.keyboard.down('Shift');
  await gone('keyboard');
  await page.mouse.move(720, 122);
  await page.mouse.move(728, 128);
  await frames(page);
  expect(await starState(page), 'native mouse movement while a key is held stays off').toMatchObject({ on: false, litLayers: 0 });
  await page.keyboard.up('Shift');
  await establish(page, ...SKY); // the focused BODY/MAIN container no longer blocks fresh input
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); // synthetic blur event
  await gone('blur');
  await page.mouse.move(710, 118);
  await page.mouse.move(716, 122);
  await frames(page);
  expect(await starState(page), 'fresh mouse cannot rearm while the window is blurred').toMatchObject({ on: false, litLayers: 0 });
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); // synthetic focus restoration (not a real window focus)
  await establish(page, ...SKY); // then fresh native mouse input rearms
  await page.evaluate(() => document.documentElement.dispatchEvent(new Event('pointerleave'))); // leave from the re-armed state
  await gone('pointer leave (after refocus)');
  await establish(page, 640, 400);
  await page.evaluate(() => document.documentElement.dispatchEvent(new Event('pointerleave')));
  await gone('pointer leave');
  await establish(page, 640, 400);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await gone('theme change');
  await establish(page, 640, 400);
  await page.setViewportSize({ width: 1380, height: 900 });
  await gone('resize');
  await establish(page, 640, 400);
  await page.locator('.atmosphere-toggle').click(); // the real native Pause control (Playwright scrolls it into view)
  await gone('Pause');
  await page.mouse.move(650, 410);
  await page.mouse.move(655, 415);
  await page.waitForTimeout(300);
  expect((await starState(page)).on, 'Pause stays static under fresh mouse input').toBe(false);
  expect(errors).toEqual([]);
  await context.close();
});

test('Home-only baked textures are not fetched on other routes, and Home keeps real hrefs with or without JS', async ({ browser }) => {
  for (const route of ['/work', '/about']) {
    const context = await browser.newContext(base);
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', request => { if (/\/mountains\/ow-/.test(request.url())) requests.push(request.url()); });
    await page.goto(route);
    await page.waitForLoadState('load');
    expect(requests, `${route} requests no Home-only texture`).toEqual([]);
    const facts = await page.evaluate(() => ({
      inert: Array.from(document.querySelectorAll('image[data-home-src]')).map(node => node.hasAttribute('href')),
      withHref: document.querySelectorAll('image[href*="/mountains/ow-"]').length,
      landscape: document.querySelectorAll('.mtn-scene .mtn-lit').length,
    }));
    expect(facts.inert.length, 'all 16 hidden texture nodes remain, inert').toBe(16);
    expect(facts.inert.every(has => !has)).toBe(true);
    expect(facts.withHref).toBe(0);
    expect(facts.landscape, 'original landscape paths are intact').toBeGreaterThan(0);
    await expect(page.locator('main')).toBeVisible();
    await context.close();
  }
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ ...base, javaScriptEnabled });
    const page = await context.newPage();
    await page.goto('/');
    const facts = await page.evaluate(() => ({
      withHref: document.querySelectorAll('image[href*="/mountains/ow-"]').length,
      inert: document.querySelectorAll('image[data-home-src]').length,
    }));
    expect(facts.withHref, `Home keeps its real hrefs (JS ${javaScriptEnabled})`).toBe(16);
    expect(facts.inert).toBe(0);
    expect(await shown(page, '.sv-hs-planet > .sv-ow-pimg image'), `Home shows its baked planet (JS ${javaScriptEnabled})`).toBe(true);
    await context.close();
  }
});

test('a real control with keyboard-visible focus keeps the pointer star off until a fresh click in empty sky', async ({ browser }) => {
  const { context, page } = await open(browser, { ...base, colorScheme: 'light' }, '/', 'light');
  const errors = watchErrors(page);
  const focus = () => page.evaluate(() => ({ tag: document.activeElement ? document.activeElement.tagName : '', visible: !!document.activeElement && document.activeElement.matches(':focus-visible') }));
  await establish(page, 700, 110);
  expect(await focus(), 'armed with only the reading container focused').toMatchObject({ visible: false });
  const summary = page.locator('.home-build summary');
  await expect(summary).toBeVisible();
  await summary.click(); // native click on the actual "What I'm exploring" control
  await page.keyboard.press('Shift'); // native key press and release gives that control keyboard-visible focus
  expect(await focus(), 'the control now has keyboard-visible focus').toEqual({ tag: 'SUMMARY', visible: true });
  await page.mouse.move(700, 110);
  await page.mouse.move(712, 120);
  await frames(page);
  expect(await starState(page), 'fresh mouse stays off while the control has keyboard-visible focus').toMatchObject({ on: false, litLayers: 0 });
  await page.mouse.click(700, 110); // native click on empty sky moves focus off the control
  expect((await focus()).visible, 'no control keeps keyboard-visible focus').toBe(false);
  await establish(page, 700, 110); // fresh mouse movement rearms
  expect(errors).toEqual([]);
  await context.close();
});

test('the pointer star is absent for reduced motion, coarse input, other routes and no JS, and survives a missing albedo', async ({ browser }) => {
  const reduced = await open(browser, { ...base, reducedMotion: 'reduce' }, '/', 'light');
  await reduced.page.mouse.move(600, 400);
  await reduced.page.mouse.move(640, 430);
  await reduced.page.waitForTimeout(300);
  expect((await starState(reduced.page)).on).toBe(false);
  await reduced.context.close();

  const coarse = await open(browser, phone, '/', 'light');
  expect(await coarse.page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
  await coarse.page.mouse.move(120, 300);
  await coarse.page.mouse.move(160, 340);
  await coarse.page.waitForTimeout(300);
  expect((await starState(coarse.page)).on).toBe(false);
  await coarse.context.close();

  const about = await open(browser, base, '/about', 'light');
  await about.page.mouse.move(600, 400);
  await about.page.mouse.move(640, 430);
  await about.page.waitForTimeout(300);
  expect((await starState(about.page)).present, 'no star on other routes').toBe(false);
  expect(await about.page.evaluate(() => document.querySelectorAll('.sv-ow-relight').length)).toBe(0);
  await about.context.close();

  const plain = await browser.newContext({ ...base, javaScriptEnabled: false });
  const plainPage = await plain.newPage();
  await plainPage.goto('/');
  expect((await starState(plainPage)).present).toBe(false);
  expect(await shown(plainPage, '.sv-hs-planet > .sv-ow-pimg image')).toBe(true);
  await plain.close();

  const broken = await browser.newContext({ ...base, colorScheme: 'light' });
  await broken.route('**/mountains/ow-*-albedo.webp', route => route.abort());
  const page = await broken.newPage();
  const errors = watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
  await establish(page, 640, 400);
  await page.mouse.move(700, 430);
  await page.waitForTimeout(300);
  const s = await starState(page);
  expect(s.on, 'the star still draws').toBe(true);
  expect(s.litLayers, 'no relight layer without albedo').toBe(0);
  expect(await shown(page, '.sv-hs-planet > .sv-ow-pimg image'), 'the pre-shaded planet stays').toBe(true);
  expect(errors).toEqual([]);
  await broken.close();
});
