import { expect, test } from '@playwright/test';
import { builtPages } from './routes';

const mountyPalette = {
  dark: { page: 'rgb(2, 5, 13)', ink: 'rgb(240, 244, 247)', accent: 'oklch(0.8 0.11 254)', rule: 'rgb(43, 46, 50)' },
  light: { page: 'rgb(248, 250, 253)', ink: 'rgb(11, 20, 33)', accent: 'oklch(0.36 0.12 258)', rule: 'rgb(182, 191, 200)' },
};

for (const theme of ['dark', 'light'] as const) test(`shared Mounty typography and flat material, no retired scene or external requests (${theme})`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme });
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') failures.push(`external: ${request.url()}`); });
  for (const path of builtPages()) {
    await page.goto(path); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.mtn-scene, .companion, canvas, doop-use, .mounty-review, [aria-label="Private theme preview"], [data-doop-action]')).toHaveCount(0);
    const material = await page.locator('body').evaluate(el => {
      const body = getComputedStyle(el);
      const backdrop = getComputedStyle(el, '::before');
      return {
        background: body.backgroundColor,
        ink: body.color,
        image: body.backgroundImage,
        textureVisible: backdrop.display !== 'none' && !['none', 'normal'].includes(backdrop.content) && backdrop.backgroundImage !== 'none',
        family: body.fontFamily.split(',')[0].replace(/["']/g, ''),
        leading: Number.parseFloat(body.lineHeight) / Number.parseFloat(body.fontSize),
      };
    });
    expect(material.background, path).toBe(mountyPalette[theme].page);
    expect(material.ink, path).toBe(mountyPalette[theme].ink);
    expect(material.image, path).toBe('none');
    expect(material.textureVisible, path).toBe(false);
    expect(material.family, path).toMatch(/^Geist(?: Sonwork)?$/);
    expect(material.leading, path).toBeCloseTo(1.7);
    await expect(page.locator('html')).toHaveCSS('background-color', mountyPalette[theme].page);
    await expect(page.locator('.theme-toggle')).toHaveCSS('color', mountyPalette[theme].accent);
    await expect(page.locator('.header-bar')).toHaveCSS('border-bottom-color', mountyPalette[theme].rule);
    const headings = await page.locator('main :is(h1, h2, h3, h4, h5, h6)').evaluateAll(elements => elements.map(el => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily.split(',')[0].replace(/["']/g, ''), weight: style.fontWeight, tracking: style.letterSpacing };
    }));
    expect(headings.length, path).toBeGreaterThan(0);
    for (const heading of headings) {
      expect(heading.family, path).toMatch(/^Space Mono(?: Sonwork)?$/);
      if (path === '/') {
        expect(heading.weight, path).toBe('700');
        expect(heading.tracking, path).toBe('normal');
      }
    }
    if (path === '/') {
      const display = await page.locator('h1').evaluate(el => ({ size: Number.parseFloat(getComputedStyle(el).fontSize), width: innerWidth }));
      expect(display.size).toBeCloseTo(Math.min(64, Math.max(36, display.width * .102)));
    }
    expect(await page.locator('.footer-inner').evaluate(el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '')), path).toMatch(/^Space Mono(?: Sonwork)?$/);
    const loadedFonts = await page.evaluate(() => Array.from(document.fonts).filter(face => face.status === 'loaded').map(face => ({ family: face.family.replace(/["']/g, ''), weight: face.weight })));
    expect(loadedFonts.some(face => /^Space Mono(?: Sonwork)?$/.test(face.family) && face.weight === '700'), `${path}: real bold heading font loaded`).toBe(true);
    expect(loadedFonts.some(face => /^Space Mono(?: Sonwork)?$/.test(face.family) && face.weight === '400'), `${path}: real label font loaded`).toBe(true);
    expect(loadedFonts.some(face => /^Geist(?: Sonwork)?$/.test(face.family) && face.weight === '400'), `${path}: real reading font loaded`).toBe(true);
    expect(await page.locator('.wordmark').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if (path === '/') {
      const timing = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.effect!.getTiming()));
      for (const motion of timing) {
        expect(motion.iterations).toBe(1);
        expect(typeof motion.duration).toBe('number');
        expect(motion.duration).toBeLessThanOrEqual(800);
        expect(typeof motion.delay).toBe('number');
        expect(Number(motion.duration) + Number(motion.delay)).toBeLessThanOrEqual(1000);
      }
      expect(await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter(a => a.playState === 'running').map(a => a.finished));
        return document.getAnimations().filter(a => a.playState === 'running').length;
      })).toBe(0);
    } else {
      expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
    }
  }
  expect(failures).toEqual([]);
});

test('theme choice survives rapid toggles, keyboard, routes and reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toBeFocused(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); button.click(); });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const path of ['/series', '/series/me/the-joy-of-malleable-products', '/series/always-on-agents', '/project', '/study', '/about']) {
    await page.goto(path); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  }
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('storage denial keeps theme usable without errors', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new DOMException('Denied'); } }); Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new DOMException('Denied'); } }); });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/');
  await page.locator('.theme-toggle').click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('forced colours keeps the flat backdrop, native contact links and focus', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  expect(await page.locator('body').evaluate(el => {
    const backdrop = getComputedStyle(el, '::before');
    return backdrop.display !== 'none' && !['none', 'normal'].includes(backdrop.content) && backdrop.backgroundImage !== 'none';
  })).toBe(false);
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('.about-contacts a').first().focus();
  expect(await page.locator('.about-contacts a').first().evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('opening reveals its four lines in order and finishes as readable static text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.classList.remove('js');
    void document.body.offsetHeight;
    document.documentElement.classList.add('js');
    for (const animation of document.getAnimations().filter(animation => animation instanceof CSSAnimation && ['ink-arrive', 'ink-stroke'].includes(animation.animationName))) {
      animation.pause();
      animation.currentTime = 0;
    }
  });
  expect(await page.locator('.ink-line').evaluateAll(nodes => nodes.map(el => Number(getComputedStyle(el).opacity)))).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => {
    for (const animation of document.getAnimations().filter(animation => animation instanceof CSSAnimation && ['ink-arrive', 'ink-stroke'].includes(animation.animationName))) animation.currentTime = 360;
  });
  const intermediate = await page.locator('.ink-line').evaluateAll(nodes => nodes.map(el => Number(getComputedStyle(el).opacity)));
  expect(intermediate[0]).toBeGreaterThan(intermediate[1]);
  expect(intermediate[1]).toBeGreaterThan(intermediate[2]);
  expect(intermediate[2]).toBeGreaterThan(intermediate[3]);
  await expect(page.locator('.ink-underline')).toHaveCSS('background-size', '0% 2px');
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(animation => animation instanceof CSSAnimation && ['ink-arrive', 'ink-stroke'].includes(animation.animationName));
    for (const animation of animations) animation.play();
    await Promise.all(animations.map(animation => animation.finished));
  });
  expect(await page.locator('.ink-line').evaluateAll(nodes => nodes.map(el => Number(getComputedStyle(el).opacity)))).toEqual([1, 1, 1, 1]);
  await expect(page.locator('.ink-underline')).toHaveCSS('background-size', '100% 2px');
});

test('theme reveals final link colours in a circle from the button and restores normal interactions', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  const box = await toggle.boundingBox();
  if (!box) throw new Error('Theme button must have visible geometry');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getAnimations().some(animation => animation instanceof CSSAnimation && animation.animationName === 'ink-theme'));
  const reveal = await page.evaluate(() => {
    const animation = document.getAnimations().find(animation => animation instanceof CSSAnimation && animation.animationName === 'ink-theme');
    if (!(animation?.effect instanceof KeyframeEffect)) throw new Error('Circular theme animation must expose its keyframes');
    animation.pause();
    animation.currentTime = 340;
    return {
      paths: animation.effect.getKeyframes().map(frame => String(frame.clipPath)),
      x: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ink-x')),
      y: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ink-y')),
      transitions: [...document.querySelectorAll('a,button')].map(el => getComputedStyle(el).transitionProperty),
    };
  });
  expect(reveal.paths).toHaveLength(2);
  expect(reveal.paths.every(path => path.startsWith('circle('))).toBe(true);
  expect(reveal.x).toBeCloseTo(box.x + box.width / 2);
  expect(reveal.y).toBeCloseTo(box.y + box.height / 2);
  expect(reveal.transitions.every(property => property === 'none')).toBe(true);
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(animation => animation instanceof CSSAnimation && animation.animationName === 'ink-theme');
    for (const animation of animations) animation.play();
    await Promise.all(animations.map(animation => animation.finished));
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).not.toHaveClass(/ink-switching/);
  await expect(toggle).toBeFocused();
});

for (const mode of ['reduced', 'unsupported'] as const) {
  test(`theme switches immediately when motion is ${mode}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    if (mode === 'unsupported') await page.addInitScript(() => { Object.defineProperty(document, 'startViewTransition', { value: undefined }); });
    await page.goto('/');
    if (mode === 'reduced') {
      expect(await page.evaluate(() => document.getAnimations().filter(animation => animation instanceof CSSAnimation && ['ink-arrive', 'ink-stroke'].includes(animation.animationName)).length)).toBe(0);
      expect(await page.locator('.ink-line').evaluateAll(nodes => nodes.map(el => Number(getComputedStyle(el).opacity)))).toEqual([1, 1, 1, 1]);
    }
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => document.getAnimations().filter(animation => animation instanceof CSSAnimation && animation.animationName === 'ink-theme').length)).toBe(0);
  });
}
