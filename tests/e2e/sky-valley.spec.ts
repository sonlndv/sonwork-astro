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

function expectPose(value: Awaited<ReturnType<typeof geometry>>, depth: number) {
  expect(value.overflow).toBeLessThanOrEqual(0);
  expect(value.layers.map(layer => layer.role)).toEqual(['far', 'middle', 'near']);
  const offsets = [0.34 - 0.26 * depth, 0.44 - 0.44 * depth, 0.46 - 0.70 * depth];
  value.layers.forEach((layer, i) => {
    const y = value.height * offsets[i];
    expect(layer.x).toBe(0);
    expect(layer.y).toBeCloseTo(y, 1);
    expect(layer.outerTop).toBeCloseTo(-360 + y, 1);
    expect(layer.outerHeight).toBeCloseTo(value.height + 720, 1);
    expect(layer.visibleCanvases).toBe(1);
    expect(layer.paths).toBe(1);
    expect(layer.art).not.toBeNull();
    expect(layer.art!.left).toBeCloseTo(0, 1);
    expect(layer.art!.top).toBeCloseTo(-48 + y, 1);
    expect(layer.art!.width).toBeCloseTo(value.width, 1);
    expect(layer.art!.height).toBeCloseTo(value.height + 96, 1);
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
      expect(travel[1] / travel[0]).toBeCloseTo(44 / 26, 2);
      expect(travel[2] / travel[0]).toBeCloseTo(70 / 26, 2);
      expect(range.innerTransforms.every(transform => transform === 'none')).toBe(true);
      await toEdge(page, true, profile.touch);
      const ending = await geometry(page);
      expectPose(ending, 1);
      // Controlled paint diagnostic: freeze other decoration, then hide ONE actual outer plane.
      // Compare reproducible pixels, not CSS presence. Never alter progress or application state.
      const quiet = await page.evaluateHandle(() => {
        const style = document.createElement('style');
        style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}.companion,#companion-return{visibility:hidden!important}';
        document.head.append(style);
        return style;
      });
      try {
        const baseline = await page.screenshot({ animations: 'disabled' });
        for (const role of ['far', 'middle', 'near']) {
          await paintedPlane(page, role, baseline, role + ' ending');
        }
      } finally {
        await quiet.evaluate(el => el.remove());
      }
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
      const work = { frames: 0, timers: 0, pending: new Set<number>() };
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
      window.setTimeout = function (this: Window, ...args: any[]) {
        if (owned()) work.timers += 1;
        return Reflect.apply(set, this, args);
      } as typeof window.setTimeout;
    });
    const work = () => page.evaluate(() => {
      const value = (window as any).__landscapeWork;
      return { frames: value.frames, timers: value.timers, pending: value.pending.size };
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
    expect(idle.timers).toBe(0);
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
    expect((await work()).timers).toBe(0);
    await testInfo.attach('observed-owner-work', { body: JSON.stringify({ idle, restored: await work() }, null, 2), contentType: 'application/json' });
  });
});

// Selected constellation/cloud study: controlled paint diagnostics, not creative or natural-motion acceptance.
test('selected sky signature paints, follows native progress and shares Pause/theme state', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { viewport: { width: 375, height: 812 } }, async page => {
    await page.goto('/');
    await settled(page);
    const constellation = page.locator('.sv-constellation');
    await expect(constellation).toHaveCount(1);
    await expect(constellation).toBeVisible();
    await expect(page.locator('.sv-cloud-surface')).toHaveCount(6);
    expect(await page.locator('.sv-cloud-surface').evaluateAll(nodes => nodes.every(el =>
      getComputedStyle(el).display === 'none'))).toBe(true);
    const signature = () => scene(page).evaluate(el => ({
      sketch: Number(getComputedStyle(el).getPropertyValue('--sv-sketch')),
      cloud: Number(getComputedStyle(el).getPropertyValue('--sv-cloud-travel')),
      point: el.querySelector('.sv-constellation-guide')!.getAttribute('cx'),
    }));
    const entry = await signature();
    const clip = (await constellation.boundingBox())!;
    expect(clip.width).toBeGreaterThan(60);
    const first = await page.screenshot({ clip, animations: 'disabled' });
    await constellation.evaluate(el => { (el as SVGElement).style.visibility = 'hidden'; });
    const hidden = await page.screenshot({ clip, animations: 'disabled' });
    await constellation.evaluate(el => { (el as SVGElement).style.removeProperty('visibility'); });
    const restored = await page.screenshot({ clip, animations: 'disabled' });
    const stars = paintControls(first, hidden, restored);
    expect(stars.paint.materialPixels).toBeGreaterThanOrEqual(stars.minimumPaintPixels);
    expect(stars.restoration.maximumChannel).toBeLessThanOrEqual(2);
    await page.mouse.wheel(0, 180);
    await expect.poll(() => progress(page)).toBeGreaterThan(0);
    await expect.poll(async () => (await signature()).sketch).toBeGreaterThan(entry.sketch);
    expect((await signature()).point).not.toBe(entry.point);
    const beforeTheme = await progress(page);
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/, { timeout: 3000 });
    await expect(constellation).toHaveCSS('display', 'none');
    await expect.poll(() => progress(page)).toBeCloseTo(beforeTheme, 4);
    const cloud = page.locator('.mtn-ridge:visible .sv-cloud-shadow');
    await expect(cloud).toHaveCount(3);
    const start = await cloud.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transform));
    await toEdge(page, true, false);
    expect(await cloud.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transform))).not.toEqual(start);
    // Controlled paint isolation excludes Mount and other finite effects from the pixel control.
    const quiet = await page.evaluateHandle(() => {
      const style = document.createElement('style');
      style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}.companion,#companion-return{visibility:hidden!important}';
      document.head.append(style);
      return style;
    });
    try {
      const day = await page.screenshot({ animations: 'disabled' });
      await page.locator('.sv-cloud-surface').evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.visibility = 'hidden'; }));
      const noCloud = await page.screenshot({ animations: 'disabled' });
      await page.locator('.sv-cloud-surface').evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.removeProperty('visibility'); }));
      const dayAgain = await page.screenshot({ animations: 'disabled' });
      const shadow = paintControls(day, noCloud, dayAgain);
      expect(shadow.paint.materialPixels).toBeGreaterThanOrEqual(shadow.minimumPaintPixels);
      expect(shadow.restoration.maximumChannel).toBeLessThanOrEqual(2);
    } finally {
      await page.locator('.sv-cloud-surface').evaluateAll(nodes => nodes.forEach(el => { (el as SVGElement).style.removeProperty('visibility'); }));
      await quiet.evaluate(el => el.remove());
    }
    await page.locator('.atmosphere-toggle').click();
    const frozen = await signature();
    await page.keyboard.press('Control+Home');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await signature()).toEqual(frozen);
    await page.locator('.atmosphere-toggle').evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
    await page.keyboard.press('Enter');
    await expect.poll(() => progress(page)).toBe(0);
    expect((await signature()).cloud).toBe(0);
  });
});

test('selected sky signature has finished reduced, constrained and no-JS alternatives', async ({ browser, baseURL }) => {
  await open(browser, baseURL, { reducedMotion: 'reduce', viewport: { width: 320, height: 640 } }, async page => {
    await page.goto('/');
    await expect(page.locator('.sv-constellation-simple')).toBeVisible();
    expect(await scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-sketch')))).toBe(1);
    expect(await scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-cloud-travel')))).toBe(0.52);
    expect(await page.locator('.sv-constellation').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(scene(page)).toHaveCSS('display', 'none');
    await expect(page.locator('main')).toBeVisible();
  });
  await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'light', viewport: { width: 375, height: 812 } }, async page => {
    await page.goto('/'); // No page-side frame/timer readiness promise.
    await expect(page.locator('.sv-constellation')).toHaveCSS('display', 'none');
    await expect(page.locator('.mtn-ridge:visible .sv-cloud-shadow')).toHaveCount(3);
    expect(await scene(page).evaluate(el => Number(getComputedStyle(el).getPropertyValue('--sv-cloud-travel')))).toBe(0.52);
    await expect(page.locator('.home-intro')).toBeVisible();
    await expect(page.locator('.front-newsletter button')).toBeDisabled();
  });
});

// Rendered clearance: the painted (visible, non-zero opacity) constellation box must never contain
// an actual text-line box or control box from the page. Reads only live computed style and layout.
const skyOverlaps = (page: Page) => page.evaluate(() => {
  const sky = document.querySelector('.sv-constellation');
  if (!sky || getComputedStyle(sky).display === 'none') return { painted: false, hits: [] as string[], opacity: 0 };
  const opacity = Number(getComputedStyle(sky).opacity);
  const box = sky.getBoundingClientRect();
  const hits: string[] = [];
  const skip = (el: Element | null) => !el || !!el.closest('.site-header, .mtn-scene, .companion, script, style, noscript');
  const touches = (r: DOMRect) => r.width > 0 && r.height > 0 &&
    r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue!.trim() || skip(node.parentElement)) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) if (touches(r)) hits.push('text:' + node.nodeValue!.trim().slice(0, 24));
  }
  document.querySelectorAll('a, button, input, select, textarea, summary').forEach(el => {
    if (!skip(el) && touches(el.getBoundingClientRect())) hits.push('control:' + el.tagName);
  });
  return { painted: opacity > 0.02, hits, opacity };
});
const expectClear = async (page: Page, label: string) => {
  const found = await skyOverlaps(page);
  expect(found.painted ? found.hits : [], label + ' painted constellation clear of glyphs/controls').toEqual([]);
};
const twoFrames = (page: Page) => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

for (const size of [
  { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 320, height: 640 }, { width: 390, height: 600 },
]) {
  test(`painted constellation stays out of copy through forward/reverse native scroll (${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { viewport: size }, async page => {
      await page.goto('/');
      await settled(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      // The ordinary opening still shows the drawing beside the name.
      if (size.width === 375 && size.height === 812) expect((await skyOverlaps(page)).opacity).toBeGreaterThan(0.5);
      await expectClear(page, 'entry');
      for (let step = 0; step < 14; step++) {
        await page.mouse.wheel(0, Math.max(40, Math.round(max / 14)));
        await twoFrames(page);
        await expectClear(page, 'forward ' + step);
      }
      for (let step = 0; step < 14; step++) {
        await page.mouse.wheel(0, -Math.max(40, Math.round(max / 14)));
        await twoFrames(page);
        await expectClear(page, 'reverse ' + step);
      }
    });
  });
}

test('paused and reduced static constellation yields after scroll and text enlargement', async ({ browser, baseURL }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await open(browser, baseURL, { viewport: { width: 375, height: 812 }, reducedMotion }, async page => {
      await page.goto('/');
      await settled(page);
      if (reducedMotion === 'no-preference') await page.locator('.atmosphere-toggle').click();
      for (const y of [90, 180, 330]) {
        await page.evaluate(top => scrollTo(0, top), y);
        await twoFrames(page);
        await expectClear(page, reducedMotion + ' scroll ' + y);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.setViewportSize({ width: 320, height: 640 });
      await twoFrames(page);
      await expectClear(page, reducedMotion + ' enlarged text');
      await page.evaluate(() => scrollTo(0, 0));
      await twoFrames(page);
      await expectClear(page, reducedMotion + ' enlarged top');
    });
  }
});

// JS-disabled stellar art: the actual SVG primitives (path + circles, stroke-expanded) of the outer-
// gutter summit versus every non-empty glyph range and full native control box on the page.
const gutterSky = (page: Page) => page.evaluate(() => {
  const svg = document.querySelector('.site-header > .sv-gutter-sky');
  const fixed = document.querySelector('.sv-constellation');
  const fixedShown = !!fixed && getComputedStyle(fixed).display !== 'none' && Number(getComputedStyle(fixed).opacity) > 0.02;
  if (!svg || getComputedStyle(svg).display === 'none') return { shown: false, fixedShown, parts: 0, hits: [] as string[], inGutter: false, belowHeader: false, onScreen: false, box: null };
  const parts = [...svg.querySelectorAll('path, circle')].map(el => {
    const r = el.getBoundingClientRect();
    const pad = el.tagName === 'path' ? 1 : 0.5;
    return { left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad };
  });
  const box = parts.reduce((a, r) => ({ left: Math.min(a.left, r.left), right: Math.max(a.right, r.right), top: Math.min(a.top, r.top), bottom: Math.max(a.bottom, r.bottom) }),
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  const hits: string[] = [];
  const touches = (r: DOMRect) => r.width > 0 && r.height > 0 && parts.some(p => r.right > p.left && r.left < p.right && r.bottom > p.top && r.top < p.bottom);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue!.trim() || node.parentElement?.closest('script, style, noscript, .mtn-scene')) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) if (touches(r)) hits.push('text:' + node.nodeValue!.trim().slice(0, 24));
  }
  document.querySelectorAll('a, button, input, select, textarea, summary').forEach(el => {
    if (getComputedStyle(el).display !== 'none' && touches(el.getBoundingClientRect())) hits.push('control:' + el.tagName);
  });
  const header = document.querySelector('.site-header')!.getBoundingClientRect();
  const opacity = Number(getComputedStyle(svg).opacity);
  return {
    shown: opacity > 0.5 && parts.length === 4 && box.right - box.left > 6 && box.bottom - box.top > 12,
    fixedShown, parts: parts.length, hits, box,
    inGutter: box.left >= innerWidth - 16 && box.right <= innerWidth,
    belowHeader: box.top >= header.bottom,
    onScreen: box.bottom <= innerHeight,
  };
});

// JavaScript-disabled dark night: no page rAF/timer promises; CDP evaluation and layout only.
// Producer changed (fixed constellation -> header-anchored outer-gutter summit): same property —
// a finished static night mark at rest that never covers copy forward/reverse — measured on the real SVG.
for (const size of [{ width: 375, height: 812 }, { width: 320, height: 640 }]) {
  test(`JS-disabled dark constellation yields to copy forward and reverse (${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'dark', viewport: size }, async page => {
      await page.goto('/');
      await expect(page.locator('.sv-constellation')).toHaveCount(1);
      await expect(page.locator('.site-header > .sv-gutter-sky')).toHaveCount(1);
      expect(await page.locator('.site-header > .sv-gutter-sky path, .site-header > .sv-gutter-sky circle').count()).toBe(4);
      await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
      // Finished quiet composition at rest.
      const rest = await gutterSky(page);
      expect(rest.shown).toBe(true);
      expect(rest.fixedShown, 'fixed reading-world drawing is off without JS').toBe(false);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(max).toBeGreaterThan(400);
      for (const y of [0, 40, 90, 180, 330, 180, 90, 0]) {
        await page.mouse.wheel(0, y - await page.evaluate(() => scrollY));
        await expect.poll(() => page.evaluate(top => Math.abs(scrollY - top), y)).toBeLessThanOrEqual(1);
        const now = await gutterSky(page);
        expect(now.hits, `scroll ${y}`).toEqual([]);
        expect(now.fixedShown).toBe(false);
        expect(now.inGutter && now.belowHeader && now.onScreen, `scroll ${y} placement`).toBe(true);
      }
    });
  });
}

test('constellation placement is document-owned: scrolled height resize does not shift or flip it', async ({ browser, baseURL }) => {
  for (const width of [375, 768, 900, 1000, 1150, 1280, 1440]) {
    await open(browser, baseURL, { viewport: { width, height: width < 900 ? 812 : 900 } }, async page => {
      await page.goto('/');
      await settled(page);
      const place = () => page.locator('.sv-constellation').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), width: Math.round(r.width) };
      });
      const opening = await place();
      expect(opening.width).toBeGreaterThan(0);
      await page.evaluate(() => scrollTo(0, 180));
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
      const height = page.viewportSize()!.height;
      await page.setViewportSize({ width, height: height - 1 });
      await expect.poll(() => page.evaluate(() => innerHeight)).toBe(height - 1);
      await twoFrames(page);
      expect(await place(), `width ${width}`).toEqual(opening);
    });
  }
});

// The JS-off fallback no longer depends on any optional CSS feature. Both the native stylesheet and a
// DIAGNOSTIC CSS-response variant with every @supports block made inert (feature-absence emulation, not
// a real older browser/Safari) must give the same safe painted summit across the measured problem class.
for (const [size, variant] of [
  [{ width: 375, height: 812 }, 'native'], [{ width: 320, height: 640 }, 'native'],
  [{ width: 390, height: 600 }, 'native'], [{ width: 768, height: 1024 }, 'native'], [{ width: 1440, height: 900 }, 'native'],
  [{ width: 375, height: 812 }, 'supports-absent'], [{ width: 320, height: 640 }, 'supports-absent'],
] as const) {
  test(`JS-disabled dark outer-gutter summit is clear across routes/200%/404 (${variant} ${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    await open(browser, baseURL, { javaScriptEnabled: false, colorScheme: 'dark', viewport: size }, async page => {
      if (variant === 'supports-absent') await page.route('**/mountains/mountains.css*', async route => {
        const response = await route.fetch();
        const css = await response.text();
        await route.fulfill({ response, body: css.replace(/@supports[^{]*\{/g, '@media not all {') });
      });
      for (const route of ['/', '/about', '/work', '/writing', '/subscribe', '/work/trivia-hub', '/missing-sky-valley-page']) {
        for (const zoom of ['100%', '200%']) {
          await page.goto(route);
          await page.evaluate(percent => { document.documentElement.style.fontSize = percent; }, zoom);
          const label = `${route} ${zoom}`;
          const rest = await gutterSky(page);
          expect(rest.shown, label + ' summit painted').toBe(true);
          expect(rest.fixedShown, label + ' fixed drawing off').toBe(false);
          expect(rest.hits, label + ' clear at rest').toEqual([]);
          expect(rest.inGutter && rest.belowHeader, label + ' outer gutter below header').toBe(true);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), label + ' no overflow').toBeLessThanOrEqual(0);
          const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
          for (const y of [330, 90, 0].map(v => Math.min(v, max))) {
            await page.mouse.wheel(0, y - await page.evaluate(() => scrollY));
            await expect.poll(() => page.evaluate(top => Math.abs(scrollY - top), y)).toBeLessThanOrEqual(1);
            expect((await gutterSky(page)).hits, `${label} scroll ${y}`).toEqual([]);
          }
        }
      }
      // Actual paint control on the real summit: painted / hidden / restored pixels.
      await page.goto('/');
      const box = (await gutterSky(page)).box!;
      const clip = { x: Math.floor(box.left) - 1, y: Math.floor(box.top) - 1, width: Math.ceil(box.right - box.left) + 2, height: Math.ceil(box.bottom - box.top) + 2 };
      const svg = page.locator('.site-header > .sv-gutter-sky');
      const first = await page.screenshot({ clip, animations: 'disabled' });
      await svg.evaluate(el => { (el as SVGElement).style.visibility = 'hidden'; });
      const hidden = await page.screenshot({ clip, animations: 'disabled' });
      await svg.evaluate(el => { (el as SVGElement).style.removeProperty('visibility'); });
      const restored = await page.screenshot({ clip, animations: 'disabled' });
      const paint = paintControls(first, hidden, restored);
      expect(paint.paint.materialPixels).toBeGreaterThanOrEqual(12);
      expect(paint.restoration.maximumChannel).toBeLessThanOrEqual(2);
    });
  });
}
