import { test, expect } from '@playwright/test';

// Instant page switches and no atmosphere control (Son-approved 2026-11-03).
const pages = ['/', '/about', '/work', '/writing', '/subscribe', '/work/trivia-hub', '/this-page-does-not-exist'];

test('header navigation reveals the next page without a cross-document transition', async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener('pagereveal', (event) => {
      (window as unknown as { sonworkReveal: string }).sonworkReveal = (event as Event & { viewTransition?: unknown }).viewTransition ? 'transition' : 'plain';
    });
  });
  await page.goto('/');
  await Promise.all([page.waitForURL((url) => url.pathname === '/about'), page.locator('.site-nav a[href="/about"]').click()]);
  await expect.poll(() => page.evaluate(() => (window as unknown as { sonworkReveal?: string }).sonworkReveal)).toBe('plain');
});

test('no page has a Pause or Resume atmosphere control or its status', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    await page.waitForLoadState('load');
    await expect(page.locator('.atmosphere-toggle, #atmosphere-status, .atmosphere-status'), path).toHaveCount(0);
    await expect(page.getByRole('button', { name: /atmosphere/i }), path).toHaveCount(0);
    await expect(page.getByText(/(Pause|Resume) atmosphere|Atmosphere (paused|running)/), path).toHaveCount(0);
  }
});

test('automatic motion is 5 seconds or less: the mist pass and the cloud-bank opening', async ({ page }) => {
  for (const path of ['/', '/work']) {
    await page.goto(path);
    const lengths = await page.evaluate(() => {
      const scene = document.querySelector('.mtn-scene') as HTMLElement;
      const mist = scene.querySelector('.mtn-mist') as HTMLElement;
      const ribbon = mist.querySelector('.mtn-mist-ribbon') as HTMLElement;
      const seconds = (v: string) => Math.max(...v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x))));
      mist.setAttribute('data-run', '');
      const ribbonStyle = getComputedStyle(ribbon);
      const mistTotal = seconds(ribbonStyle.animationDuration) + seconds(ribbonStyle.animationDelay);
      mist.removeAttribute('data-run');
      const before = scene.dataset.moment;
      scene.dataset.moment = 'run';
      const banks = [...scene.querySelectorAll('.sv-hs-bank')].map((bank) => {
        const s = getComputedStyle(bank);
        return s.animationName === 'none' ? 0 : seconds(s.animationDuration) + seconds(s.animationDelay);
      });
      if (before === undefined) delete scene.dataset.moment; else scene.dataset.moment = before;
      return { mistTotal, banks };
    });
    expect(lengths.mistTotal, `${path} mist pass`).toBeGreaterThan(0);
    expect(lengths.mistTotal, `${path} mist pass`).toBeLessThanOrEqual(5);
    for (const total of lengths.banks) expect(total, `${path} cloud-bank opening`).toBeLessThanOrEqual(5);
  }
});
