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

// ---- Real-body source facts (producers: src/assets/mountain-scene.html; 16 Home hrefs + 2 protected blue-planet refs) ----
// Primary Neptune: `.sv-hs-planet > .sv-ow-pimg > image.sv-ow-pm|pn`; Moon A: `.sv-ow-a image`; Earth B: `.sv-ow-b image`;
// Saturn C: `.sv-ow-c image`. Day (pm) and night (pn) files differ for every body; Neptune and Saturn day files are the
// fixed aerial-perspective copies of the same photograph the night files carry.
const BODY_HREFS = {
  planet: { light: '/mountains/real-neptune-morning.webp', dark: '/mountains/real-neptune.webp' },
  a: { light: '/mountains/real-moon-morning.webp', dark: '/mountains/real-moon-night.webp' },
  b: { light: '/mountains/real-earth-morning.webp', dark: '/mountains/real-earth-night.webp' },
  c: { light: '/mountains/real-saturn-morning.webp', dark: '/mountains/real-saturn.webp' },
} as const;
const HOME_HREFS = [
  ...[1, 2].flatMap(() => [
    '/mountains/real-neptune-morning.webp', '/mountains/real-neptune.webp',
    '/mountains/real-moon-morning.webp', '/mountains/real-moon-night.webp',
    '/mountains/real-earth-morning.webp', '/mountains/real-earth-night.webp',
    '/mountains/real-saturn-morning.webp', '/mountains/real-saturn.webp',
  ]),
].sort();

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

// ---- Pointer helpers (producers: mountains.js creates `div.ow-star[data-on]` for a fine mouse over open sky only) ----
const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
};
const starState = (page: Page) => page.evaluate(() => {
  const star = document.querySelector('.ow-star');
  const box = star ? star.getBoundingClientRect() : null;
  return {
    present: !!star, on: !!star && star.hasAttribute('data-on'),
    centre: box ? [box.left + box.width / 2, box.top + box.height / 2] : null, width: box ? box.width : 0,
    aria: star ? star.getAttribute('aria-hidden') : null, inert: !!star && star.hasAttribute('inert'),
    events: star ? getComputedStyle(star).pointerEvents : null, position: star ? getComputedStyle(star).position : null,
  };
});

// An independently measured open-sky target: not inside any glyph, control, header, visible body or sun (each padded), and
// well above the skyline. Candidates are scanned row by row from the top-left under the header, which is where the clear
// pocket is at 1440 and 768. Returns the first point and a second point at least 60px away (for fresh-travel proofs).
const skyPoints = async (page: Page) => {
  const found = await page.evaluate(() => {
    const header = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
    const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
    const boxes: { l: number; t: number; r: number; b: number }[] = [];
    const add = (r: DOMRect, pad: number) => { if (r.width || r.height) boxes.push({ l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad }); };
    for (const el of Array.from(root.querySelectorAll('.sv-hs-planet > .sv-hs-body, .sv-hs-planet > .sv-ow-pimg image, .sv-ow-a image, .sv-ow-b image, .sv-ow-c image, .sv-hs-sun circle'))) {
      if (el.getClientRects().length > 0) add(el.getBoundingClientRect(), 40);
    }
    for (const el of Array.from(document.querySelectorAll('a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"]), .companion'))) add(el.getBoundingClientRect(), 28);
    for (const scope of [document.querySelector('main'), document.querySelector('.site-header'), document.querySelector('footer')]) {
      if (!scope) continue;
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent!.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const g of Array.from(range.getClientRects())) add(g, 28);
      }
    }
    const points: [number, number][] = [];
    for (let y = Math.ceil(header + 20); y <= Math.min(innerHeight * 0.45, header + 220); y += 12) {
      for (let x = 28; x <= innerWidth - 28; x += 16) {
        if (boxes.some(box => x >= box.l && x <= box.r && y >= box.t && y <= box.b)) continue;
        let interactive = false;
        for (let el: Element | null = document.elementFromPoint(x, y); el; el = el.parentElement) {
          if (el.matches('a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]')) { interactive = true; break; }
        }
        if (!interactive) points.push([x, y]);
      }
    }
    return { header, points };
  });
  expect(found.points.length, 'an independently measured open-sky candidate exists').toBeGreaterThan(1);
  const a = found.points[0];
  const b = found.points.find(p => Math.hypot(p[0] - a[0], p[1] - a[1]) >= 60);
  expect(b, 'a second open-sky candidate at least 60px from the first exists').toBeTruthy();
  return { a: a as readonly [number, number], b: b! as readonly [number, number], header: found.header };
};

// Moves to (x, y) then one pixel further, until the decorative star is drawn: arming is asserted, never assumed.
// Producer semantics (public/mountains/mountains.js placeStar): the first coalesced pointer frame after a cancel or scroll only
// records an anchor; the star may appear once a LATER frame is >= 6px from that anchor (and the scroll-idle gate has passed).
// So the setup lands on the open-sky point, lets that frame run, then travels a real 8px diagonal and lets that frame run too.
// The candidate pads in `skyPoints` (28px) keep both ends in genuine open sky. Arming is asserted, never assumed.
const establish = async (page: Page, x: number, y: number) => {
  await page.bringToFront();
  await expect.poll(async () => {
    await page.mouse.move(x, y);
    await frames(page);
    await page.mouse.move(x + 8, y + 8);
    await frames(page);
    return (await starState(page)).on;
  }, { timeout: 8000, message: `the decorative star arms after real fresh travel in open sky at (${x}, ${y})` }).toBe(true);
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

// Complete static paint of the Home sky: rect, filter, opacity and href of every visible body image, the planet backing,
// a catalogue star, the far ridge, and every attribute the retired pointer/camera paths used to write.
const paint = (page: Page) => page.evaluate(() => {
  const scene = document.querySelector('.mtn-scene[data-mode="home"]')!;
  const read = (sel: string) => Array.from(scene.querySelectorAll(sel)).filter(el => el.getClientRects().length > 0).map(el => {
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { rect: [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100), filter: style.filter, opacity: style.opacity, href: el.getAttribute('href'), cls: el.getAttribute('class') };
  });
  const sky = scene.querySelector('.sv-home-sky') as SVGGElement;
  return {
    planet: read('.sv-hs-planet > .sv-ow-pimg image'), backing: read('.sv-hs-planet > .sv-hs-body'),
    a: read('.sv-ow-a image'), b: read('.sv-ow-b image'), c: read('.sv-ow-c image'),
    star: read('.mtn-wide .sv-hs-full circle').slice(0, 1), ridge: read('.mtn-wide #sv-surface-far-wide'),
    retired: {
      look: document.querySelectorAll('.sv-home-sky[data-look]').length, cam: scene.hasAttribute('data-cam'),
      ox: sky.style.getPropertyValue('--ow-x'), oy: sky.style.getPropertyValue('--ow-y'),
      relight: document.querySelectorAll('.sv-ow-relight, foreignObject, .mtn-scene canvas').length,
    },
  };
});

test('only a decorative celestial star answers a fine mouse; scenery and body paint stay exactly static and every cancel is immediate', async ({ browser }) => {
  const { context, page } = await open(browser, base, '/', 'dark');
  expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
  await page.waitForSelector('.mtn-scene[data-sky="full"]');
  const sky = await skyPoints(page);
  const rest = await paint(page);
  for (const key of ['planet', 'backing', 'a', 'b', 'star', 'ridge'] as const) expect(rest[key].length, `${key} is painted (no empty-selector pass)`).toBeGreaterThan(0);
  expect(rest.retired).toEqual({ look: 0, cam: false, ox: '', oy: '', relight: 0 });
  await establish(page, ...sky.a);
  await page.mouse.move(sky.a[0] + 14, sky.a[1] + 6);
  await frames(page);
  const live = await starState(page);
  expect(live.on, 'only the decorative star answers').toBe(true);
  expect(await paint(page), 'every body, backing, star, ridge and retired-attribute value is unchanged while the star is visible').toEqual(rest);
  // Native wheel cancels at once, nothing replays, and the fixed sky still paints exactly as before.
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await starState(page)).on, { timeout: 2000 }).toBe(false);
  expect(await paint(page)).toEqual(rest);
  await page.mouse.wheel(0, -300);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 2000 }).toBe(0);
  // Held input cancels too, and still nothing about the scene changes.
  await establish(page, ...sky.b);
  await page.mouse.down();
  await expect.poll(async () => (await starState(page)).on, { timeout: 2000 }).toBe(false);
  await page.mouse.up();
  expect(await paint(page)).toEqual(rest);
  await context.close();

  // Native touch on a phone: no star exists and the painted sky is identical before and after tap and wheel scroll.
  const touch = await open(browser, phone, '/', 'dark');
  const before = await paint(touch.page);
  for (const key of ['planet', 'backing', 'b'] as const) expect(before[key].length, `phone ${key} is painted`).toBeGreaterThan(0);
  await touch.page.touchscreen.tap(30, 300);
  await touch.page.mouse.wheel(0, 200);
  await touch.page.waitForTimeout(300);
  expect((await starState(touch.page)).present, 'no star under touch').toBe(false);
  expect(await paint(touch.page)).toEqual(before);
  await touch.context.close();
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

  // Graded sky: other routes keep their incumbent day clouds and now carry Home's graded Neptune as a cropped limb (both themes,
  // with and without script); the small bodies stay Home-only.
  for (const route of ['/about', '/work']) {
    for (const theme of ['light', 'dark'] as const) {
      const { context, page: other } = await open(browser, base, route, theme);
      if (theme === 'light') expect(await shown(other, '.sv-hs-clouds'), route).toBe(true);
      expect(await shown(other, '.sv-hs-planet'), `${route} ${theme}`).toBe(true);
      expect(await shown(other, '.sv-ow-bodies'), `${route} ${theme}`).toBe(false);
      await context.close();
    }
    const bare = await browser.newContext({ ...base, javaScriptEnabled: false });
    const noScript = await bare.newPage();
    await noScript.goto(route);
    expect(await shown(noScript, '.sv-hs-planet'), `${route} no JS`).toBe(true);
    // Speed pass: the painted planet is the <noscript> fallback copy; the real sky SVG's href-less group does not paint.
    expect(await shown(noScript, 'svg.sv-np-fallback .sv-hs-planet > .sv-ow-pimg image'), `${route} no JS fallback image is painted`).toBe(true);
    expect(await shown(noScript, 'svg.mtn-ridge:not(.sv-np-fallback) .sv-hs-planet'), `${route} no JS real sky planet group is hidden`).toBe(false);
    expect(await shown(noScript, '.sv-ow-bodies'), `${route} no JS`).toBe(false);
    await bare.close();
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

// ---- Real bodies over the valley (DESIGN.md "Current private contract: four real bodies") ----
type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
// Decoded material facts. `coreMin`/`corner`: minimum alpha inside 0.8 of the half-extent and maximum alpha in the square's
// corners (r >= 1.1). `lit`/`unlit`: mean LINEAR luminance of the Earth/Moon map renders over the pixels whose true sphere normal
// (u, v, w = sqrt(1 - u^2 - v^2)) dotted with the declared key (-0.6, 0.42, 0.68, normalised) is > 0.6 (lit) or < -0.2 (unlit);
// day files are first inverted through the declared fixed per-body mix (out = (1-k) src + k sky, linear light, sky 229/233/238,
// k read from real-material-provenance.json: derived.dayAerialPerspective.perBody) so
// the physical direction is compared, not the haze-compressed display contrast. Saturn reports alpha at its centre and at two
// ring-gap probes (between the globe and the inner ring edge).
type Core = {
  w: number; h: number; coreMin: number; corner: number;
  lit: number; unlit: number; litCount: number; unlitCount: number; centre: number; holes: number[];
};
type Body = { classes: string[]; box: Box | null; href: string | null; filter: string | null; opacity: string | null; core: Core | null };
type Skies = {
  planet: Body; a: Body; b: Body; c: Body;
  original: number; header: number; width: number; height: number;
  scrollWidth: number; clientWidth: number;
  frontBefore: { content: string; display: string };
  strips: string[];
  hrefCount: number; blueCount: number; foreign: number;
};

const skies = (page: Page, light: boolean) => page.evaluate(async (isLight): Promise<Skies> => {
  const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
  const shownImages = (sel: string) => Array.from(root.querySelectorAll<SVGImageElement>(sel)).filter(node => node.getClientRects().length > 0);
  const toBox = (el: Element): Box => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const toLin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const SKY = [229, 233, 238].map(toLin);
  const norm = Math.hypot(-0.6, 0.42, 0.68);
  const KEY = [-0.6 / norm, 0.42 / norm, 0.68 / norm];
  // The per-body day strength is read from the shipped provenance (the generator's own record), never hardcoded here.
  const provenance = await (await fetch('/mountains/real-material-provenance.json')).json();
  const dayK: Record<string, { k: number }> = provenance.derived.dayAerialPerspective.perBody;
  const decode = async (href: string, kind: string, k: number): Promise<Core> => {
    const img = new Image();
    img.src = href;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const alphaAt = (fx: number, fy: number) => data[(Math.min(h - 1, Math.floor(fy * h)) * w + Math.min(w - 1, Math.floor(fx * w))) * 4 + 3];
    const out: Core = { w, h, coreMin: 255, corner: 0, lit: 0, unlit: 0, litCount: 0, unlitCount: 0, centre: alphaAt(0.501, 0.529), holes: [alphaAt(0.254, 0.529), alphaAt(0.746, 0.529)] };
    if (kind === 'saturn') return out;
    const rpx = w / 2 - 2;
    const mix = k;
    let lit = 0, unlit = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      const nx = (i + 0.5 - w / 2) / (w / 2), ny = (j + 0.5 - h / 2) / (h / 2), r = Math.hypot(nx, ny);
      if (r <= 0.8) out.coreMin = Math.min(out.coreMin, data[o + 3]);
      if (r >= 1.1) out.corner = Math.max(out.corner, data[o + 3]);
      if (kind !== 'map') continue;
      const u = (i + 0.5 - w / 2) / rpx, v = -(j + 0.5 - h / 2) / rpx, d = Math.hypot(u, v);
      if (d > 0.92) continue;
      const mu = u * KEY[0] + v * KEY[1] + Math.sqrt(1 - d * d) * KEY[2];
      const lin = [0, 1, 2].map(ch => {
        const value = toLin(data[o + ch]);
        return isLight ? Math.max(0, (value - mix * SKY[ch]) / (1 - mix)) : value;
      });
      const luma = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      if (mu > 0.6) { lit += luma; out.litCount += 1; }
      else if (mu < -0.2) { unlit += luma; out.unlitCount += 1; }
    }
    out.lit = lit / Math.max(1, out.litCount);
    out.unlit = unlit / Math.max(1, out.unlitCount);
    return out;
  };
  const body = async (sel: string, kind: string, name: string): Promise<Body> => {
    const images = shownImages(sel);
    const style = images.length ? getComputedStyle(images[0]) : null;
    return {
      classes: images.map(node => node.getAttribute('class') || ''),
      box: images.length ? toBox(images[0]) : null,
      href: images.length ? images[0].getAttribute('href') : null,
      filter: style ? style.filter : null, opacity: style ? style.opacity : null,
      core: images.length ? await decode(images[0].getAttribute('href')!, kind, dayK[name].k) : null,
    };
  };
  const front = document.querySelector('.front')!;
  const frontStyle = getComputedStyle(front, '::before');
  return {
    planet: await body('.sv-hs-planet > .sv-ow-pimg image', 'photo', 'neptune'), a: await body('.sv-ow-a image', 'map', 'moon'),
    b: await body('.sv-ow-b image', 'map', 'earth'), c: await body('.sv-ow-c image', 'saturn', 'saturn'),
    original: shownImages('.sv-hs-planet > image').length,
    header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
    width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
    frontBefore: { content: frontStyle.content, display: frontStyle.display },
    strips: ['.home-intro', '.hermes-note', '.home-build', '.home-more', '.front-projects', '.front-contact', '.front-newsletter']
      .map(sel => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)!, '::before').content : 'missing')),
    hrefCount: root.querySelectorAll('image[href*="/mountains/real-"]').length,
    blueCount: root.querySelectorAll('image[href*="blue-planet.webp"]').length,
    foreign: document.querySelectorAll('.mtn-scene foreignObject, .mtn-scene canvas, .sv-ow-relight').length,
  };
}, light);

const sizes: [number, number][] = [
  [320, 812], [360, 780], [375, 812], [402, 681], [500, 900], [719, 1000], [720, 1024], [768, 1024], [899, 1000],
  [900, 700], [1024, 768], [1024, 1366], [1199, 800], [1200, 800], [1359, 900], [1360, 900], [1440, 900], [1440, 1200],
  [390, 844],
];
const diameterFloor = (w: number) => (w < 720 ? 240 : w < 900 ? 176 : w < 1200 ? 216 : 590);

async function openWatched(browser: Browser, options: BrowserContextOptions, theme?: 'light' | 'dark') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const failed: string[] = [], statuses: number[] = [];
  page.on('requestfailed', request => { if (request.url().includes('/mountains/real-')) failed.push(request.url()); });
  page.on('response', response => { if (response.url().includes('/mountains/real-')) statuses.push(response.status()); });
  if (theme) await page.addInitScript(value => localStorage.setItem('theme', value), theme);
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
  return { context, page, failed, statuses };
}

for (const [width, height] of sizes) {
  for (const theme of ['light', 'dark'] as const) {
    test(`real bodies are large, cropped, opaque, source-true and overflow-free at ${width}x${height} (${theme})`, async ({ browser }) => {
      const touch = width < 900;
      const light = theme === 'light';
      const { context, page, failed, statuses } = await openWatched(
        browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: theme }, theme);
      const r = await skies(page, light);
      const material = light ? 'sv-ow-pm' : 'sv-ow-pn';
      const key = light ? 'light' : 'dark';
      // Source CSS conditions decide presence: Moon A is dropped on portrait phones (<720 wide), Earth B (a far-tier point right of
      // the prose column) is shown on phones and tall windows but dropped where that sky is crowded (windows under 680px tall from
      // 960px wide, 900-959px wide, 720-899px wide landscape; short landscape and enlarged text also drop it), Saturn C needs
      // 1360x600 or more at normal text.
      const portraitPhone = width < 720 && height > width;
      const saturn = width >= 1360 && height >= 600;
      const earth = !((width >= 960 && height <= 679) || (width >= 900 && width <= 959) || (width >= 720 && width <= 899 && width / height >= 5 / 4));
      expect(r.planet.classes, 'Neptune material').toEqual([material]);
      expect(r.a.classes, portraitPhone ? 'Moon is omitted on phones' : 'Moon material').toEqual(portraitPhone ? [] : [material]);
      expect(r.b.classes, earth ? 'Earth is shown (also on phones)' : 'Earth is omitted where its sky is crowded').toEqual(earth ? [material] : []);
      expect(r.c.classes, saturn ? 'Saturn material' : 'Saturn is omitted below 1360x600').toEqual(saturn ? [material] : []);
      expect(r.original, 'original blue raster hidden on Home').toBe(0);
      // Source identity: exactly the declared real file for the theme, with no CSS filter grade on any body.
      expect(r.planet.href).toBe(BODY_HREFS.planet[key]);
      if (r.a.box) expect(r.a.href).toBe(BODY_HREFS.a[key]);
      if (r.b.box) expect(r.b.href).toBe(BODY_HREFS.b[key]);
      if (r.c.box) expect(r.c.href).toBe(BODY_HREFS.c[key]);
      for (const [name, body] of [['Neptune', r.planet], ['Moon', r.a], ['Earth', r.b], ['Saturn', r.c]] as const) {
        if (!body.box) continue;
        expect(body.filter, `${name} carries no CSS grade`).toBe('none');
        expect(body.opacity, `${name} paints at full opacity`).toBe('1');
        expect(body.core!.w, `${name} decoded`).toBeGreaterThan(0);
      }
      expect(r.hrefCount, 'the Home scene keeps its 16 real hrefs').toBe(16);
      expect(r.blueCount, 'the retired blue-planet.webp is no longer referenced').toBe(0);
      expect(r.foreign, 'no relight canvas or foreignObject exists').toBe(0);
      // Real assets are fetched and decode without failure.
      expect(failed, 'no failed real-asset request').toEqual([]);
      expect(statuses.length, 'real assets were requested').toBeGreaterThanOrEqual(2);
      expect(statuses.every(status => status === 200), `real asset statuses ${statuses}`).toBe(true);
      // A substantial primary body that is intentionally cropped by the top or right edge, never contained whole.
      const p = r.planet.box!;
      expect(Math.min(p.width, p.height), 'primary apparent diameter').toBeGreaterThanOrEqual(diameterFloor(width));
      expect(p.right > r.width || p.top < 0, 'primary body is cropped by the top or right edge').toBe(true);
      // Opaque core / transparent outside for the round bodies; Neptune is a photograph and keeps its own dark limb.
      for (const [name, body] of [['Neptune', r.planet], ['Moon', r.a], ['Earth', r.b]] as const) {
        if (!body.box) continue;
        expect(body.core!.coreMin, `${name} core is opaque`).toBe(255);
        expect(body.core!.corner, `${name} outside the disk is transparent`).toBeLessThanOrEqual(2);
      }
      // Earth and Moon: the physical lit hemisphere (true normal . declared key) is brighter than the unlit one.
      for (const [name, body] of [['Moon', r.a], ['Earth', r.b]] as const) {
        if (!body.box) continue;
        const m = body.core!;
        expect(m.litCount, `${name} lit samples`).toBeGreaterThan(50);
        expect(m.unlitCount, `${name} unlit samples`).toBeGreaterThan(50);
        expect(m.lit, `${name} lit side exceeds the unlit side in linear light`).toBeGreaterThan(m.unlit * 2 + 0.02);
      }
      // Saturn keeps its photograph: an opaque body at the centre and transparent gaps between the globe and the rings.
      if (r.c.box) {
        expect(r.c.core!.centre, 'Saturn globe is opaque').toBe(255);
        for (const gap of r.c.core!.holes) expect(gap, 'ring gap stays transparent').toBeLessThan(16);
      }
      // No new horizontal overflow; no page-attached veil and no per-paragraph strips.
      expect(r.scrollWidth, 'document does not overflow horizontally').toBeLessThanOrEqual(r.clientWidth);
      expect(r.frontBefore.content, 'no page-attached veil').toBe('none');
      expect(r.strips.length).toBeGreaterThan(0);
      for (const content of r.strips) expect(content, 'no individual reading strip').not.toMatch(/^"/);
      await context.close();
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`Home sky stays constant through native wheel 0-400 and back (${theme})`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...phone, colorScheme: theme }, '/', theme);
    const snap = () => page.evaluate(() => {
      const scene = document.querySelector('.mtn-scene')!;
      const img = Array.from(scene.querySelectorAll('.sv-ow-pimg image')).filter(node => node.getClientRects().length > 0);
      const r = img[0].getBoundingClientRect();
      const earth = Array.from(scene.querySelectorAll('.sv-ow-b image')).filter(node => node.getClientRects().length > 0);
      const e = earth[0].getBoundingClientRect();
      const glyphs: number[] = [];
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent!.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const g of Array.from(range.getClientRects())) if (g.bottom > 98 && g.top < innerHeight) glyphs.push(g.top);
      }
      return {
        count: img.length, earthCount: earth.length, style: scene.getAttribute('style'), progress: scene.getAttribute('data-progress'),
        layers: ['.mtn-far', '.mtn-middle', '.mtn-near'].map(sel => getComputedStyle(scene.querySelector(`:scope > ${sel}`)!).transform),
        planet: [r.left, r.top, r.width].map(Math.round), earth: [e.left, e.top, e.width].map(Math.round),
        filter: getComputedStyle(img[0]).filter, front: getComputedStyle(document.querySelector('.front')!, '::before').content,
        scrollY: Math.round(scrollY), visibleGlyphs: glyphs.length,
      };
    });
    const start = await snap();
    expect(start.count).toBe(1);
    expect(start.earthCount, 'Earth is painted on the phone').toBe(1);
    expect(start.front, 'no page-attached veil').toBe('none');
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

test('system light and dark, reduced motion and forced colours keep one correct real-body family', async ({ browser }) => {
  for (const [label, extra, light] of [
    ['system light', { colorScheme: 'light' as const }, true], ['system dark', { colorScheme: 'dark' as const }, false],
    ['reduced light', { reducedMotion: 'reduce' as const, colorScheme: 'light' as const }, true],
    ['reduced dark', { reducedMotion: 'reduce' as const, colorScheme: 'dark' as const }, false],
  ] as const) {
    const { context, page } = await open(browser, { ...phone, ...extra }, '/');
    const r = await skies(page, light);
    expect(r.planet.classes, label).toEqual([light ? 'sv-ow-pm' : 'sv-ow-pn']);
    expect(r.planet.href, label).toBe(BODY_HREFS.planet[light ? 'light' : 'dark']);
    expect(r.b.href, `${label} Earth`).toBe(BODY_HREFS.b[light ? 'light' : 'dark']);
    expect(r.original, label).toBe(0);
    expect(r.planet.box!.width, label).toBeGreaterThanOrEqual(240);
    expect(r.scrollWidth, label).toBeLessThanOrEqual(r.clientWidth);
    await context.close();
  }
  const forced = await browser.newContext({ ...phone, forcedColors: 'active' });
  const forcedPage = await forced.newPage();
  await forcedPage.goto('/');
  expect(await forcedPage.evaluate(() => getComputedStyle(document.querySelector('.mtn-scene')!).display)).toBe('none');
  await forced.close();
});

test('no-JS Home shows its real bodies, bounded and overflow-free (synchronous diagnostics)', async ({ browser }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const plain = await browser.newContext({ ...base, viewport, javaScriptEnabled: false });
    const page = await plain.newPage();
    await page.goto('/');
    const r = await skies(page, true);
    expect(r.planet.classes, `no-JS ${viewport.width}`).toEqual(['sv-ow-pm']);
    expect(r.planet.href).toBe(BODY_HREFS.planet.light);
    expect(r.b.href, 'no-JS Earth').toBe(BODY_HREFS.b.light);
    expect(r.original).toBe(0);
    expect(r.planet.box!.width).toBeGreaterThanOrEqual(diameterFloor(viewport.width));
    expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
    expect(r.frontBefore.content).toBe('none');
    await plain.close();
  }
});

test('200% text keeps the planet but drops the small bodies and overflows nothing', async ({ browser }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const { context, page } = await open(browser, { ...phone, viewport, isMobile: viewport.width < 900, hasTouch: viewport.width < 900 }, '/', 'light');
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.waitForFunction(() => document.querySelector('.mtn-scene')!.hasAttribute('data-big'));
    const r = await skies(page, true);
    expect(r.header).toBeGreaterThan(viewport.width < 720 ? 120 : 90);
    expect(r.planet.classes, 'planet is painted').toEqual(['sv-ow-pm']);
    expect(r.a.classes, 'Moon is hidden at 200%').toEqual([]);
    expect(r.b.classes, 'Earth is hidden at 200%').toEqual([]);
    expect(r.c.classes, 'Saturn is hidden at 200%').toEqual([]);
    expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
    await context.close();
  }
});

// The older tall-desktop planet rule (scale 1.03, translate -140px 85px) must not act on the nested real image:
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

// Saturn (.sv-ow-c): small, in the open top-sky pocket left of Earth on the same row, shown only from 1360px wide and
// 600px high at normal text; Home only. Layout vars: radius clamp(70px, 6.6vw, 110px), centre row == Earth's row.
for (const [width, height] of [[1440, 900], [1360, 900]] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Saturn sits in open sky left of Earth at ${width}x${height} (${theme})`, async ({ browser }) => {
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
        // Every text box on the page and every header control, for the 32px clearance of the far-tier rule.
        const texts: { left: number; top: number; right: number; bottom: number }[] = [];
        for (const scope of [document.querySelector('main'), document.querySelector('.site-header')]) {
          if (!scope) continue;
          const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent!.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const g of Array.from(range.getClientRects())) texts.push({ left: g.left, top: g.top, right: g.right, bottom: g.bottom });
          }
        }
        const controls = Array.from(document.querySelectorAll('.site-header a, .site-header button')).map(rect);
        return {
          texts, controls,
          total: root.querySelectorAll('.sv-ow-c image').length, classes: c.map(node => node.getAttribute('class')), href: c.length ? c[0].getAttribute('href') : null,
          box: c.length ? rect(c[0]) : null,
          header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
          intro: document.querySelector('.home-intro')!.getBoundingClientRect().top,
          earth: rect(visible('.sv-ow-b image')[0]),
          others: [...visible('.sv-hs-planet > .sv-ow-pimg image'), ...visible('.sv-ow-a image'), ...visible('.sv-ow-b image')].map(rect),
          glyphs, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(r.total, 'both variants carry a theme pair').toBeGreaterThanOrEqual(4);
      expect(r.classes, 'one active material').toEqual([theme === 'light' ? 'sv-ow-pm' : 'sv-ow-pn']);
      expect(r.href).toBe(BODY_HREFS.c[theme]);
      const b = r.box!;
      // Graded sky, far tier: about 0.55-0.6x of the former ring width (twice the radius clamp(70px, 6.6vw, 110px)).
      const formerWidth = 2 * Math.min(110, Math.max(70, 0.066 * width));
      expect(b.width / formerWidth, 'ring width is about 0.55-0.6x of the former width').toBeGreaterThanOrEqual(0.5);
      expect(b.width / formerWidth, 'ring width is about 0.55-0.6x of the former width').toBeLessThanOrEqual(0.62);
      expect(b.right, 'left of Earth with clear sky between').toBeLessThanOrEqual(r.earth.left - 20);
      // The box starts 32px under the header and sits in the top sky band, well above the first prose and above Earth's band.
      expect(b.top, 'starts 32px under the header').toBeGreaterThanOrEqual(r.header + 31);
      expect(b.top, 'starts 32px under the header').toBeLessThanOrEqual(r.header + 34);
      expect(b.bottom, 'clear of the first prose').toBeLessThanOrEqual(r.intro - 16);
      expect(b.bottom, 'not in the same band as Earth').toBeLessThanOrEqual(r.earth.top - 32);
      expect(r.glyphs.length, 'heading text was measured').toBeGreaterThan(0);
      const apart = (x: { left: number; top: number; right: number; bottom: number }) => x.right <= b.left || x.left >= b.right || x.bottom <= b.top || x.top >= b.bottom;
      for (const g of r.glyphs) expect(apart(g), 'clear of the heading glyphs').toBe(true);
      // At least 32px from every text box and every header control.
      const gap = (x: { left: number; top: number; right: number; bottom: number }) =>
        Math.hypot(Math.max(0, b.left - x.right, x.left - b.right), Math.max(0, b.top - x.bottom, x.top - b.bottom));
      expect(r.texts.length, 'page text was measured').toBeGreaterThan(0);
      for (const t of r.texts) expect(gap(t), 'at least 32px from text').toBeGreaterThanOrEqual(32);
      expect(r.controls.length, 'header controls were measured').toBeGreaterThan(0);
      for (const c of r.controls) expect(gap(c), 'at least 32px from the nav and controls').toBeGreaterThanOrEqual(32);
      expect(r.others.length, 'Neptune, the Moon and Earth are visible').toBeGreaterThanOrEqual(3);
      for (const o of r.others) expect(apart(o), 'separate from the other bodies').toBe(true);
      expect(r.overflow).toBeLessThanOrEqual(0);
      await context.close();
    });
  }
}

// ---- Daylight colour and tablet composition (Candidate 3 review: grey Neptune, grey small Earth, clone Moon/Earth, thin tablet arc) ----
// Reads the VISIBLE part of the painted Neptune: the image box clipped to the viewport AND to the area below the real header,
// mapped back into the decoded texture, so only source-alpha (opaque) pixels that are really on screen count. `chord` is the
// widest run of opaque pixels on any one visible row, in CSS px (a disc chord, not a clipped image bounding box).
const neptuneVisible = (page: Page) => page.evaluate(async () => {
  const img = Array.from(document.querySelectorAll('.mtn-scene[data-mode="home"] .sv-hs-planet > .sv-ow-pimg image')).find(node => node.getClientRects().length > 0) as SVGImageElement | undefined;
  if (!img) return null;
  const box = img.getBoundingClientRect();
  const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
  const left = Math.max(0, box.left), top = Math.max(0, box.top, headerBottom), right = Math.min(innerWidth, box.right), bottom = Math.min(innerHeight, box.bottom);
  const el = new Image();
  el.src = img.getAttribute('href')!;
  await el.decode();
  const w = el.naturalWidth, h = el.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(el, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const x0 = Math.max(0, Math.floor((left - box.left) / box.width * w)), x1 = Math.min(w, Math.ceil((right - box.left) / box.width * w));
  const y0 = Math.max(0, Math.floor((top - box.top) / box.height * h)), y1 = Math.min(h, Math.ceil((bottom - box.top) / box.height * h));
  let opaque = 0, r = 0, g = 0, b = 0, widest = 0;
  for (let y = y0; y < y1; y++) {
    let row = 0;
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] < 250) continue;
      row += 1; opaque += 1; r += data[o]; g += data[o + 1]; b += data[o + 2];
    }
    widest = Math.max(widest, row);
  }
  const n = Math.max(1, opaque);
  return { chord: widest * (box.width / w), area: opaque * (box.width / w) * (box.height / h), mean: [r / n, g / n, b / n], opaque };
});

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [375, 812]] as const) {
  test(`daylight Neptune reads blue in its visible crop at ${width}x${height}`, async ({ browser }) => {
    const touch = width < 900;
    const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: 'light' }, '/', 'light');
    const v = await neptuneVisible(page);
    expect(v, 'Neptune is painted').not.toBeNull();
    expect(v!.opaque, 'a real visible crop of opaque pixels').toBeGreaterThan(2000);
    const [r, g, b] = v!.mean;
    expect(b - r, `visible Neptune is blue, not grey (mean rgb ${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`).toBeGreaterThanOrEqual(30);
    expect(b, 'blue is the dominant channel').toBeGreaterThan(g + 5);
    await context.close();
  });
}

for (const [width, height] of [[720, 1024], [768, 1024], [899, 1000]] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`tablet Neptune keeps a substantial curved crop and Moon and Earth stay distinct at ${width}x${height} (${theme})`, async ({ browser }) => {
      const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: true, hasTouch: true, colorScheme: theme }, '/', theme);
      const v = await neptuneVisible(page);
      expect(v, 'Neptune is painted').not.toBeNull();
      expect(v!.chord, 'widest source-alpha chord of the disc below the real header (not a clipped bounding box)').toBeGreaterThanOrEqual(240);
      expect(v!.area, 'visible opaque Neptune area below the header (px squared)').toBeGreaterThanOrEqual(28000);
      const g = await page.evaluate(() => {
        const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
        const one = (sel: string) => {
          const el = Array.from(root.querySelectorAll(sel)).find(node => node.getClientRects().length > 0);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        const glyphs: { left: number; top: number; right: number; bottom: number }[] = [];
        const title = document.getElementById('home-title');
        if (title) {
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const q of Array.from(range.getClientRects())) glyphs.push({ left: q.left, top: q.top, right: q.right, bottom: q.bottom });
          }
        }
        return { n: one('.sv-hs-planet > .sv-ow-pimg image'), moon: one('.sv-ow-a image'), earth: one('.sv-ow-b image'), glyphs, intro: document.querySelector('.home-intro')!.getBoundingClientRect().top };
      });
      expect(g.glyphs.length, 'heading glyphs were measured').toBeGreaterThan(0);
      expect(g.n && g.moon && g.earth, 'Neptune, Moon and Earth are all painted on tablets').toBeTruthy();
      const n = g.n!, moon = g.moon!, earth = g.earth!;
      // Disc radii are 0.495 of the square image box (the generators' own disk fractions).
      const rN = 0.495 * n.w, rM = 0.495 * moon.w, rE = 0.495 * earth.w;
      expect(moon.w, 'Moon is clearly larger than Earth').toBeGreaterThanOrEqual(earth.w * 1.3);
      expect(moon.left - earth.right, 'at least about one Earth width of sky between Moon and Earth').toBeGreaterThanOrEqual(earth.w * 0.9);
      expect(Math.hypot(moon.cx - n.cx, moon.cy - n.cy), 'Moon clear of the Neptune limb').toBeGreaterThanOrEqual(rN + rM + 12);
      expect(Math.hypot(earth.cx - n.cx, earth.cy - n.cy), 'Earth clear of the Neptune limb').toBeGreaterThanOrEqual(rN + rE + 12);
      // No unintended overlap with the heading glyphs or the first prose: the small bodies stay clear of both, and the heading
      // never enters Neptune's disc.
      for (const [name, body] of [['Moon', moon], ['Earth', earth]] as const) {
        for (const q of g.glyphs) {
          const apart = q.right <= body.left - 8 || q.left >= body.right + 8 || q.bottom <= body.top - 8 || q.top >= body.bottom + 8;
          expect(apart, `${name} clear of the heading glyphs`).toBe(true);
        }
        expect(body.bottom, `${name} ends well above the first prose`).toBeLessThanOrEqual(g.intro - 16);
      }
      for (const q of g.glyphs) {
        const nearX = Math.min(Math.max(n.cx, q.left), q.right), nearY = Math.min(Math.max(n.cy, q.top), q.bottom);
        expect(Math.hypot(nearX - n.cx, nearY - n.cy), 'heading glyphs outside the Neptune disc').toBeGreaterThanOrEqual(rN + 8);
      }
      await context.close();
    });
  }
}

// The small Earth must keep recognisable ocean and land at its real rendered size: the texture is drawn at that size and
// counted, so a grey haze (the Candidate 3 failure at 375/390/768 light) fails here.
for (const [width, height] of [[375, 812], [390, 844], [768, 1024]] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`small Earth keeps blue ocean and land detail at its rendered size at ${width}x${height} (${theme})`, async ({ browser }) => {
      const touch = true;
      const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: theme }, '/', theme);
      const r = await page.evaluate(async () => {
        const img = Array.from(document.querySelectorAll('.mtn-scene[data-mode="home"] .sv-ow-b image')).find(node => node.getClientRects().length > 0) as SVGImageElement | undefined;
        if (!img) return null;
        const size = Math.max(8, Math.round(img.getBoundingClientRect().width));
        const el = new Image();
        el.src = img.getAttribute('href')!;
        await el.decode();
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(el, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let n = 0, blue = 0, sum = 0, sum2 = 0;
        const lumas: number[] = [];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const dx = (x + 0.5 - size / 2) / (size / 2), dy = (y + 0.5 - size / 2) / (size / 2);
          if (Math.hypot(dx, dy) > 0.8) continue;
          const o = (y * size + x) * 4, R = data[o], G = data[o + 1], B = data[o + 2];
          const luma = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          n += 1; sum += luma; sum2 += luma * luma;
          lumas.push(luma);
          if (B > R + 12 && B >= G) blue += 1;
        }
        const mean = sum / n;
        // The graded palette has no green or brown land, so surface detail is palette-neutral: the share of disc pixels at least
        // 25 luma above the disc's median luma (a flat grey haze has none).
        const sorted = lumas.slice().sort((p, q) => p - q);
        const median = sorted[Math.floor(sorted.length / 2)];
        const bright = lumas.filter(v => v >= median + 25).length;
        return { size, n, blue: blue / n, bright: bright / n, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
      });
      expect(r, 'Earth is painted').not.toBeNull();
      expect(r!.size, 'Earth renders small here').toBeLessThan(110);
      expect(r!.blue, 'ocean reads blue').toBeGreaterThanOrEqual(0.15);
      expect(r!.bright, 'surface detail: at least 6% of the disc is 25+ luma above its median').toBeGreaterThanOrEqual(0.06);
      expect(r!.std, 'visible luminance detail across the disc').toBeGreaterThanOrEqual(10);
      await context.close();
    });
  }
}

test('Saturn is omitted where no sky gap exists, outside Home and at 200% text', async ({ browser }) => {
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

// ---- The decorative cursor star (Home, fine mouse, genuine open sky only) ----
for (const theme of ['light', 'dark'] as const) {
  test(`a small decorative star follows the native mouse in open sky while every real body stays opaque and static (${theme})`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...base, colorScheme: theme }, '/', theme);
    const errors = watchErrors(page);
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
    const sky = await skyPoints(page);
    const before = await stable(page);
    const rest = await paint(page);
    for (const key of ['planet', 'backing', 'a', 'b', 'c'] as const) expect(rest[key].length, `${key} is painted`).toBeGreaterThan(0);
    await establish(page, ...sky.a);
    await page.mouse.move(sky.a[0] + 12, sky.a[1] + 8);
    await frames(page);
    const s = await starState(page);
    expect(s.present && s.on, 'star is drawn').toBe(true);
    expect(Math.abs(s.centre![0] - (sky.a[0] + 12)), 'star x follows the pointer').toBeLessThan(1.5);
    expect(Math.abs(s.centre![1] - (sky.a[1] + 8)), 'star y follows the pointer').toBeLessThan(1.5);
    expect(s.width).toBeGreaterThanOrEqual(6);
    expect(s.width).toBeLessThanOrEqual(10);
    expect(s.aria).toBe('true');
    expect(s.inert).toBe(true);
    expect(s.events).toBe('none');
    expect(s.position).toBe('fixed');
    // Body paint (rect, filter, opacity, href) is identical while the star is visible; there is no relight layer at all.
    const live = await paint(page);
    expect(live, 'bodies are static while the star is visible').toEqual(rest);
    expect(live.planet.every(item => item.opacity === '1'), 'Neptune stays at full opacity').toBe(true);
    expect(live.retired.relight, 'no relight/canvas/foreignObject').toBe(0);
    // No idle chase: the star rests where the pointer rests.
    await page.waitForTimeout(400);
    expect((await starState(page)).centre).toEqual(s.centre);
    // Terrain, Mount, content and header geometry are exactly as before.
    expect(await stable(page)).toEqual(before);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('the star is suppressed over every celestial body and over the sun, and body paint stays static', async ({ browser }) => {
  for (const theme of ['light', 'dark'] as const) {
    const { context, page } = await open(browser, { ...base, colorScheme: theme }, '/', theme);
    const errors = watchErrors(page);
    const sky = await skyPoints(page);
    const targets = await page.evaluate(() => {
      const root = document.querySelector('.mtn-scene[data-mode="home"]')!;
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        const l = Math.max(0, r.left), t = Math.max(0, r.top), rr = Math.min(innerWidth, r.right), b = Math.min(innerHeight, r.bottom);
        return { x: (l + rr) / 2, y: (t + b) / 2, w: rr - l, h: b - t };
      };
      const out: { name: string; x: number; y: number }[] = [];
      for (const [name, sel] of [['Neptune', '.sv-hs-planet > .sv-ow-pimg image'], ['Moon', '.sv-ow-a image'], ['Earth', '.sv-ow-b image'], ['Saturn', '.sv-ow-c image'], ['sun', '.sv-hs-sun circle:last-child']] as const) {
        const el = Array.from(root.querySelectorAll(sel)).find(node => node.getClientRects().length > 0);
        if (!el) continue;
        const c = centre(el);
        if (c.w > 0 && c.h > 0) out.push({ name, x: c.x, y: c.y });
      }
      return out;
    });
    const names = targets.map(t => t.name);
    for (const required of theme === 'light' ? ['Neptune', 'Moon', 'Earth', 'Saturn', 'sun'] : ['Neptune', 'Moon', 'Earth', 'Saturn']) {
      expect(names, `${theme}: ${required} is on screen and measurable`).toContain(required);
    }
    const rest = await paint(page);
    for (const target of targets) {
      await establish(page, ...sky.a); // genuinely armed first
      expect((await starState(page)).on, `${theme}: armed before travelling to ${target.name}`).toBe(true);
      await page.mouse.move(target.x - 6, target.y - 6, { steps: 4 });
      await page.mouse.move(target.x, target.y, { steps: 3 });
      await page.mouse.move(target.x + 1, target.y + 1);
      await frames(page);
      await expect.poll(async () => (await starState(page)).on, { message: `${theme}: star hidden over ${target.name}`, timeout: 2000 }).toBe(false);
      expect(await paint(page), `${theme}: bodies unchanged over ${target.name}`).toEqual(rest);
      await establish(page, ...sky.b); // fresh travel back into open sky re-arms
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});

test('every cancellation path removes the star at once and needs fresh mouse input', async ({ browser }) => {
  const { context, page } = await open(browser, { ...base, colorScheme: 'light' }, '/', 'light');
  const errors = watchErrors(page);
  const sky = await skyPoints(page);
  const gone = async (label: string) => {
    await expect.poll(async () => (await starState(page)).on, { message: label, timeout: 2000 }).toBe(false);
  };
  const [sx, sy] = sky.a;
  expect(await page.evaluate(([x, y]) => {
    for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
      if (el.matches('a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]')) return true;
    }
    return false;
  }, [sx, sy]), 'the fixture point has no interactive ancestor').toBe(false);
  await establish(page, sx, sy);
  await page.mouse.wheel(0, 120);
  await gone('wheel');
  await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(0);
  // A wheel that changed the scroll position keeps the star off while scrolling and until the quiet gate passes; a fresh
  // native move then needs real travel to re-arm.
  await establish(page, sx, sy);
  await page.mouse.down();
  await gone('held pointer');
  await page.mouse.move(sx + 12, sy + 8);
  await page.mouse.move(sx + 18, sy + 12);
  await frames(page);
  expect(await starState(page), 'native mouse movement while the button is held stays off').toMatchObject({ on: false });
  await page.mouse.up();
  await establish(page, sx, sy); // a fresh mouse after release works
  await page.keyboard.down('Shift');
  await gone('keyboard');
  await page.mouse.move(sx + 12, sy + 8);
  await page.mouse.move(sx + 18, sy + 12);
  await frames(page);
  expect(await starState(page), 'native mouse movement while a key is held stays off').toMatchObject({ on: false });
  await page.keyboard.up('Shift');
  await establish(page, sx, sy); // the focused BODY/MAIN container no longer blocks fresh input
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); // synthetic blur event
  await gone('blur');
  await page.mouse.move(sx + 10, sy + 6);
  await page.mouse.move(sx + 16, sy + 10);
  await frames(page);
  expect(await starState(page), 'fresh mouse cannot rearm while the window is blurred').toMatchObject({ on: false });
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); // synthetic focus restoration (not a real window focus)
  await establish(page, sx, sy); // then fresh native mouse input rearms
  await page.evaluate(() => document.documentElement.dispatchEvent(new Event('pointerleave'))); // leave from the re-armed state
  await gone('pointer leave (after refocus)');
  await establish(page, ...sky.b);
  await page.evaluate(() => document.documentElement.dispatchEvent(new Event('pointerleave')));
  await gone('pointer leave');
  await establish(page, ...sky.b);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await gone('theme change');
  await establish(page, ...sky.b);
  await page.setViewportSize({ width: 1380, height: 900 });
  await gone('resize');
  // The window changed size, so the open-sky target is measured again before re-arming.
  const resized = await skyPoints(page);
  await establish(page, ...resized.a);
  await page.locator('.atmosphere-toggle').click(); // the real native Pause control (Playwright scrolls it into view)
  await gone('Pause');
  await page.mouse.move(resized.a[0] + 10, resized.a[1] + 5);
  await page.mouse.move(resized.a[0] + 16, resized.a[1] + 9);
  await page.waitForTimeout(300);
  expect((await starState(page)).on, 'Pause stays static under fresh mouse input').toBe(false);
  expect(errors).toEqual([]);
  await context.close();
});

// Graded sky: the only Home texture other routes may carry is Neptune's pair (dark and light), shared with Home's cache.
const NEPTUNE_PAIR = ['/mountains/real-neptune-morning.webp', '/mountains/real-neptune.webp'];
const OFF_HOME_INERT = HOME_HREFS.filter(href => !href.includes('real-neptune'));

test('Home-only real textures and visibility masks are not fetched on other routes (only the Neptune pair is); Home keeps its 16 real hrefs with or without JS', async ({ browser }) => {
  for (const route of ['/work', '/about']) {
    const context = await browser.newContext(base);
    const page = await context.newPage();
    const requests = new Set<string>();
    page.on('request', request => { if (/\/mountains\/(real-|ow-)/.test(request.url())) requests.add(new URL(request.url()).pathname); });
    await page.goto(route);
    await page.waitForLoadState('load');
    // Speed pass: with JS only the current theme's Neptune texture is requested (base is system light, so the day file).
    expect(Array.from(requests).sort(), `${route} requests exactly the current theme's Neptune texture and no other Home texture or visibility mask`).toEqual([NEPTUNE_PAIR[0]]);
    const facts = await page.evaluate(() => ({
      npSrc: Array.from(document.querySelectorAll('image[data-np-src]')).map(node => node.getAttribute('data-np-src')!).sort(),
      inert: Array.from(document.querySelectorAll('image[data-home-src]')).map(node => node.hasAttribute('href')),
      homeSrc: Array.from(document.querySelectorAll('image[data-home-src]')).map(node => node.getAttribute('data-home-src')!).sort(),
      withHref: document.querySelectorAll('image[href*="/mountains/real-"], image[href*="/mountains/ow-"]').length,
      hrefs: Array.from(document.querySelectorAll('image[href*="/mountains/real-"]')).map(node => node.getAttribute('href')!).sort(),
      blue: document.querySelectorAll('image[href*="blue-planet.webp"]').length,
      landscape: document.querySelectorAll('.mtn-scene .mtn-lit').length,
      css: Array.from(document.querySelectorAll('style')).map(node => node.textContent || '').join('\n'),
    }));
    expect(facts.inert.length, 'the 12 non-Neptune hidden texture nodes remain, inert').toBe(12);
    expect(facts.inert.every(has => !has)).toBe(true);
    expect(facts.homeSrc, 'the inert sources are exactly the current non-Neptune real files').toEqual(OFF_HOME_INERT);
    expect(facts.npSrc, 'all 4 Neptune nodes (dark and light, wide and tall) carry their source as data-np-src').toEqual([NEPTUNE_PAIR[0], NEPTUNE_PAIR[0], NEPTUNE_PAIR[1], NEPTUNE_PAIR[1]]);
    expect(facts.withHref, 'only the current theme\'s 2 Neptune nodes (wide and tall) are live').toBe(2);
    expect(facts.hrefs, 'the live hrefs are the current theme\'s Neptune file').toEqual([NEPTUNE_PAIR[0], NEPTUNE_PAIR[0]]);
    expect(facts.blue, 'the retired blue-planet.webp is not referenced').toBe(0);
    expect(facts.css, `${route} carries no visibility-mask URL`).not.toMatch(/real-(earth|saturn)-visibility/);
    expect(facts.landscape, 'original landscape paths are intact').toBeGreaterThan(0);
    await expect(page.locator('main')).toBeVisible();
    await context.close();
  }
  // Without JS, other routes request the Neptune pair through the <noscript> fallback and nothing else.
  for (const route of ['/work', '/about']) {
    const context = await browser.newContext({ ...base, javaScriptEnabled: false });
    const page = await context.newPage();
    const requests = new Set<string>();
    page.on('request', request => { if (/\/mountains\/(real-|ow-)/.test(request.url())) requests.add(new URL(request.url()).pathname); });
    await page.goto(route);
    await page.waitForLoadState('load');
    expect(Array.from(requests).sort(), `${route} without JS requests the Neptune pair through the fallback and nothing else`).toEqual(NEPTUNE_PAIR);
    await context.close();
  }
  // Home at a size where both optional masks apply fetches exactly the two fixed visibility masks, and no retired ow- file.
  const wide = await browser.newContext(base);
  const widePage = await wide.newPage();
  const wideRequests = new Set<string>();
  widePage.on('request', request => { if (/\/mountains\/(real-.*-visibility|ow-)/.test(request.url())) wideRequests.add(new URL(request.url()).pathname); });
  await widePage.goto('/');
  await widePage.waitForLoadState('load');
  expect(Array.from(wideRequests).sort(), 'two fixed visibility masks, nothing retired').toEqual(['/mountains/real-earth-visibility.webp', '/mountains/real-saturn-visibility.webp']);
  await wide.close();
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ ...base, javaScriptEnabled });
    const page = await context.newPage();
    await page.goto('/');
    const facts = await page.evaluate(() => ({
      withHref: document.querySelectorAll('image[href*="/mountains/real-"]').length,
      hrefs: Array.from(document.querySelectorAll('image[href*="/mountains/real-"]')).map(node => node.getAttribute('href')!).sort(),
      retired: document.querySelectorAll('image[href*="/mountains/ow-"]').length,
      blue: document.querySelectorAll('image[href*="blue-planet.webp"]').length,
      inert: document.querySelectorAll('image[data-home-src]').length,
    }));
    expect(facts.withHref, `Home keeps its real hrefs (JS ${javaScriptEnabled})`).toBe(16);
    expect(facts.hrefs, `Home hrefs are the current real files (JS ${javaScriptEnabled})`).toEqual(HOME_HREFS);
    expect(facts.retired).toBe(0);
    expect(facts.blue, 'the retired blue-planet.webp is not referenced').toBe(0);
    expect(facts.inert).toBe(0);
    expect(await shown(page, '.sv-hs-planet > .sv-ow-pimg image'), `Home shows its real Neptune (JS ${javaScriptEnabled})`).toBe(true);
    await context.close();
  }
});

// Speed pass: inner pages (calm /about, index /work) load only the current theme's Neptune texture, set by an inline script;
// a real theme toggle click then loads the other theme's texture.
for (const route of ['/about', '/work']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${route} in ${theme} requests only its own Neptune texture until the theme is toggled`, async ({ browser }) => {
      const other = theme === 'light' ? 'dark' : 'light';
      const context = await browser.newContext({ ...base, colorScheme: theme });
      const page = await context.newPage();
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      const requests = new Set<string>();
      page.on('request', request => { if (/\/mountains\/(real-|ow-)/.test(request.url())) requests.add(new URL(request.url()).pathname); });
      await page.goto(route);
      await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
      await page.waitForLoadState('load');
      const nodes = (which: 'light' | 'dark') => page.evaluate(sel => Array.from(document.querySelectorAll(sel)).map(node => node.getAttribute('href')), `.mtn-scene .sv-hs-planet .${which === 'light' ? 'sv-ow-pm' : 'sv-ow-pn'}`);
      expect(Array.from(requests), `${route} ${theme}: exactly the current theme's Neptune texture`).toEqual([BODY_HREFS.planet[theme]]);
      expect(await nodes(theme), `${route} ${theme}: the current theme's nodes (wide and tall) have href`).toEqual([BODY_HREFS.planet[theme], BODY_HREFS.planet[theme]]);
      expect(await nodes(other), `${route} ${theme}: the other theme's nodes stay inert`).toEqual([null, null]);
      await page.locator('.theme-toggle').click();
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(other);
      await expect.poll(() => Array.from(requests).sort(), { message: `${route}: the other theme's texture is requested after the toggle` })
        .toEqual(NEPTUNE_PAIR);
      expect(await nodes(other), `${route} ${other}: the new theme's nodes have href`).toEqual([BODY_HREFS.planet[other], BODY_HREFS.planet[other]]);
      await context.close();
    });
  }
}

test('only Home inlines the Home-only world CSS; other routes still hide the new small bodies and carry only the graded Neptune limb', async ({ browser }) => {
  const css = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('style')).map(node => node.textContent || '').join('\n'));
  // The Home-only nested-image guard, emitted only by the Home world CSS. The off-Home carry-through names its own identity
  // tokens (--np-identity-scale/shift/turn), so none of the three Home tokens may appear on another route.
  const homeRule = /ow-identity-(scale|shift|turn)/;
  // The minifier legitimately merges identical adjacent declarations into one selector list
  // (e.g. `.mtn-scene[data-mode=calm]>.mtn-mist,.sv-ow-bodies,.sv-ow-pimg,.sv-ow-pm,.sv-ow-pn{display:none}`), so the
  // default-hide guard inspects the real CSSOM: every wanted selector must be an entry of some display:none rule's selector list
  // (grouping rules such as @media are walked too). Returns the wanted selectors that are NOT hidden by default.
  const notHiddenByDefault = (page: Page) => page.evaluate(() => {
    const wanted = ['.sv-ow-bodies', '.sv-ow-pimg', '.sv-ow-pm', '.sv-ow-pn'];
    const hidden = new Set<string>();
    let rulesSeen = 0;
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          rulesSeen += 1;
          if (rule.style.getPropertyValue('display') === 'none') {
            for (const selector of rule.selectorText.split(',').map(part => part.trim())) hidden.add(selector);
          }
        } else if ('cssRules' in rule) {
          walk((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { walk(sheet.cssRules); } catch { /* an unreadable sheet cannot be inspected */ }
    }
    return { rulesSeen, missing: wanted.filter(selector => !hidden.has(selector)) };
  });
  for (const route of ['/', '/work', '/about']) {
    const context = await browser.newContext(base);
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', request => { if (request.resourceType() === 'stylesheet') requests.push(request.url()); });
    await page.goto(route);
    await page.waitForLoadState('load');
    const text = await css(page);
    expect(requests, `${route} requests no extra stylesheet (all CSS stays inline)`).toEqual([]);
    const hiding = await notHiddenByDefault(page);
    expect(hiding.rulesSeen, `${route} CSSOM is readable (nonempty)`).toBeGreaterThan(0);
    expect(hiding.missing, `${route} hides the new art by default`).toEqual([]);
    expect(text, `${route} keeps the planet group rules`).toMatch(/\.sv-hs-planet/);
    if (route === '/') expect(text, 'Home carries its world CSS').toMatch(homeRule);
    else {
      expect(text, `${route} omits the Home-only world CSS`).not.toMatch(homeRule);
      expect(text, `${route} carries its own identity tokens for the graded Neptune`).toMatch(/np-identity-scale/);
    }
    await context.close();
  }
  for (const route of ['/work', '/about']) {
    const context = await browser.newContext({ ...base, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto(route);
    expect(await shown(page, '.sv-ow-bodies'), `${route} paints none of the new bodies`).toBe(false);
    expect(await shown(page, '.sv-hs-planet > .sv-ow-pimg image'), `${route} night paints the graded Neptune limb`).toBe(true);
    expect(await shown(page, '.sv-hs-planet > image'), `${route} no longer paints the retired crescent raster`).toBe(false);
    await context.close();
  }
});

test('a real control with keyboard-visible focus keeps the pointer star off until a fresh click in empty sky', async ({ browser }) => {
  const { context, page } = await open(browser, { ...base, colorScheme: 'light' }, '/', 'light');
  const errors = watchErrors(page);
  const sky = await skyPoints(page);
  const [sx, sy] = sky.a;
  const focus = () => page.evaluate(() => ({ tag: document.activeElement ? document.activeElement.tagName : '', visible: !!document.activeElement && document.activeElement.matches(':focus-visible') }));
  await establish(page, sx, sy);
  expect(await focus(), 'armed with only the reading container focused').toMatchObject({ visible: false });
  const summary = page.locator('.home-build summary');
  await expect(summary).toBeVisible();
  await summary.click(); // native click on the actual "What I'm exploring" control
  await page.keyboard.press('Shift'); // native key press and release gives that control keyboard-visible focus
  expect(await focus(), 'the control now has keyboard-visible focus').toEqual({ tag: 'SUMMARY', visible: true });
  await page.mouse.move(sx, sy);
  await page.mouse.move(sx + 12, sy + 8);
  await frames(page);
  expect(await starState(page), 'fresh mouse stays off while the control has keyboard-visible focus').toMatchObject({ on: false });
  await page.mouse.click(sx, sy); // native click on empty sky moves focus off the control
  expect((await focus()).visible, 'no control keeps keyboard-visible focus').toBe(false);
  await establish(page, sx, sy); // fresh mouse movement rearms
  expect(errors).toEqual([]);
  await context.close();
});

test('the pointer star is absent for reduced motion, coarse input, other routes and no JS', async ({ browser }) => {
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
  expect(await about.page.evaluate(() => document.querySelectorAll('.sv-ow-relight, foreignObject, .mtn-scene canvas').length)).toBe(0);
  await about.context.close();

  const plain = await browser.newContext({ ...base, javaScriptEnabled: false });
  const plainPage = await plain.newPage();
  await plainPage.goto('/');
  expect((await starState(plainPage)).present).toBe(false);
  expect(await shown(plainPage, '.sv-hs-planet > .sv-ow-pimg image')).toBe(true);
  await plain.close();
});

// ---- Graded sky fix pass (2026-11-03): sun placement, Moon in the top band, phone inner-page Neptune ----
type Rect = { left: number; top: number; right: number; bottom: number };
const rectGap = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));

// Every text box (main and header) and every header control, as plain rects.
const textAndControls = (page: Page) => page.evaluate(() => {
  const texts: { left: number; top: number; right: number; bottom: number }[] = [];
  for (const scope of [document.querySelector('main'), document.querySelector('.site-header')]) {
    if (!scope) continue;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent!.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const g of Array.from(range.getClientRects())) texts.push({ left: g.left, top: g.top, right: g.right, bottom: g.bottom });
    }
  }
  const controls = Array.from(document.querySelectorAll('.site-header a, .site-header button')).map(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
  return { texts, controls };
});

const sunFacts = (page: Page) => page.evaluate(() => {
  const circle = Array.from(document.querySelectorAll('.mtn-scene .sv-hs-sun circle')).find(node => node.getClientRects().length > 0);
  const r = circle ? circle.getBoundingClientRect() : null;
  const h1 = document.querySelector('main h1')!.getBoundingClientRect();
  return {
    sun: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null,
    header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
    column: h1.left, // the content column's left edge
    h1: { left: h1.left, top: h1.top, right: h1.right, bottom: h1.bottom },
    width: innerWidth, height: innerHeight,
  };
});

// Index routes play an arrival (about 1.1s) in which the sky rises into place: wait until a measured value is stable (two reads
// 250ms apart agree within 0.5px, bounded at 4s) before measuring. A value that is absent on both reads counts as stable, so the
// assertions after the wait report a missing body themselves.
async function untilStable(page: Page, read: () => Promise<number | null>) {
  await expect.poll(async () => {
    const first = await read();
    await page.waitForTimeout(250);
    const second = await read();
    if (first === null || second === null) return first === second;
    return Math.abs(first - second) <= 0.5;
  }, { timeout: 4000, intervals: [0], message: 'the sky has settled' }).toBe(true);
}

// The day sun on every route: wholly in the left margin beside the content column, 32px under the header, at the smaller of its
// art size and the margin it fits in; omitted where the margin is under 36px, at 200% text, in short landscape, on tablets and phones.
for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 800], [1440, 1200], [1280, 1280]] as const) {
  for (const route of ['/', '/about', '/work']) {
    test(`the day sun sits in the left margin, 32px under the header, on ${route} at ${width}x${height}`, async ({ browser }) => {
      const { context, page } = await open(browser, { ...base, viewport: { width, height } }, route, 'light');
      await untilStable(page, async () => (await sunFacts(page)).sun?.top ?? null);
      const f = await sunFacts(page);
      expect(f.sun, 'the sun shows').not.toBeNull();
      const s = f.sun!;
      const column = Math.max(0, (width - 1180) / 2) + 32;
      expect(Math.abs(f.column - column), 'the content column starts where the margin rule assumes').toBeLessThanOrEqual(1);
      const art = 56 * Math.max(width / 1600, (height + 96) / 900);
      const diameter = Math.min(art, column - 40);
      expect(Math.abs(s.width - diameter), 'diameter = min(art size, margin - 40px)').toBeLessThanOrEqual(1.5);
      expect(s.left, 'whole disc inside the viewport, 8px from the edge').toBeGreaterThanOrEqual(7);
      expect(s.top, 'top at least 32px below the header').toBeGreaterThanOrEqual(f.header + 31);
      expect(s.right, 'right edge at least 32px left of the content column').toBeLessThanOrEqual(f.column - 31);
      // Anchored exactly: top 32px under the header, right edge 32px left of the column.
      expect(Math.abs(s.top - (f.header + 32)), 'top anchor').toBeLessThanOrEqual(1.5);
      expect(Math.abs(s.right - (f.column - 32)), 'right anchor').toBeLessThanOrEqual(1.5);
      const { texts, controls } = await textAndControls(page);
      for (const box of [...texts, ...controls]) expect(rectGap(s, box), 'at least 32px from every text box and control').toBeGreaterThanOrEqual(31);
      await context.close();
    });
  }
}

test('the day sun is omitted where its margin cannot hold it, at 200% text, in short landscape, on tablets and phones', async ({ browser }) => {
  for (const [width, height] of [[1024, 768], [960, 700], [1024, 1024], [1200, 800], [900, 500], [820, 1180], [390, 844]] as const) {
    const touch = width < 900;
    for (const route of ['/', '/about']) {
      const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch }, route, 'light');
      expect(await shown(page, '.mtn-scene .sv-hs-sun'), `no sun on ${route} at ${width}x${height}`).toBe(false);
      await context.close();
    }
  }
  for (const route of ['/', '/about']) {
    const { context, page } = await open(browser, base, route, 'light');
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.waitForFunction(() => document.querySelector('.mtn-scene')!.hasAttribute('data-big'));
    expect(await shown(page, '.mtn-scene .sv-hs-sun'), `no sun on ${route} at 200% text`).toBe(false);
    await context.close();
  }
});

// The Moon in the top band: 32px under the header, 48px above the first paragraph, 32px from every other text box and control;
// its x position is unchanged (1200-1359px wide: right of the Neptune limb by the existing formula).
for (const [width, height, touch] of [[1280, 800, false], [1024, 768, false], [960, 700, false], [820, 1180, true], [900, 500, false]] as const) {
  test(`the Moon keeps clear of the nav and text in the top band at ${width}x${height}`, async ({ browser }) => {
    const { context, page } = await open(browser, { ...base, viewport: { width, height }, isMobile: touch, hasTouch: touch }, '/', 'light');
    const f = await page.evaluate(() => {
      const image = Array.from(document.querySelectorAll('.mtn-scene[data-mode="home"] .sv-ow-a image')).find(node => node.getClientRects().length > 0);
      const r = image ? image.getBoundingClientRect() : null;
      return {
        moon: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width } : null,
        header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
        intro: document.querySelector('.home-intro')!.getBoundingClientRect().top,
      };
    });
    expect(f.moon, 'the Moon shows in the top band').not.toBeNull();
    const m = f.moon!;
    expect(m.top, 'top at least 32px below the header').toBeGreaterThanOrEqual(f.header + 31);
    expect(m.bottom, 'at least 48px above the first paragraph').toBeLessThanOrEqual(f.intro - 47);
    const { texts, controls } = await textAndControls(page);
    for (const box of [...texts, ...controls]) {
      // The first paragraph is held to 48px (above); every other text box and control to 32px.
      expect(rectGap(m, box), 'at least 32px from every other text box and control').toBeGreaterThanOrEqual(31);
    }
    if (width === 1280) {
      const expectedCentre = (width - 60) - Math.min(0.25 * width, 420) - 100;
      expect(Math.abs((m.left + m.right) / 2 - expectedCentre), 'x position unchanged').toBeLessThanOrEqual(1.5);
      expect(m.width, 'full mid-tier size (about 56px) where it fits').toBeGreaterThanOrEqual(54);
    } else {
      expect(m.width, 'shrunk by at most to 0.6x of its mid-tier size').toBeGreaterThanOrEqual(0.6 * (width === 820 ? 44 : width === 900 ? 27 : 70));
    }
    await context.close();
  });
}

// Inner pages on phones: the graded Neptune's lowest point is 140px under the header (both themes), clear of the page title,
// and at night every route takes the index exposure 0.75 (calm routes keep 0.55 by day).
for (const [width, height] of [[390, 844], [375, 812], [719, 1000]] as const) {
  for (const route of ['/about', '/work']) {
    for (const theme of ['light', 'dark'] as const) {
      test(`phone ${route} Neptune: lowest point 140px under the header, clear of the title, exposure by theme at ${width}x${height} (${theme})`, async ({ browser }) => {
        const { context, page } = await open(browser, { ...phone, viewport: { width, height }, colorScheme: theme }, route, theme);
        await untilStable(page, () => page.evaluate(() => {
          const image = Array.from(document.querySelectorAll('.mtn-scene .sv-hs-planet > .sv-ow-pimg image')).find(node => node.getClientRects().length > 0);
          const r = image ? image.getBoundingClientRect() : null;
          return r ? r.top + r.height / 2 + 0.495 * r.width : null; // the lowest point of the disc
        }));
        const f = await page.evaluate(() => {
          const image = Array.from(document.querySelectorAll('.mtn-scene .sv-hs-planet > .sv-ow-pimg image')).find(node => node.getClientRects().length > 0);
          const r = image ? image.getBoundingClientRect() : null;
          const title = document.querySelector('main h1');
          const glyphs: Rect[] = [];
          if (title) {
            const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const g of Array.from(range.getClientRects())) glyphs.push({ left: g.left, top: g.top, right: g.right, bottom: g.bottom });
            }
          }
          return {
            box: r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width } : null,
            opacity: image ? getComputedStyle(image).opacity : null,
            header: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
            glyphs,
          };
        });
        expect(f.box, 'the graded Neptune limb shows').not.toBeNull();
        const radius = 0.495 * f.box!.w; // disc radius is 0.495 of the square image box
        expect(Math.abs(f.box!.cy + radius - (f.header + 140)), 'lowest point 140px under the header').toBeLessThanOrEqual(3);
        expect(f.glyphs.length, 'page title was measured').toBeGreaterThan(0);
        for (const g of f.glyphs) {
          const nearX = Math.min(Math.max(f.box!.cx, g.left), g.right), nearY = Math.min(Math.max(f.box!.cy, g.top), g.bottom);
          expect(Math.hypot(nearX - f.box!.cx, nearY - f.box!.cy), 'the page title stays outside the disc').toBeGreaterThanOrEqual(radius);
        }
        // Dark: 0.75 on every route. Light: 0.75 on index routes (/work), 0.55 on calm routes (/about).
        const expected = theme === 'dark' || route === '/work' ? '0.75' : '0.55';
        expect(f.opacity, `exposure on ${route} (${theme})`).toBe(expected);
        await context.close();
      });
    }
  }
}

test('a failed real-material request leaves readable content, controls and the static scene intact', async ({ browser }) => {
  const broken = await browser.newContext({ ...base, colorScheme: 'light' });
  const target = '**/mountains/real-earth-morning.webp';
  await broken.route(target, route => route.abort());
  const page = await broken.newPage();
  const pageErrors = watchErrors(page);
  const failedRequests: string[] = [];
  page.on('requestfailed', request => failedRequests.push(request.url())); // the expected failure is captured separately
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).sonworkLandscape?.isActive);
  await page.waitForLoadState('load');
  expect(failedRequests.some(url => url.endsWith('/mountains/real-earth-morning.webp')), 'the aborted real-material request was observed').toBe(true);
  // Content and controls remain readable and operable; the scene keeps its static composition without that photograph.
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('#home-title')).toBeVisible();
  await expect(page.locator('.home-build summary')).toBeVisible();
  await expect(page.locator('.companion')).toBeVisible();
  // `skies` decodes every body and would throw on the aborted file, so the geometry is read directly (no caught-null pass).
  const geo = await page.evaluate(() => {
    const earth = Array.from(document.querySelectorAll('.mtn-scene[data-mode="home"] .sv-ow-b image')).find(node => node.getClientRects().length > 0);
    const box = earth ? earth.getBoundingClientRect() : null;
    return {
      scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
      front: getComputedStyle(document.querySelector('.front')!, '::before').content,
      earthWidth: box ? box.width : 0, earthHref: earth ? earth.getAttribute('href') : null,
    };
  });
  expect(geo.scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(geo.clientWidth);
  expect(geo.front, 'still no page-attached veil').toBe('none');
  expect(geo.earthHref, 'Earth keeps its declared source and static box').toBe(BODY_HREFS.b.light);
  expect(geo.earthWidth, 'Earth keeps its static box even though its photograph failed').toBeGreaterThan(0);
  expect(await shown(page, '.sv-hs-planet > .sv-ow-pimg image'), 'the other real bodies still paint').toBe(true);
  // The decorative star still works in open sky, and nothing threw a script error (a failed native image request is not one).
  const sky = await skyPoints(page);
  await establish(page, ...sky.a);
  expect(pageErrors, 'no script errors').toEqual([]);
  await broken.close();
});
