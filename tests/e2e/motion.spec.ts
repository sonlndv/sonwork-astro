import { expect, test } from '@playwright/test';
import { builtPages } from './routes';

const mountyPalette = {
  dark: { page: 'rgb(2, 5, 13)', ink: 'rgb(240, 244, 247)', accent: 'rgb(57, 208, 252)', rule: 'rgb(43, 46, 50)' },
  light: { page: 'rgb(248, 250, 253)', ink: 'rgb(11, 20, 33)', accent: 'rgb(0, 108, 172)', rule: 'rgb(182, 191, 200)' },
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
    if (path === '/') await expect(page.locator('h1')).toHaveCSS('font-size', '32px');
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
      }
      await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), { timeout: 1500 }).toBe(0);
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
  for (const path of ['/series', '/series/always-on-agents', '/project', '/writing', '/about']) {
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
