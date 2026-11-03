import { test, expect, type Page } from '@playwright/test';

// One sky (Son-approved 2026-11-03): every page shows Home's sky. Compared with Home at the top of the page, in both themes and
// in each project's viewport: the same visible real bodies at the same places and sizes, the same star field, no daytime clouds,
// and the same terrain paint. Motion is reduced so nothing is mid-animation; with script the full star field must have loaded.
const routes = ['/about', '/work', '/writing', '/subscribe', '/work/trivia-hub', '/this-page-does-not-exist'];

async function skyState(page: Page, script: boolean) {
  if (script) await page.waitForFunction(() => document.querySelector('.mtn-scene')?.getAttribute('data-sky') === 'full');
  return page.evaluate(() => {
    const scene = document.querySelector('.mtn-scene');
    if (!scene) return null;
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      for (let n: Element | null = el; n && n !== scene.parentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      }
      return true;
    };
    const px = (v: number) => Math.round(v / 2) * 2;
    const images = [...scene.querySelectorAll('image')].filter(shown).map((img) => {
      const r = img.getBoundingClientRect();
      const href = img.getAttribute('href') ?? img.getAttribute('xlink:href') ?? '';
      return `${href.split('/').pop()} ${px(r.x)},${px(r.y)} ${px(r.width)}x${px(r.height)} ${getComputedStyle(img).opacity}`;
    }).sort();
    const stars = [...scene.querySelectorAll('circle')].filter(shown);
    return {
      images,
      stars: stars.length,
      starPaint: stars.map((c) => `${c.getAttribute('r')}/${c.getAttribute('opacity')}/${c.getAttribute('fill')}`).join(' '),
      clouds: [...scene.querySelectorAll('.sv-hs-clouds *')].filter(shown).length,
      terrain: [...scene.querySelectorAll('svg.mtn-ridge path')].filter(shown).slice(0, 40).map((p) => getComputedStyle(p).fill).join(' '),
    };
  });
}

for (const colorScheme of ['dark', 'light'] as const) {
  for (const script of [true, false]) {
    test.describe(`one sky, ${colorScheme}, ${script ? 'with' : 'without'} JavaScript`, () => {
      test.use({ colorScheme, reducedMotion: 'reduce', javaScriptEnabled: script });

      test('every page shows the sky Home shows', async ({ page }) => {
        await page.goto('/');
        const home = await skyState(page, script);
        expect(home, 'Home has the scene').not.toBeNull();
        expect(home!.images.length, 'Home shows real bodies').toBeGreaterThan(1);
        expect(home!.clouds, 'Home shows no clouds').toBe(0);
        for (const route of routes) {
          await page.goto(route);
          expect(await skyState(page, script), `${route} sky equals Home's`).toEqual(home);
        }
      });
    });
  }
}
