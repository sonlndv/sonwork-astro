import { expect, test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';

// Real application integration. Chromium touch input is emulation, never physical-phone evidence.
const desktop: BrowserContextOptions = {
  viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false,
  reducedMotion: 'no-preference', colorScheme: 'dark',
};
const scene = (page: Page) => page.locator('.mtn-scene');
const progress = (page: Page) => scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-progress')));

// Public Node PNG decoding: screenshots are noninterlaced 8-bit RGB/RGBA, with PNG filters 0..4.
function raster(png: Buffer) {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let width = 0, height = 0, channels = 0;
  const chunks: Buffer[] = [];
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    expect(offset + length + 12).toBeLessThanOrEqual(png.length);
    const kind = png.toString('ascii', offset + 4, offset + 8);
    const chunk = png.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      expect(chunk[8]).toBe(8);
      expect([2, 6]).toContain(chunk[9]);
      expect([...chunk.subarray(10, 13)]).toEqual([0, 0, 0]);
      channels = chunk[9] === 6 ? 4 : 3;
    } else if (kind === 'IDAT') chunks.push(chunk);
    offset += length + 12;
    if (kind === 'IEND') break;
  }
  expect(width * height * channels).toBeGreaterThan(0);
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  expect(raw.length).toBe((stride + 1) * height);
  const data = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1), row = y * stride, filter = raw[start];
    if (filter > 4) throw new Error('Unsupported PNG row filter: ' + filter);
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? data[row + x - channels] : 0;
      const up = y ? data[row + x - stride] : 0;
      const corner = y && x >= channels ? data[row + x - stride - channels] : 0;
      const p = left + up - corner;
      const a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - corner);
      const paeth = a <= b && a <= c ? left : b <= c ? up : corner;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth;
      data[row + x] = (raw[start + x + 1] + prediction) & 255;
    }
  }
  return { width, height, channels, data };
}

function paintControls(first: Buffer, hidden: Buffer, restored: Buffer) {
  const base = raster(first);
  const difference = (png: Buffer) => {
    const other = raster(png);
    expect([other.width, other.height, other.channels]).toEqual([base.width, base.height, base.channels]);
    let maximumChannel = 0, materialPixels = 0;
    for (let i = 0; i < base.data.length; i += base.channels) {
      let delta = 0;
      for (let channel = 0; channel < base.channels; channel++) delta = Math.max(delta, Math.abs(base.data[i + channel] - other.data[i + channel]));
      maximumChannel = Math.max(maximumChannel, delta);
      if (delta > 2) materialPixels += 1;
    }
    return { maximumChannel, materialPixels };
  };
  // Same measured bound as the shared-scene control: every restored channel <=2/255.
  // A real plane must change >2 levels in >=0.1% of pixels (minimum 64); tiny/no paint fails.
  return { paint: difference(hidden), restoration: difference(restored), minimumPaintPixels: Math.max(64, Math.ceil(base.width * base.height * 0.001)) };
}

async function paintedPlane(page: Page, role: string, baseline: Buffer, label: string) {
  const layer = scene(page).locator(':scope > .mtn-layer.mtn-' + role);
  await expect(layer).toHaveCount(1);
  const before = await geometry(page);
  const content = await page.locator('main').textContent();
  await layer.evaluate(el => { (el as HTMLElement).style.visibility = 'hidden'; });
  try {
    const hidden = await page.screenshot({ animations: 'disabled' });
    await layer.evaluate(el => { (el as HTMLElement).style.removeProperty('visibility'); });
    const restored = await page.screenshot({ animations: 'disabled' });
    const after = await geometry(page);
    const controls = paintControls(baseline, hidden, restored);
    await test.info().attach('plane-paint-controls-' + role, { body: JSON.stringify({ label, ...controls, before, after }, null, 2), contentType: 'application/json' });
    // Diagnostics only: keep the exact measured PNG buffers when restoration exceeds the unchanged 2/255 bound.
    if (controls.restoration.maximumChannel > 2) {
      const tag = (role + '-' + label).replace(/[^A-Za-z0-9]+/g, '-');
      await test.info().attach('plane-restoration-baseline-' + tag, { body: baseline, contentType: 'image/png' });
      await test.info().attach('plane-restoration-hidden-' + tag, { body: hidden, contentType: 'image/png' });
      await test.info().attach('plane-restoration-restored-' + tag, { body: restored, contentType: 'image/png' });
    }
    expect(after, label + ' unchanged independent canvas/plane geometry').toEqual(before);
    expect(await page.locator('main').textContent(), label + ' unchanged content').toBe(content);
    expect(controls.paint.materialPixels, label + ' material causal paint').toBeGreaterThanOrEqual(controls.minimumPaintPixels);
    expect(controls.restoration.maximumChannel, label + ' restored channels within measured raster noise').toBeLessThanOrEqual(2);
  } finally {
    await layer.evaluate(el => { (el as HTMLElement).style.removeProperty('visibility'); });
  }
}

async function open(browser: Browser, baseURL: string | undefined, options: BrowserContextOptions, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ baseURL, ...desktop, ...options });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await run(page);
    expect(errors, 'uncaught application errors').toEqual([]);
  } finally {
    await context.close();
  }
}

async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/, { timeout: 4000 });
}

async function geometry(page: Page) {
  return scene(page).evaluate(el => ({
    width: innerWidth, height: innerHeight, y: scrollY,
    overflow: document.documentElement.scrollWidth - innerWidth,
    layers: [...el.querySelectorAll<HTMLElement>(':scope > .mtn-layer')].map(layer => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(layer).transform);
      const bounds = layer.getBoundingClientRect();
      const art = [...layer.querySelectorAll<SVGSVGElement>(':scope > svg.mtn-ridge')]
        .filter(svg => getComputedStyle(svg).display !== 'none');
      const svg = art[0]?.getBoundingClientRect();
      return {
        role: layer.classList.contains('mtn-middle') ? 'middle' : layer.classList.contains('mtn-far') ? 'far' : 'near',
        x: matrix.m41, y: matrix.m42, outerTop: bounds.top, outerHeight: bounds.height,
        visibleCanvases: art.length,
        art: svg ? { left: svg.left, top: svg.top, width: svg.width, height: svg.height } : null,
        paths: art[0]?.querySelectorAll('path.mtn-lit').length ?? 0,
      };
    }),
    innerTransforms: [...el.querySelectorAll('.mtn-range')].map(group => getComputedStyle(group).transform),
  }));
}

// `state` selects an independently declared rest/journey pose of the approved sitewide world:
// 0 entry / no-JS, 1 the ending (Home scene 1 x max + settle 1 x tail), 0.44 a calm route (composed scene .8 x max),
// any other value the reduced rest (max x .75). max/tail: phone .36/.04, >=900px .6/.06.
function expectPose(value: Awaited<ReturnType<typeof geometry>>, state: number) {
  const wide = value.width >= 900;
  const tall = wide && value.width / value.height <= 1.25;
  // Declared max/tail: >=900px .6/.06; narrow portrait (<=899px and aspect <= 5/4) .36/.04; any other width the base .52/.06.
  const portrait = value.width <= 899 && value.width / value.height <= 1.25;
  const max = wide ? 0.6 : portrait ? 0.36 : 0.52, tail = wide ? 0.06 : portrait ? 0.04 : 0.06;
  const depth = state === 0 ? 0 : state === 1 ? max + tail : state === 0.44 ? 0.8 * max : 0.75 * max;
  expect(value.overflow).toBeLessThanOrEqual(0);
  expect(value.layers.map(layer => layer.role)).toEqual(['far', 'middle', 'near']);
  // Accepted authored poses (independent constants): far 34svh - 5svh*depth, middle 44svh - 44svh*depth,
  // near 46svh - 62svh*depth; the middle layer alone scales by 1 + 0.03*ease about its centre once the valley opens
  // (open = clamp((depth - 0.12) / 0.5), ease = smoothstep(open)). Translation and canvas size stay as authored.
  // Approved poses: narrow 34/44/46 svh (slopes 5/44/62); >=900px 34/36/38 (5/30/47); tall desktop 22/20/26 (5/18/34).
  const offsets = tall
    ? [0.22 - 0.05 * depth, 0.2 - 0.18 * depth, 0.26 - 0.34 * depth]
    : wide
      ? [0.34 - 0.05 * depth, 0.36 - 0.3 * depth, 0.38 - 0.47 * depth]
      : [0.34 - 0.05 * depth, 0.44 - 0.44 * depth, 0.46 - 0.62 * depth];
  const open = Math.min(1, Math.max(0, (depth - 0.12) / 0.5));
  const scales = [1, 1 + 0.03 * open * open * (3 - 2 * open), 1];
  value.layers.forEach((layer, i) => {
    const y = value.height * offsets[i];
    const s = scales[i];
    const full = value.height + 720;
    expect(layer.x).toBe(0);
    expect(layer.y).toBeCloseTo(y, 1);
    // Individual `scale` composes before the translation, so the scaled box carries s*y; the matrix above stays unscaled.
    expect(layer.outerTop).toBeCloseTo(-360 + s * y + full / 2 * (1 - s), 1);
    expect(layer.outerHeight).toBeCloseTo(full * s, 1);
    expect(layer.visibleCanvases).toBe(1);
    expect(layer.paths).toBe(1);
    expect(layer.art).not.toBeNull();
    expect(layer.art!.left).toBeCloseTo(value.width * (1 - s) / 2, 1);
    expect(layer.art!.top).toBeCloseTo(-360 + s * y + full / 2 + (312 - full / 2) * s, 1);
    expect(layer.art!.width).toBeCloseTo(value.width * s, 1);
    expect(layer.art!.height).toBeCloseTo((value.height + 96) * s, 1);
  });
  expect(value.innerTransforms.length).toBeGreaterThan(0);
  expect(value.innerTransforms.every(transform => transform === 'none')).toBe(true);
}

async function nativeScroll(page: Page, down: boolean, touch: boolean) {
  if (!touch) {
    await page.mouse.wheel(0, down ? 10_000 : -10_000);
    return;
  }
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const session = await page.context().newCDPSession(page);
  const x = viewport.width * 0.72;
  const from = viewport.height * (down ? 0.78 : 0.24);
  const to = viewport.height * (down ? 0.24 : 0.78);
  const time = Date.now() / 1000;
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from, id: 1 }], timestamp: time });
    for (let i = 1; i <= 8; i++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x, y: from + (to - from) * i / 8, id: 1 }], timestamp: time + i * 0.025,
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: time + 0.225 });
  } finally {
    await session.detach();
  }
}

async function toEdge(page: Page, down: boolean, touch: boolean) {
  for (let i = 0; i < 12; i++) {
    await nativeScroll(page, down, touch);
    const edge = await page.evaluate(down => down
      ? scrollY >= document.documentElement.scrollHeight - innerHeight - 1 : scrollY <= 1, down);
    if (edge) break;
  }
  await expect.poll(() => page.evaluate(down => down
    ? Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)) : scrollY, down)).toBeLessThanOrEqual(1);
  await expect.poll(() => progress(page)).toBeCloseTo(down ? 1 : 0, 4);
}

for (const profile of [
  { name: 'desktop night', width: 1440, height: 900, touch: false, theme: 'dark' as const },
  { name: 'phone daylight Chromium touch emulation', width: 375, height: 812, touch: true, theme: 'light' as const },
]) {
  test(`native reversible journey has independent painted depth and original canvas (${profile.name})`, async ({ browser, baseURL }, testInfo) => {
    await open(browser, baseURL, {
      viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, colorScheme: profile.theme,
    }, async page => {
      await page.addInitScript(() => {
        (window as any).__journeyScrolls = [];
        addEventListener('scroll', event => (window as any).__journeyScrolls.push({ trusted: event.isTrusted, y: scrollY }), { passive: true });
      });
      await page.goto('/');
      // Controlled notification probe, followed by the genuine, unpaused CSS arrival below.
      const noise = await scene(page).evaluate(el => {
        const viewport = () => [innerWidth, innerHeight, visualViewport?.width, visualViewport?.height,
          visualViewport?.offsetLeft, visualViewport?.offsetTop, visualViewport?.scale, scrollY];
        const effect = el.getAnimations({ subtree: true }).find(animation =>
          animation instanceof CSSAnimation && animation.animationName === 'mtn-near-in');
        if (!el.hasAttribute('data-intro') || !effect || effect.playState !== 'running') {
          throw new Error('Expected the actual running arrival before probing unchanged notifications');
        }
        const before = viewport();
        dispatchEvent(new Event('resize'));
        visualViewport?.dispatchEvent(new Event('resize'));
        return {
          before, after: viewport(), intro: el.hasAttribute('data-intro'),
          sameEffect: el.getAnimations({ subtree: true }).includes(effect), state: effect.playState,
        };
      });
      await testInfo.attach('controlled-identical-viewport-notifications', { body: JSON.stringify(noise, null, 2), contentType: 'application/json' });
      expect(noise.after).toEqual(noise.before);
      expect(noise.intro).toBe(true);
      expect(noise.sameEffect).toBe(true);
      expect(noise.state).toBe('running');
      // Natural-time evidence: no JS clock, seek, finish, or dispatched arrival event.
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', '1', { timeout: 3000 });
      await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'running');
      await settled(page);
      expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: profile.width, height: profile.height });
      if (!profile.touch) expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(true);
      await expect(scene(page)).toHaveAttribute('data-mode', 'home');
      await expect(page.locator('.mtn-scene')).toHaveCount(1);
      await expect(scene(page)).toHaveAttribute('aria-hidden', 'true');
      expect(await scene(page).evaluate(el => el.hasAttribute('inert') && getComputedStyle(el).pointerEvents === 'none')).toBe(true);
      const initialHeading = await page.locator('h1').boundingBox();
      const entry = await geometry(page);
      expectPose(entry, 0);
      const title = page.locator('.build-entry h3 a').first();
      const target = (await title.boundingBox())!;
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
      if (profile.touch) expect(target.y + target.height).toBeLessThanOrEqual(profile.height);
      expect(await title.evaluate(el => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a') === el;
      })).toBe(true);
      expect(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Space Mono');
      expect(await page.locator('.home-intro').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Geist');
      // A real intermediate input precedes the complete native traversal.
      if (profile.touch) await nativeScroll(page, true, true);
      else await page.mouse.wheel(0, 240);
      await expect.poll(() => progress(page)).toBeGreaterThan(0);
      const range = await geometry(page);
      const travel = range.layers.map((layer, i) => entry.layers[i].y - layer.y);
      expect(travel[0]).toBeGreaterThan(1);
      expect(travel[1]).toBeGreaterThan(travel[0]);
      expect(travel[2]).toBeGreaterThan(travel[1]);
      // Declared slopes: narrow 5/44/62, >=900px 5/30/47.
      expect(travel[1] / travel[0]).toBeCloseTo(profile.width >= 900 ? 30 / 5 : 44 / 5, 2);
      expect(travel[2] / travel[0]).toBeCloseTo(profile.width >= 900 ? 47 / 5 : 62 / 5, 2);
      expect(range.innerTransforms.every(transform => transform === 'none')).toBe(true);
      await toEdge(page, true, profile.touch);
      const ending = await geometry(page);
      expectPose(ending, 1);
      // Controlled paint diagnostic: freeze other decoration, then hide ONE actual outer plane.
      // Compare reproducible pixels, not CSS presence. Never alter progress or application state.
      // The shared helper also uses the real public Pause owner, so future recurring meteors cannot start; prior state is restored.
      await quiet(page, async () => {
        const baseline = await page.screenshot({ animations: 'disabled' });
        for (const role of ['far', 'middle', 'near']) {
          await paintedPlane(page, role, baseline, role + ' ending');
        }
      });
      await toEdge(page, false, profile.touch);
      expectPose(await geometry(page), 0);
      expect(await page.locator('h1').boundingBox()).toEqual(initialHeading);
      const events = await page.evaluate(() => (window as any).__journeyScrolls as { trusted: boolean; y: number }[]);
      expect(events.some(event => event.trusted && event.y > 0)).toBe(true);
      await testInfo.attach('native-depth-and-canvas', { body: JSON.stringify({ profile, entry, range, ending, events }, null, 2), contentType: 'application/json' });

      // Reload restores its actual native position/state; it need not replay an arrival after touch.
      await page.reload();
      await settled(page);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
      await expect.poll(() => progress(page)).toBe(0);
      expectPose(await geometry(page), 0);
    });
    // A separate fresh context supplies an independently eligible first arrival. No post-touch
    // reload assumption, navigation override, fake clock, or manufactured application event.
    await open(browser, baseURL, {
      viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, colorScheme: profile.theme,
    }, async page => {
      await page.goto('/');
      await expect(scene(page)).toHaveAttribute('data-arrival', 'first');
      const held = await scene(page).evaluateHandle(el => {
        const effect = el.getAnimations({ subtree: true }).find(animation =>
          animation instanceof CSSAnimation && animation.animationName === 'mtn-near-in');
        if (!el.hasAttribute('data-intro') || !effect || effect.playState !== 'running') throw new Error('Expected the genuine running first arrival');
        // Controlled pause of the actual CSS producer, never natural-time completion evidence.
        effect.pause();
        return effect;
      });
      try {
        await page.setViewportSize({ width: profile.width, height: profile.height - 32 });
        await expect.poll(() => page.evaluate(() => innerHeight)).toBe(profile.height - 32);
        await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
        await expect.poll(() => held.evaluate(effect => effect.playState)).toBe('idle');
        await expect(scene(page).locator('.mtn-rim[pathLength]')).toHaveCount(0);
        expectPose(await geometry(page), 0);
        await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', '0');
        await expect(page.locator('.mtn-mist')).not.toHaveAttribute('data-run', /.*/);
        await page.setViewportSize({ width: profile.width, height: profile.height });
        await expect.poll(() => page.evaluate(() => innerHeight)).toBe(profile.height);
        await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
        await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', '0');
        expectPose(await geometry(page), 0);
        await testInfo.attach('controlled-real-resize-cancellation', {
          body: JSON.stringify({ changedHeight: profile.height - 32, restored: await geometry(page), effectState: await held.evaluate(effect => effect.playState) }, null, 2),
          contentType: 'application/json',
        });
      } finally {
        await held.dispose();
      }
    });
  });
}

test('built file-format routes emit Home/index/calm modes and absent-Home routes start safely', async ({ browser, baseURL }) => {
  await open(browser, baseURL, {}, async page => {
    for (const [route, mode] of [
      ['/index.html', 'home'], ['/work.html', 'index'], ['/writing.html', 'index'],
      ['/about.html', 'calm'], ['/work/trivia-hub.html', 'calm'], ['/subscribe.html', 'calm'], ['/missing-sky-valley-page', 'calm'],
    ] as const) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(route.startsWith('/missing-') ? 404 : 200);
      await expect(scene(page)).toHaveCount(1);
      await expect(scene(page)).toHaveAttribute('data-mode', mode);
      await expect(page.locator('main')).toBeVisible();
      await expect(scene(page).locator(':scope > .mtn-layer')).toHaveCount(3);
      if (mode === 'calm') {
        await expect(scene(page)).toHaveAttribute('data-arrival', 'static');
        await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', '0');
        expectPose(await geometry(page), 0.44);
      }
    }
  });
});

test('Pause freezes painted progress while native scroll works; keyboard Resume aligns without replay', async ({ browser, baseURL }) => {
  await open(browser, baseURL, {}, async page => {
    await page.goto('/');
    await settled(page);
    await toEdge(page, true, false);
    const toggle = page.locator('.atmosphere-toggle');
    await toggle.click();
    await expect(toggle).toHaveText('Resume atmosphere');
    expect(await page.evaluate(() => localStorage.getItem('sonwork-atmosphere'))).toBe('paused');
    const frozen = await geometry(page);
    const passes = await page.locator('.mtn-mist').getAttribute('data-passes');
    await page.keyboard.press('Control+Home');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await progress(page)).toBe(1);
    expect((await geometry(page)).layers).toEqual(frozen.layers);
    await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
    await expect(scene(page)).not.toHaveAttribute('data-trace', /.*/);
    await expect(scene(page).locator('.mtn-rim[pathLength]')).toHaveCount(0);
    // Native keyboard activation with preventScroll focus preserves the position being resumed.
    await page.keyboard.press('Tab');
    await toggle.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveText('Pause atmosphere');
    await expect.poll(() => progress(page)).toBe(0);
    expectPose(await geometry(page), 0);
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-passes', passes!);
    await expect(page.locator('.mtn-mist')).not.toHaveAttribute('data-run', /.*/);
    await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
  });
});

test('native anchors/history/theme and disclosure/text/viewport changes retain usable geometry', async ({ browser, baseURL }, testInfo) => {
  await open(browser, baseURL, { viewport: { width: 375, height: 812 } }, async page => {
    const journey: Record<string, unknown>[] = [];
    const note = async (stage: string) => journey.push({ stage, ...await page.evaluate(() => ({
      y: scrollY, url: location.href, theme: document.documentElement.dataset.theme,
      transition: document.documentElement.getAttribute('data-theme-vt'),
      progress: Number(getComputedStyle(document.querySelector('.mtn-scene')!).getPropertyValue('--sv-progress')),
    })) });
    try {
    await page.goto('/');
    await settled(page);
    const jump = page.locator('.overlook-link');
    await page.keyboard.press('Tab');
    await jump.focus();
    expect(await jump.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#home-projects$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expect.poll(() => progress(page)).toBeGreaterThan(0);
    const anchorY = await page.evaluate(() => scrollY);
    const beforeTheme = await progress(page);
    await note('native-anchor');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // Ordinary history starts after the existing finite theme transition has finished.
    // Rapid navigation during its aperture is an observed R8/candidate limitation, not a PASS here.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/);
    await expect.poll(() => progress(page)).toBeCloseTo(beforeTheme, 4);
    await note('settled-theme-before-link');
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(anchorY, 0);
    await page.locator('.build-entry h3 a').first().click();
    await expect(page).toHaveURL(/\/work\/trivia-hub$/);
    await note('native-detail');
    await page.goBack();
    await expect(page).toHaveURL(/#home-projects$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/);
    await note('back-before-restoration-poll');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(anchorY, 0);
    await expect.poll(() => progress(page)).toBeCloseTo(beforeTheme, 3);
    await note('restored-native-anchor');
    const summary = page.locator('details.home-build > summary');
    await summary.scrollIntoViewIfNeeded();
    const generation = Number(await scene(page).getAttribute('data-geometry'));
    await summary.click();
    await expect(page.locator('details.home-build')).toHaveAttribute('open', '');
    await expect.poll(async () => Number(await scene(page).getAttribute('data-geometry'))).toBeGreaterThan(generation);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.locator('.home-intro')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => innerWidth)).toBe(320);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.front-newsletter button')).toHaveCount(1);
    await expect(page.locator('.front-newsletter button')).toBeDisabled();
    await note('reload-after-disclosure-and-text-resize');
    } finally {
      await testInfo.attach('native-scroll-and-settled-theme-history', { body: JSON.stringify(journey, null, 2), contentType: 'application/json' });
    }
  });
});

test('live reduced/forced changes and no-JS keep complete static scenery and content', async ({ browser, baseURL }) => {
  await open(browser, baseURL, {}, async page => {
    await page.goto('/');
    await settled(page);
    await page.mouse.wheel(0, 240);
    await expect.poll(() => progress(page)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
    await expect(scene(page)).not.toHaveAttribute('data-cam', /.*/);
    await expect(scene(page)).not.toHaveAttribute('data-trace', /.*/);
    await expect(scene(page).locator('.mtn-rim[pathLength]')).toHaveCount(0);
    expectPose(await geometry(page), 0.38);
    expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator('.atmosphere-toggle')).toBeHidden();
    for (const [route, mode] of [['/work.html', 'index'], ['/about.html', 'calm'], ['/index.html', 'home']] as const) {
      await page.goto(route);
      await expect(scene(page)).toHaveAttribute('data-mode', mode);
      await expect(page.locator('main')).toBeVisible();
      await expect(scene(page)).toBeVisible();
      expectPose(await geometry(page), 0.38);
      await expect(scene(page).locator('.mtn-rim[pathLength]')).toHaveCount(0);
      await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
      await expect(scene(page)).not.toHaveAttribute('data-trace', /.*/);
      expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
      await expect(page.locator('.atmosphere-toggle')).toBeHidden();
      // Each reduced-mode route retains actual paint in all three independently measured planes.
      const baseline = await page.screenshot({ animations: 'disabled' });
      for (const role of ['far', 'middle', 'near']) {
        await paintedPlane(page, role, baseline, mode + ' reduced ' + role);
      }
    }
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(scene(page)).toHaveCSS('display', 'none');
    await expect(page.locator('main')).toBeVisible();
    expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'light' }, async page => {
    await page.goto('/'); // No page-side rAF/style-load promise in the no-JS branch.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.home-intro')).toBeVisible();
    await expect(page.locator('.companion')).toBeDisabled();
    await expect(page.locator('.atmosphere-toggle')).toBeHidden();
    expectPose(await geometry(page), 0);
    expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator('.build-entry')).toHaveCount(3);
    await expect(page.locator('.front-newsletter button')).toHaveCount(1);
    await expect(page.locator('.front-newsletter button')).toBeDisabled();
  });
});

test('landscape owns no idle timer/frame recurrence and clears work across simulated hidden/history lifecycle', async ({ browser, baseURL }, testInfo) => {
  await open(browser, baseURL, {}, async page => {
    await page.addInitScript(() => {
      const request = window.requestAnimationFrame;
      const cancel = window.cancelAnimationFrame;
      const set = window.setTimeout;
      const clearT = window.clearTimeout;
      const work = { frames: 0, timers: 0, pending: new Set<number>(), timerPending: new Map<number, number>(), delays: [] as number[] };
      const owned = () => /\/(?:mountains\/mountains|atmosphere)\.js/.test(new Error().stack || '');
      (window as any).__landscapeWork = work;
      window.requestAnimationFrame = function (this: Window, callback: FrameRequestCallback) {
        if (!owned()) return request.call(this, callback);
        work.frames += 1;
        const handle = request.call(this, function (this: Window, time: number) {
          work.pending.delete(handle);
          return callback.call(this, time);
        });
        work.pending.add(handle);
        return handle;
      };
      window.cancelAnimationFrame = function (this: Window, handle: number) {
        work.pending.delete(handle);
        return cancel.call(this, handle);
      };
      // Observation only: record pending timers owned by mountains.js/atmosphere.js (the approved sparse night-meteor
      // scheduler is the single permitted one); callbacks, delays and handles are passed through unchanged.
      window.setTimeout = function (this: Window, ...args: any[]) {
        if (!owned()) return Reflect.apply(set, this, args);
        work.timers += 1;
        work.delays.push(Number(args[1] ?? 0));
        const callback = args[0];
        let handle = 0;
        if (typeof callback === 'function') {
          args[0] = function (this: unknown, ...rest: unknown[]) {
            work.timerPending.delete(handle);
            return Reflect.apply(callback, this, rest);
          };
        }
        handle = Reflect.apply(set, this, args) as unknown as number;
        work.timerPending.set(handle, Number(args[1] ?? 0));
        return handle;
      } as typeof window.setTimeout;
      window.clearTimeout = function (this: Window, ...args: Parameters<typeof clearT>) {
        const handle: unknown = args[0];
        if (typeof handle === 'number') work.timerPending.delete(handle);
        return Reflect.apply(clearT, this, args);
      } as typeof window.clearTimeout;
    });
    const work = () => page.evaluate(() => {
      const value = (window as any).__landscapeWork;
      return { frames: value.frames, timers: value.timers, pending: value.pending.size, timerPending: value.timerPending.size, delays: [...value.delays] as number[] };
    });
    await page.goto('/');
    await settled(page);
    // Controlled completion of actual CSS/WAAPI effects; not natural-time finite proof.
    await scene(page).evaluate(el => el.getAnimations({ subtree: true }).forEach(effect => effect.finish()));
    await expect(page.locator('.mtn-mist')).toHaveAttribute('data-state', 'idle');
    await expect.poll(async () => (await work()).pending).toBe(0);
    await page.screenshot({ animations: 'disabled' });
    const idle = await work();
    await page.screenshot({ animations: 'disabled' });
    expect(await work()).toEqual(idle);
    expect(idle.frames).toBeGreaterThan(0);
    // Zero idle RAF recurrence stays. The only approved owned timer is the ONE sparse night-meteor scheduler
    // (Home/index, dark, focused, visible, not Paused): at most one pending, never a short ambient loop.
    expect(idle.timerPending).toBeLessThanOrEqual(1);
    expect(Math.min(...idle.delays, Infinity)).toBeGreaterThanOrEqual(1800);
    const p = await progress(page);
    // Explicit simulated document lifecycle, not evidence of a physical tab or native bfcache.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    await page.keyboard.press('End');
    await page.setViewportSize({ width: 1100, height: 780 });
    expect(await progress(page)).toBe(p);
    expect((await work()).pending).toBe(0);
    expect((await work()).timerPending, 'simulated hidden/pagehide leaves no owned timer').toBe(0);
    await expect(scene(page).locator('.mtn-rim[pathLength]')).toHaveCount(0);
    expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => progress(page)).toBeGreaterThan(0);
    await expect(scene(page)).not.toHaveAttribute('data-intro', /.*/);
    await expect(page.locator('.mtn-mist')).not.toHaveAttribute('data-run', /.*/);
    // A persisted pageshow may rearm the one sparse scheduler (>=1.8s idle); nothing else, and no RAF.
    expect((await work()).timerPending).toBeLessThanOrEqual(1);
    await testInfo.attach('observed-owner-work', { body: JSON.stringify({ idle, restored: await work() }, null, 2), contentType: 'application/json' });
  });
});

// Current world: the night sky is BACKGROUND art (stars + aurora) inside the two far-ridge SVGs, masked by
// each SVG's own skyline and posed by the shared --sv-progress. There is no foreground drawing, guide or
// header diagram. Every check below reads the real producers; hiding/restoring is a controlled paint diagnostic.
const twoFrames = (page: Page) => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const variantFor = (size: { width: number; height: number }) =>
  size.width <= 899 && size.width / size.height <= 1.25 ? 'tall' : 'wide';

// Legacy (R8-era) oracles for the `.sv-sky` / `.sv-stars` / aurora groups. The approved world INTENTIONALLY hides
// them on every route; they are kept only as dead reference and are not called by any case.
const legacySkyFacts = (page: Page) => page.evaluate(() => {
  const svgs = [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')];
  const visible = svgs.filter(svg => getComputedStyle(svg).display !== 'none');
  const own = (svg: SVGSVGElement) => svg.querySelectorAll(':scope > g.sv-sky');
  const maskMatches = svgs.length > 0 && svgs.every(svg => {
    const sky = svg.querySelector(':scope > g.sv-sky');
    const id = /url\(#([^)]+)\)/.exec(sky?.getAttribute('mask') ?? '')?.[1];
    const cut = id ? svg.querySelector(`mask[id="${id}"] path[fill="#000"]`) : null;
    const surface = svg.querySelector('path.mtn-lit');
    return !!cut && !!surface && /^sv-surface-far-/.test(surface.id) && cut.getAttribute('d') === surface.getAttribute('d');
  });
  const svg = visible[0];
  const sky = svg?.querySelector<SVGGElement>(':scope > g.sv-sky') ?? null;
  const cs = sky ? getComputedStyle(sky) : null;
  return {
    variants: svgs.length, visibleVariants: visible.length, ownSkies: svgs.map(s => own(s).length),
    role: svg ? (svg.classList.contains('mtn-tall') ? 'tall' : 'wide') : '',
    shown: !!cs && cs.display !== 'none' && Number(cs.opacity) > 0.02,
    opacity: cs ? Number(cs.opacity) : 0,
    stars: sky?.querySelectorAll('.sv-stars circle').length ?? 0,
    nonCircleStars: [...(sky?.querySelectorAll('.sv-stars > *') ?? [])].filter(n => n.tagName !== 'circle').length,
    aurora: sky?.querySelectorAll('.sv-aurora path[d]').length ?? 0,
    curved: [...(sky?.querySelectorAll('.sv-aurora path[d]') ?? [])].some(p => /C/.test(p.getAttribute('d')!)),
    chart: sky?.querySelectorAll('line, polyline, polygon, text, [class*="guide"], [class*="constellation"]').length ?? -1,
    foreign: document.querySelectorAll('.sv-constellation, .sv-constellation-simple, .sv-constellation-guide, .sv-gutter-sky').length,
    maskMatches,
  };
});

function legacyExpectSkyShape(f: Awaited<ReturnType<typeof legacySkyFacts>>, role: string, label = 'sky') {
  expect(f.variants, label + ' two far variants').toBe(2);
  expect(f.ownSkies, label + ' one masked sky per variant').toEqual([1, 1]);
  expect(f.visibleVariants, label + ' exactly one visible variant').toBe(1);
  expect(f.role, label + ' visible variant').toBe(role);
  expect(f.foreign, label + ' no constellation/guide/gutter drawing').toBe(0);
  expect(f.chart, label + ' no connecting chart primitives').toBe(0);
  expect(f.nonCircleStars, label + ' stars are plain points').toBe(0);
  expect(f.stars, label + ' sparse stars').toBeGreaterThanOrEqual(12);
  expect(f.stars, label + ' sparse stars').toBeLessThanOrEqual(60);
  expect(f.aurora, label + ' aurora folds and rays').toBeGreaterThanOrEqual(5);
  expect(f.curved, label + ' curved aurora').toBe(true);
  expect(f.maskMatches, label + ' sky cut by the exact far surface').toBe(true);
}

// ---- Approved sitewide world: the visible sky is the additive `.sv-home-sky` group inside each far-ridge SVG,
// masked by the original exact skyline. Night (`.sv-hs-night`) holds the fixed illustrative Aquarius field: 18 HIP-labelled
// fallback points (`.sv-hs-core`) until the catalogue field (`.sv-hs-full`, <=600 per variant, 308 wide / 246 tall) replaces
// them (`data-sky="full"`), a quiet partial planet and the meteor. No aurora, no chart lines, no night clouds.
const skyFacts = async (page: Page) => {
  const scripted = await page.evaluate(() => document.documentElement.classList.contains('js'));
  if (scripted) await expect(scene(page)).toHaveAttribute('data-sky', 'full', { timeout: 5000 });
  return page.evaluate(() => {
    const svgs = [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')];
    const visible = svgs.filter(svg => getComputedStyle(svg).display !== 'none');
    const maskMatches = svgs.length > 0 && svgs.every(svg => {
      const home = svg.querySelector(':scope > g.sv-home-sky');
      const id = /url\(#([^)]+)\)/.exec(home?.getAttribute('mask') ?? '')?.[1];
      const cut = id ? svg.querySelector(`mask[id="${id}"] path[fill="#000"]`) : null;
      const surface = svg.querySelector('path.mtn-lit');
      return !!cut && !!surface && /^sv-surface-far-/.test(surface.id) && cut.getAttribute('d') === surface.getAttribute('d');
    });
    const svg = visible[0];
    const home = svg?.querySelector<SVGGElement>(':scope > g.sv-home-sky') ?? null;
    const night = home?.querySelector<SVGGElement>(':scope > g.sv-hs-night') ?? null;
    const shown = !!night && !!home && getComputedStyle(night).display !== 'none' && Number(getComputedStyle(home).opacity) > 0.02;
    const groups = [...(svg?.querySelectorAll<SVGGElement>('g.sv-hs-sky') ?? [])].filter(g => getComputedStyle(g).display !== 'none');
    const stars = groups.flatMap(g => [...g.children]);
    const hips = stars.map(n => Number(n.getAttribute('data-hip')));
    return {
      variants: svgs.length, visibleVariants: visible.length,
      ownSkies: svgs.map(s => s.querySelectorAll(':scope > g.sv-home-sky').length),
      role: svg ? (svg.classList.contains('mtn-tall') ? 'tall' : 'wide') : '',
      shown, opacity: home ? Number(getComputedStyle(home).opacity) : 0,
      full: document.querySelector('.mtn-scene')?.getAttribute('data-sky') === 'full',
      groupKinds: shown ? groups.map(g => (g.classList.contains('sv-hs-full') ? 'full' : 'core')) : [],
      stars: shown ? stars.length : 0,
      nonCircleStars: stars.filter(n => n.tagName !== 'circle').length,
      labelled: hips.every(h => Number.isInteger(h) && h > 0), uniqueHip: new Set(hips).size === hips.length,
      waterJar: [110395, 110960, 111497, 110672].every(h => hips.includes(h)),
      visibleAurora: [...(svg?.querySelectorAll('.sv-aurora') ?? [])].filter(el => getComputedStyle(el).display !== 'none').length,
      chart: home?.querySelectorAll('line, polyline, polygon, text, [class*="guide"], [class*="constellation"]').length ?? -1,
      foreign: document.querySelectorAll('.sv-constellation, .sv-constellation-simple, .sv-constellation-guide, .sv-gutter-sky').length,
      maskMatches,
    };
  });
};

function expectSkyShape(f: Awaited<ReturnType<typeof skyFacts>>, role: string, label = 'sky') {
  expect(f.variants, label + ' two far variants').toBe(2);
  expect(f.ownSkies, label + ' one masked home sky per variant').toEqual([1, 1]);
  expect(f.visibleVariants, label + ' exactly one visible variant').toBe(1);
  expect(f.role, label + ' visible variant').toBe(role);
  expect(f.shown, label + ' night sky visible').toBe(true);
  expect(f.foreign, label + ' no constellation/guide/gutter drawing').toBe(0);
  expect(f.chart, label + ' no connecting chart primitives').toBe(0);
  expect(f.visibleAurora, label + ' no aurora in the approved world').toBe(0);
  expect(f.nonCircleStars, label + ' stars are plain points').toBe(0);
  expect(f.labelled && f.uniqueHip, label + ' every point carries a unique HIP').toBe(true);
  expect(f.waterJar, label + ' Aquarius Water Jar (Gamma, Zeta, Eta, Pi) present').toBe(true);
  expect(f.stars, label + ' genuine points').toBeGreaterThanOrEqual(12);
  expect(f.stars, label + ' at most 600 per variant').toBeLessThanOrEqual(600);
  if (f.full) {
    expect(f.groupKinds, label + ' catalogue field replaces the fallback').toEqual(['full']);
    expect(f.stars, label + ' catalogue points').toBe(role === 'tall' ? 246 : 308);
  } else {
    expect(f.groupKinds, label + ' static fallback core').toEqual(['core']);
    expect(f.stars, label + ' fallback points').toBe(18);
  }
  expect(f.maskMatches, label + ' sky cut by the exact far surface').toBe(true);
}

const visibleFarSvg = () => [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')].find(s => getComputedStyle(s).display !== 'none')!;
const setSky = (page: Page, kind: 'sky' | 'stars', hide: boolean) => page.evaluate(([kind, hide]) => {
  const svg = [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')].find(s => getComputedStyle(s).display !== 'none')!;
  const nodes = kind === 'sky'
    ? [...svg.querySelectorAll<SVGElement>(':scope > g.sv-home-sky')]
    : [...svg.querySelectorAll<SVGElement>('g.sv-hs-sky')].filter(g => getComputedStyle(g).display !== 'none');
  nodes.forEach(el => { if (hide) el.style.visibility = 'hidden'; else el.style.removeProperty('visibility'); });
  return nodes.length;
}, [kind, hide] as const);

const quietCss = '*{animation:none!important;transition:none!important;caret-color:transparent!important}.companion,#companion-return{visibility:hidden!important}';
async function quiet<T>(page: Page, run: () => Promise<T>) {
  const style = await page.evaluateHandle(css => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.append(s);
    return s;
  }, quietCss);
  // The approved finite meteor scheduler can create FUTURE shots, which pausing current WAAPI cannot stop. When scripts run,
  // use the REAL public Pause owner (the footer button) and restore its prior state afterwards; with JavaScript disabled
  // there is no scheduler and nothing is clicked.
  const pauseState = await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('.atmosphere-toggle');
    if (!button || button.hidden || !document.documentElement.classList.contains('js')) return 'none';
    if (button.textContent === 'Resume atmosphere') return 'already';
    button.click();
    return 'paused';
  });
  // Bounded parent-side settle (no page frame/timer promise, so it is safe with JavaScript disabled).
  await page.waitForTimeout(50);
  // Freeze only the WebAnimations that are running right now; already paused/finished/cancelled ones are left alone.
  const held = await page.evaluateHandle(() => {
    const running = document.getAnimations().filter(a => a.playState === 'running');
    running.forEach(a => a.pause());
    return running;
  });
  try { return await run(); } finally {
    if (pauseState === 'paused') await page.evaluate(() => document.querySelector<HTMLButtonElement>('.atmosphere-toggle')?.click()).catch(() => undefined);
    await held.evaluate(list => list.forEach(a => { if (a.playState === 'paused') a.play(); })).catch(() => undefined);
    await held.dispose().catch(() => undefined);
    await style.evaluate(el => el.remove());
  }
}
// Inside quiet() the pose is frozen by the helper, so Playwright must not fast-forward or cancel finite work.
const shot = (page: Page, clip?: { x: number; y: number; width: number; height: number }) =>
  page.screenshot({ ...(clip ? { clip } : {}), animations: 'allow' });

// Pixel control: hiding the whole sky, then only its stars, must change real pixels; restoring must not.
async function skyPaint(page: Page, label: string) {
  await quiet(page, async () => {
    try {
      const first = await shot(page);
      expect(await setSky(page, 'sky', true), label + ' selects the one visible .sv-home-sky').toBe(1);
      const noSky = await shot(page);
      await setSky(page, 'sky', false);
      const restored = await shot(page);
      expect(await setSky(page, 'stars', true), label + ' selects the visible HIP star group').toBeGreaterThan(0);
      const noStars = await shot(page);
      await setSky(page, 'stars', false);
      const sky = paintControls(first, noSky, restored);
      const stars = paintControls(first, noStars, restored);
      await test.info().attach('sky-paint-controls', { body: JSON.stringify({ label, sky, stars }, null, 2), contentType: 'application/json' });
      expect(sky.paint.materialPixels, label + ' sky paints').toBeGreaterThanOrEqual(sky.minimumPaintPixels);
      expect(stars.paint.materialPixels, label + ' stars paint').toBeGreaterThanOrEqual(12);
      expect(sky.restoration.maximumChannel, label + ' restored').toBeLessThanOrEqual(2);
    } finally {
      await setSky(page, 'sky', false);
      await setSky(page, 'stars', false);
    }
  });
}
async function legacySkyPaint(page: Page, label: string) {
  await quiet(page, async () => {
    const set = (selector: string, hide: boolean) => page.locator(selector).evaluateAll((nodes, hidden) => nodes.forEach(el => {
      if (hidden) (el as SVGElement).style.visibility = 'hidden'; else (el as SVGElement).style.removeProperty('visibility');
    }), hide);
    try {
      const first = await shot(page);
      await set('.sv-sky', true);
      const noSky = await shot(page);
      await set('.sv-sky', false);
      const restored = await shot(page);
      await set('.sv-stars', true);
      const noStars = await shot(page);
      await set('.sv-stars', false);
      const sky = paintControls(first, noSky, restored);
      const stars = paintControls(first, noStars, restored);
      await test.info().attach('sky-paint-controls', { body: JSON.stringify({ label, sky, stars }, null, 2), contentType: 'application/json' });
      expect(sky.paint.materialPixels, label + ' sky paints').toBeGreaterThanOrEqual(sky.minimumPaintPixels);
      expect(stars.paint.materialPixels, label + ' stars paint').toBeGreaterThanOrEqual(12);
      expect(sky.restoration.maximumChannel, label + ' restored').toBeLessThanOrEqual(2);
    } finally {
      await set('.sv-sky', false);
      await set('.sv-stars', false);
    }
  });
}

// Original terrain occlusion through the real skyline mask: a white probe added inside the live stars group
// shows above the skyline (positive control) and is cut by the mask below it (no light leaks through terrain).
async function maskProbe(page: Page, label: string) {
  await quiet(page, async () => {
    const probes = (on: boolean) => page.evaluate(on => {
      document.querySelectorAll('.sv-probe-test').forEach(n => n.remove());
      if (!on) return null;
      const svg = [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')].find(s => getComputedStyle(s).display !== 'none')!;
      const surface = svg.querySelector<SVGGeometryElement>('path.mtn-lit')!;
      const home = svg.querySelector(':scope > g.sv-home-sky')!;
      const group = home.querySelector(':scope > g.sv-hs-night')!;
      // The night group carries its own vertical offset inside the masked container; account for it (user units) so
      // the probe sits at the intended skyline-relative height. The bounding box below includes every ancestor CTM.
      const parts = getComputedStyle(group).translate.split(' ');
      const ty = parts.length > 1 ? parseFloat(parts[1]) || 0 : 0;
      const vb = svg.viewBox.baseVal, x = vb.x + vb.width / 2;
      let skyline = -300;
      while (skyline < 900 && !surface.isPointInFill(new DOMPoint(x, skyline))) skyline += 2;
      const rect = (cy: number) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('class', 'sv-probe-test');
        c.setAttribute('cx', String(x)); c.setAttribute('cy', String(cy - ty)); c.setAttribute('r', '14');
        c.setAttribute('fill', '#fff'); c.setAttribute('opacity', '1');
        group.append(c);
        const r = c.getBoundingClientRect();
        return { x: Math.max(0, Math.floor(r.left) - 2), y: Math.max(0, Math.floor(r.top) - 2), width: Math.ceil(r.width) + 4, height: Math.ceil(r.height) + 4 };
      };
      return { above: rect(skyline - 60), below: rect(skyline + 36), viewport: [innerWidth, innerHeight] };
    }, on);
    try {
      const plan = (await probes(true))!;
      await probes(false);
      for (const clip of [plan.above, plan.below]) {
        expect(clip.width, label + ' probe on screen').toBeGreaterThan(8);
        expect(clip.x + clip.width, label + ' probe inside viewport').toBeLessThanOrEqual(plan.viewport[0]);
        expect(clip.y + clip.height, label + ' probe inside viewport').toBeLessThanOrEqual(plan.viewport[1]);
      }
      const baseA = await shot(page, plan.above);
      const baseB = await shot(page, plan.below);
      await probes(true);
      const withA = await shot(page, plan.above);
      const withB = await shot(page, plan.below);
      await probes(false);
      const againA = await shot(page, plan.above);
      const againB = await shot(page, plan.below);
      const above = paintControls(baseA, withA, againA);
      const below = paintControls(baseB, withB, againB);
      await test.info().attach('sky-mask-probe', { body: JSON.stringify({ label, above, below }, null, 2), contentType: 'application/json' });
      expect(above.paint.materialPixels, label + ' probe visible in open sky').toBeGreaterThanOrEqual(64);
      expect(below.paint.maximumChannel, label + ' probe cut by terrain mask').toBeLessThanOrEqual(2);
      expect(above.restoration.maximumChannel).toBeLessThanOrEqual(2);
    } finally {
      await probes(false);
    }
  });
}
async function legacyMaskProbe(page: Page, label: string) {
  await quiet(page, async () => {
    const probes = (on: boolean) => page.evaluate(on => {
      document.querySelectorAll('.sv-probe-test').forEach(n => n.remove());
      if (!on) return null;
      const svg = [...document.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')].find(s => getComputedStyle(s).display !== 'none')!;
      const surface = svg.querySelector<SVGGeometryElement>('path.mtn-lit')!;
      const group = svg.querySelector('.sv-stars')!;
      const vb = svg.viewBox.baseVal, x = vb.x + vb.width / 2;
      let skyline = -300;
      while (skyline < 900 && !surface.isPointInFill(new DOMPoint(x, skyline))) skyline += 2;
      const rect = (cy: number) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('class', 'sv-probe-test');
        c.setAttribute('cx', String(x)); c.setAttribute('cy', String(cy)); c.setAttribute('r', '14');
        c.setAttribute('fill', '#fff'); c.setAttribute('opacity', '1');
        group.append(c);
        const r = c.getBoundingClientRect();
        return { x: Math.max(0, Math.floor(r.left) - 2), y: Math.max(0, Math.floor(r.top) - 2), width: Math.ceil(r.width) + 4, height: Math.ceil(r.height) + 4 };
      };
      return { above: rect(skyline - 60), below: rect(skyline + 36), viewport: [innerWidth, innerHeight] };
    }, on);
    try {
      const plan = (await probes(true))!;
      await probes(false);
      for (const clip of [plan.above, plan.below]) {
        expect(clip.width, label + ' probe on screen').toBeGreaterThan(8);
        expect(clip.x + clip.width, label + ' probe inside viewport').toBeLessThanOrEqual(plan.viewport[0]);
        expect(clip.y + clip.height, label + ' probe inside viewport').toBeLessThanOrEqual(plan.viewport[1]);
      }
      const baseA = await shot(page, plan.above);
      const baseB = await shot(page, plan.below);
      await probes(true);
      const withA = await shot(page, plan.above);
      const withB = await shot(page, plan.below);
      await probes(false);
      const againA = await shot(page, plan.above);
      const againB = await shot(page, plan.below);
      const above = paintControls(baseA, withA, againA);
      const below = paintControls(baseB, withB, againB);
      await test.info().attach('sky-mask-probe', { body: JSON.stringify({ label, above, below }, null, 2), contentType: 'application/json' });
      expect(above.paint.materialPixels, label + ' probe visible in open sky').toBeGreaterThanOrEqual(64);
      expect(below.paint.maximumChannel, label + ' probe cut by terrain mask').toBeLessThanOrEqual(2);
      expect(above.restoration.maximumChannel).toBeLessThanOrEqual(2);
    } finally {
      await probes(false);
    }
  });
}

// The scene is a background: behind content, inert and click-through. Visible foreground controls must
// still receive the pointer (hit-testing independent of the sky's geometry).
const sceneBehind = (page: Page) => scene(page).evaluate(el => {
  const cs = getComputedStyle(el);
  return el.hasAttribute('inert') && cs.position === 'fixed' && cs.pointerEvents === 'none' && Number(cs.zIndex) < 0;
});
const unreachable = (page: Page) => page.evaluate(() => {
  const bad: string[] = [];
  const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
  document.querySelectorAll<HTMLElement>('a, button, summary, input, select, textarea').forEach(el => {
    if (el.closest('.mtn-scene, .site-header, [hidden], .skip-link, .companion')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getClientRects()[0];
    if (!r || r.width < 8 || r.height < 8 || r.left < 0 || r.right > innerWidth || r.top < header || r.bottom > innerHeight) return;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || !el.contains(hit)) bad.push(el.tagName + ':' + (el.textContent || '').trim().slice(0, 24));
  });
  return bad;
});
const expectReadable = async (page: Page, label: string) => {
  expect(await sceneBehind(page), label + ' scene is an inert background').toBe(true);
  expect(await unreachable(page), label + ' foreground controls reachable above the sky').toEqual([]);
};
// Resting aurora/stars: both far variants (2 + 2 groups). Zero offsets may serialize as the identity matrix.
// Approved world: the HIP-labelled sky groups (core + catalogue, both variants) own no running animation and the
// camera is not live, i.e. no autonomous drift.
const skyAtRest = (page: Page) => page.evaluate(() => {
  const groups = [...document.querySelectorAll<SVGElement>('g.sv-hs-sky')];
  const root = document.querySelector<HTMLElement>('.mtn-scene')!;
  // clearCamera removes the hover offsets; CSS reads them with fallback 0 and never declares them, so both stay empty at rest.
  const offsetsUnset = ['--mtn-bx', '--mtn-by'].every(name =>
    root.style.getPropertyValue(name) === '' && getComputedStyle(root).getPropertyValue(name).trim() === '');
  return { count: groups.length, rest: !root.hasAttribute('data-cam') && offsetsUnset && groups.every(g => g.getAnimations().length === 0) };
});
const legacySkyAtRest = (page: Page) => page.locator('.sv-aurora, .sv-stars').evaluateAll(nodes => ({
  count: nodes.length,
  rest: nodes.every(el => {
    const transform = getComputedStyle(el).transform;
    return transform === 'none' || new DOMMatrixReadOnly(transform).isIdentity;
  }),
}));
// Pause/theme/static pose signature of the CURRENT world: the visible variant's `.sv-home-sky` (opacity, night display),
// its shown HIP star points, and the scene's progress / cloud travel / sky travel. A missing visible sky fails.
const skySignature = (page: Page) => scene(page).evaluate(el => {
  const svg = [...el.querySelectorAll<SVGSVGElement>('.mtn-far > svg.mtn-ridge')].find(s => getComputedStyle(s).display !== 'none');
  const home = svg?.querySelector(':scope > g.sv-home-sky');
  if (!svg || !home) throw new Error('Expected one visible far variant with a .sv-home-sky');
  const night = home.querySelector(':scope > g.sv-hs-night')!;
  const nightShown = getComputedStyle(night).display !== 'none';
  const points = nightShown
    ? [...svg.querySelectorAll('g.sv-hs-sky')].filter(g => getComputedStyle(g).display !== 'none').reduce((n, g) => n + g.children.length, 0)
    : 0;
  return {
    progress: getComputedStyle(el).getPropertyValue('--sv-progress'),
    cloud: getComputedStyle(el).getPropertyValue('--sv-cloud-travel'),
    skyTravel: getComputedStyle(el).getPropertyValue('--sv-hs'),
    opacity: getComputedStyle(home).opacity, nightShown, points,
  };
});

test('night sky is a painted far-SVG background: variants, sparse points, curved aurora, exact terrain mask', async ({ browser, baseURL }) => {
  for (const size of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await open(browser, baseURL, { viewport: size }, async page => {
      await page.goto('/');
      await settled(page);
      expectSkyShape(await skyFacts(page), variantFor(size), `${size.width}x${size.height}`);
      await skyPaint(page, `${size.width}x${size.height}`);
      await maskProbe(page, `${size.width}x${size.height}`);
    });
  }
});

test('night sky follows native progress and shares Pause/theme state; day has cloud shadow instead', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { viewport: { width: 375, height: 812 } }, async page => {
    await page.goto('/');
    await settled(page);
    const entryFacts = await skyFacts(page);
    expectSkyShape(entryFacts, 'tall');
    expect(entryFacts.opacity).toBeCloseTo(1, 2);
    await expect(page.locator('.sv-cloud-surface')).toHaveCount(6);
    expect(await page.locator('.sv-cloud-surface').evaluateAll(nodes => nodes.every(el =>
      getComputedStyle(el).display === 'none'))).toBe(true);
    const entry = await geometry(page);
    // Same scene and progress: the far plane carries the sky; no independent drift without a mouse.
    await toEdge(page, true, false);
    const valley = await geometry(page);
    expect(valley.layers[0].y).toBeLessThan(entry.layers[0].y);
    // The 0.82 fade belonged to the hidden legacy `.sv-sky`; the approved visible `.sv-home-sky` declares no local fade (opacity 1).
    expect((await skyFacts(page)).opacity).toBeCloseTo(1, 2);
    expect(await skyAtRest(page), 'no autonomous sky drift').toEqual({ count: 4, rest: true });
    await toEdge(page, false, false);
    expect((await skyFacts(page)).opacity).toBeCloseTo(1, 2);
    await page.mouse.wheel(0, 180);
    await expect.poll(() => progress(page)).toBeGreaterThan(0);
    const beforeTheme = await progress(page);
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3000 });
    // Night only: the day scene has no stars or aurora.
    expect((await skyFacts(page)).shown).toBe(false);
    await expect.poll(() => progress(page)).toBeCloseTo(beforeTheme, 4);
    const cloud = page.locator('.mtn-ridge:visible .sv-cloud-shadow');
    await expect(cloud).toHaveCount(3);
    const start = await cloud.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transform));
    await toEdge(page, true, false);
    expect(await cloud.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transform))).not.toEqual(start);
    await quiet(page, async () => {
      const surfaces = page.locator('.sv-cloud-surface');
      try {
        await expect(surfaces).toHaveCount(6);
        // One-time fixture paint-graph initialisation (measured: the FIRST hide/render/restore of these surfaces
        // changes ~6 pixels by max channel 4; every later cycle changes 0). Exactly one real hide + restore runs
        // here with real screenshot barriers, before the causal comparison. Its cold statistics are attached,
        // not discarded; there is no loop, retry or selection of a best result, and the threshold stays 2.
        const poseState = () => page.evaluate(() => {
          const root = document.querySelector('.mtn-scene')!;
          return {
            scrollY, width: innerWidth, height: innerHeight,
            progress: getComputedStyle(root).getPropertyValue('--sv-progress'),
            travel: getComputedStyle(root).getPropertyValue('--sv-cloud-travel'),
            layers: [...root.querySelectorAll(':scope > .mtn-layer')].map(layer => {
              const box = layer.getBoundingClientRect();
              return [getComputedStyle(layer).transform, box.top, box.height];
            }),
            shadows: [...document.querySelectorAll('.sv-cloud-shadow')].map(el => getComputedStyle(el).transform),
          };
        });
        const poseBefore = await poseState();
        const cold = await shot(page);
        const originals = await surfaces.evaluateAll(nodes => nodes.map(el => {
          const style = (el as SVGElement).style;
          const original = { value: style.getPropertyValue('visibility'), priority: style.getPropertyPriority('visibility') };
          style.setProperty('visibility', 'hidden');
          return original;
        }));
        expect(originals).toHaveLength(6);
        const initHidden = await shot(page);
        await surfaces.evaluateAll((nodes, saved) => nodes.forEach((el, i) => {
          const style = (el as SVGElement).style;
          style.removeProperty('visibility');
          if (saved[i].value) style.setProperty('visibility', saved[i].value, saved[i].priority);
        }), originals);
        const initRestored = await shot(page);
        expect(await surfaces.evaluateAll(nodes => nodes.map(el => {
          const style = (el as SVGElement).style;
          return { value: style.getPropertyValue('visibility'), priority: style.getPropertyPriority('visibility') };
        })), 'inline visibility restored exactly').toEqual(originals);
        expect(await poseState(), 'initialisation leaves the world pose unchanged').toEqual(poseBefore);
        const init = paintControls(cold, initHidden, initRestored);
        await test.info().attach('day-cloud-cold-initialisation', { body: JSON.stringify(init, null, 2), contentType: 'application/json' });
        expect(init.paint.materialPixels, 'initialisation hiding really removes cloud paint').toBeGreaterThanOrEqual(init.minimumPaintPixels);
        const day = await shot(page);
        const stable = paintControls(initRestored, day, day);
        await test.info().attach('day-cloud-normalised-stability', { body: JSON.stringify(stable.paint, null, 2), contentType: 'application/json' });
        expect(stable.paint.maximumChannel, 'normalised paint is stable before the measured triplet').toBeLessThanOrEqual(2);
        await surfaces.evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.visibility = 'hidden'; }));
        const noCloud = await shot(page);
        await surfaces.evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.removeProperty('visibility'); }));
        const dayAgain = await shot(page);
        const shadow = paintControls(day, noCloud, dayAgain);
        expect(shadow.paint.materialPixels).toBeGreaterThanOrEqual(shadow.minimumPaintPixels);
        expect(shadow.restoration.maximumChannel).toBeLessThanOrEqual(2);
      } finally {
        await surfaces.evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.removeProperty('visibility'); }));
      }
    });
    await page.locator('.atmosphere-toggle').click();
    const frozen = await skySignature(page);
    await page.keyboard.press('Control+Home');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await skySignature(page)).toEqual(frozen);
    await page.locator('.atmosphere-toggle').evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
    await page.keyboard.press('Enter');
    await expect.poll(() => progress(page)).toBe(0);
    // Home cloud travel is declared as 0.2 + 0.32 x arrive; at the entry arrive is 0, so the exact literal is 0.2.
    expect(Number((await skySignature(page)).cloud)).toBe(0.2);
  });
});

test('night sky has finished reduced, constrained, denied-storage and no-JS alternatives', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { reducedMotion: 'reduce', viewport: { width: 320, height: 640 } }, async page => {
    await page.goto('/');
    const facts = await skyFacts(page);
    expectSkyShape(facts, 'tall', 'reduced');
    expect(facts.opacity).toBeGreaterThan(0.8);
    expect(facts.opacity).toBeLessThanOrEqual(1);
    await page.mouse.move(120, 300);
    await page.mouse.move(220, 380);
    expect(await skyAtRest(page), 'reduced sky holds still under the mouse').toEqual({ count: 4, rest: true });
    expect(await scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-cloud-travel')))).toBe(0.52);
    expect(await scene(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await skyPaint(page, 'reduced');
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(scene(page)).toHaveCSS('display', 'none');
    await expect(page.locator('main')).toBeVisible();
  });
  // Denied storage must not remove the finished composition or raise application errors.
  await open(browser, baseURL, { viewport: { width: 375, height: 812 } }, async page => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    });
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    expectSkyShape(await skyFacts(page), 'tall', 'denied storage');
  });
  await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'dark', viewport: { width: 375, height: 812 } }, async page => {
    await page.goto('/'); // No page-side frame/timer readiness promise.
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    expectSkyShape(await skyFacts(page), 'tall', 'no-JS night');
    await skyPaint(page, 'no-JS night');
    await expect(page.locator('.home-intro')).toBeVisible();
  });
  await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'light', viewport: { width: 375, height: 812 } }, async page => {
    await page.goto('/');
    const day = await skyFacts(page);
    expect(day.foreign).toBe(0);
    expect(day.shown).toBe(false);
    await expect(page.locator('.mtn-ridge:visible .sv-cloud-shadow')).toHaveCount(3);
    expect(await scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-cloud-travel')))).toBe(0.52);
    await expect(page.locator('.home-intro')).toBeVisible();
    await expect(page.locator('.front-newsletter button')).toBeDisabled();
  });
});

for (const size of [
  { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 320, height: 640 }, { width: 390, height: 600 },
]) {
  test(`background sky stays behind copy and controls through forward/reverse native scroll (${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { viewport: size }, async page => {
      await page.goto('/');
      await settled(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const entry = await skyFacts(page);
      expectSkyShape(entry, variantFor(size), 'entry');
      expect(entry.opacity).toBeGreaterThan(0.5);
      await expectReadable(page, 'entry');
      for (let step = 0; step < 14; step++) {
        await page.mouse.wheel(0, Math.max(40, Math.round(max / 14)));
        await twoFrames(page);
        await expectReadable(page, 'forward ' + step);
        expect((await skyFacts(page)).shown, 'forward ' + step + ' sky still painted').toBe(true);
      }
      for (let step = 0; step < 14; step++) {
        await page.mouse.wheel(0, -Math.max(40, Math.round(max / 14)));
        await twoFrames(page);
        await expectReadable(page, 'reverse ' + step);
      }
    });
  });
}

test('paused and reduced static sky holds its pose through scroll and text enlargement', async ({ browser, baseURL }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await open(browser, baseURL, { viewport: { width: 375, height: 812 }, reducedMotion }, async page => {
      await page.goto('/');
      await settled(page);
      if (reducedMotion === 'no-preference') await page.locator('.atmosphere-toggle').click();
      const rest = await skySignature(page);
      for (const y of [90, 180, 330]) {
        await page.evaluate(top => scrollTo(0, top), y);
        await twoFrames(page);
        await expectReadable(page, reducedMotion + ' scroll ' + y);
        expect(await skySignature(page), reducedMotion + ' pose ' + y).toEqual(rest);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.setViewportSize({ width: 320, height: 640 });
      await twoFrames(page);
      await expectReadable(page, reducedMotion + ' enlarged text');
      expectSkyShape(await skyFacts(page), 'tall', reducedMotion + ' enlarged');
      await page.evaluate(() => scrollTo(0, 0));
      await twoFrames(page);
      await expectReadable(page, reducedMotion + ' enlarged top');
    });
  }
});

// JavaScript-disabled dark night: no page rAF/timer promises; CDP evaluation and layout only.
for (const size of [{ width: 375, height: 812 }, { width: 320, height: 640 }]) {
  test(`JS-disabled dark sky is a finished static background that yields to copy forward and reverse (${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'dark', viewport: size }, async page => {
      await page.goto('/');
      await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
      const rest = await skyFacts(page);
      expectSkyShape(rest, variantFor(size), 'rest');
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(max).toBeGreaterThan(400);
      for (const y of [0, 40, 90, 180, 330, 180, 90, 0]) {
        await page.mouse.wheel(0, y - await page.evaluate(() => scrollY));
        await expect.poll(() => page.evaluate(top => Math.abs(scrollY - top), y)).toBeLessThanOrEqual(1);
        await expectReadable(page, `scroll ${y}`);
        expect(await skyFacts(page), `scroll ${y} static sky`).toEqual(rest);
      }
    });
  });
}

test('sky art is viewport-owned: scrolled height resize does not flip or shift the far variant sideways', async ({ browser, baseURL }) => {
  for (const width of [375, 768, 900, 1000, 1150, 1280, 1440]) {
    await open(browser, baseURL, { viewport: { width, height: width < 900 ? 812 : 900 } }, async page => {
      await page.goto('/');
      await settled(page);
      const place = () => page.locator('.mtn-far > svg.mtn-ridge:visible').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { role: el.classList.contains('mtn-tall') ? 'tall' : 'wide', left: r.left, top: r.top, width: r.width, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      const opening = await place();
      expect(opening.width).toBeGreaterThan(0);
      await page.evaluate(() => scrollTo(0, 180));
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
      const height = page.viewportSize()!.height;
      await page.setViewportSize({ width, height: height - 1 });
      await expect.poll(() => page.evaluate(() => innerHeight)).toBe(height - 1);
      await twoFrames(page);
      const after = await place();
      expect(after.role, `width ${width} variant`).toBe(opening.role);
      expect(after.left, `width ${width} left`).toBeCloseTo(opening.left, 0);
      expect(after.width, `width ${width} width`).toBeCloseTo(opening.width, 0);
      expect(Math.abs(after.top - opening.top), `width ${width} top`).toBeLessThanOrEqual(80);
      expect(after.overflow).toBeLessThanOrEqual(0);
      expect((await skyFacts(page)).shown).toBe(true);
    });
  }
});

// The JS-off sky is static far-SVG art and needs no optional CSS feature. Both the native stylesheet and a
// DIAGNOSTIC CSS-response variant with every @supports block made inert (feature-absence emulation, not
// a real older browser/Safari) must give the same painted, readable night across the measured problem class.
for (const [size, variant] of [
  [{ width: 375, height: 812 }, 'native'], [{ width: 320, height: 640 }, 'native'],
  [{ width: 390, height: 600 }, 'native'], [{ width: 768, height: 1024 }, 'native'], [{ width: 1440, height: 900 }, 'native'],
  [{ width: 375, height: 812 }, 'supports-absent'], [{ width: 320, height: 640 }, 'supports-absent'],
] as const) {
  test(`JS-disabled dark sky is painted and clear across routes/200%/404 (${variant} ${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'dark', viewport: size }, async page => {
      // The scene styles are bundled into the compiled Astro stylesheet, so that response is the one transformed.
      const intercepted: { status: number; bytes: number; scenic: boolean }[] = [];
      if (variant === 'supports-absent') await page.route('**/_astro/*.css*', async route => {
        const response = await route.fetch();
        const css = await response.text();
        intercepted.push({ status: response.status(), bytes: css.length, scenic: css.includes('.mtn-scene') });
        await route.fulfill({ response, body: css.replace(/@supports[^{]*\{/g, '@media not all {') });
      });
      // Every affected navigation must have actually passed a successful, nonempty scenic stylesheet through the route.
      const visit = async (target: string) => {
        const seen = intercepted.length;
        await page.goto(target);
        if (variant !== 'supports-absent') return;
        const fresh = intercepted.slice(seen);
        expect(fresh.length, `${target} compiled stylesheet intercepted`).toBeGreaterThan(0);
        expect(fresh.some(r => r.status === 200 && r.bytes > 0 && r.scenic), `${target} intercepted a nonempty scenic stylesheet`).toBe(true);
      };
      for (const route of ['/', '/about', '/work', '/writing', '/subscribe', '/work/trivia-hub', '/missing-sky-valley-page']) {
        for (const zoom of ['100%', '200%']) {
          await visit(route);
          await page.evaluate(percent => { document.documentElement.style.fontSize = percent; }, zoom);
          const label = `${route} ${zoom}`;
          expectSkyShape(await skyFacts(page), variantFor(size), label);
          await expectReadable(page, label);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), label + ' no overflow').toBeLessThanOrEqual(0);
          const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
          for (const y of [330, 90, 0].map(v => Math.min(v, max))) {
            await page.mouse.wheel(0, y - await page.evaluate(() => scrollY));
            await expect.poll(() => page.evaluate(top => Math.abs(scrollY - top), y)).toBeLessThanOrEqual(1);
            await expectReadable(page, `${label} scroll ${y}`);
          }
        }
      }
      // Actual paint control on the real sky: painted / hidden / restored pixels.
      await visit('/');
      await skyPaint(page, `${variant} ${size.width}x${size.height}`);
    });
  });
}
