import { expect, test } from '@playwright/test';
import { builtPages } from './routes';

for (const theme of ['dark', 'light'] as const) test(`one shared tactile theme, no retired scene and no external requests (${theme})`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme });
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') failures.push(`external: ${request.url()}`); });
  for (const path of builtPages()) {
    await page.goto(path); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.mtn-scene, .companion, canvas, doop-use')).toHaveCount(0);
    expect(await page.locator('body').evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain('/texture.svg');
    expect(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Geist');
    expect(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily)).not.toContain('Mono');
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

test('forced colours hides texture and keeps native contact links and focus', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  expect(await page.locator('body').evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('.about-contacts a').first().focus();
  expect(await page.locator('.about-contacts a').first().evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
