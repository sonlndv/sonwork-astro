import { expect, test as base, type Page } from '@playwright/test';

// Fresh contexts retain each project's viewport and explicitly set its input model.
const test = base.extend({
  page: async ({ browser, baseURL, viewport, isMobile, hasTouch, colorScheme, javaScriptEnabled, reducedMotion, forcedColors }, use) => {
    const context = await browser.newContext({
      baseURL, viewport, isMobile, hasTouch, colorScheme, javaScriptEnabled, reducedMotion, forcedColors,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await use(page);
    } finally {
      await context.close();
      expect(errors).toEqual([]);
    }
  },
});

test.use({ colorScheme: 'light', javaScriptEnabled: true, reducedMotion: 'no-preference', forcedColors: 'none' });

// Approved sitewide world (independent literals from the v7 contract, not read back from production):
// phone/narrow light #d6dde7/#bcc7d6/#9aa9be, plane rgba(46,60,86,.2), rim rgba(52,66,96,.3);
// phone dark #26375d/#1e2f53/#152549, plane rgba(2,5,14,.4), rim rgba(140,168,250,.42);
// desktop (>=900px) light #d0d9e6/#b4c0d1/#8f9fb6 (rim .36), dark #2c4068/#243a64/#1c3060 (rim rgba(150,178,255,.5)).
const paintByWidth = {
  narrow: {
    light: {
      far: 'rgb(214, 221, 231)', mid: 'rgb(188, 199, 214)', near: 'rgb(154, 169, 190)',
      plane: 'rgba(46, 60, 86, 0.2)', rim: 'rgba(52, 66, 96, 0.3)', lume: 'oklch(0.33 0.13 236)',
    },
    dark: {
      far: 'rgb(38, 55, 93)', mid: 'rgb(30, 47, 83)', near: 'rgb(21, 37, 73)',
      plane: 'rgba(2, 5, 14, 0.4)', rim: 'rgba(140, 168, 250, 0.42)', lume: 'oklch(0.8 0.135 222)',
    },
  },
  wide: {
    light: {
      far: 'rgb(208, 217, 230)', mid: 'rgb(180, 192, 209)', near: 'rgb(143, 159, 182)',
      plane: 'rgba(46, 60, 86, 0.2)', rim: 'rgba(52, 66, 96, 0.36)', lume: 'oklch(0.33 0.13 236)',
    },
    dark: {
      far: 'rgb(44, 64, 104)', mid: 'rgb(36, 58, 100)', near: 'rgb(28, 48, 96)',
      plane: 'rgba(2, 5, 14, 0.4)', rim: 'rgba(150, 178, 255, 0.5)', lume: 'oklch(0.8 0.135 222)',
    },
  },
} as const;

async function expectPaint(page: Page, theme: 'light' | 'dark') {
  const view = page.viewportSize()!;
  // Tall desktops (>=900px and aspect <= 5/4) firm the day mid/near faces: #acb9cc/#8697b0.
  const tallDesktop = view.width >= 900 && view.width / view.height <= 1.25;
  const base = paintByWidth[view.width >= 900 ? 'wide' : 'narrow'][theme];
  const expected = tallDesktop && theme === 'light'
    ? { ...base, mid: 'rgb(172, 185, 204)', near: 'rgb(134, 151, 176)' }
    : base;
  const scene = page.locator('.mtn-scene');
  await expect(scene).toHaveCount(1);
  await expect(scene).toBeVisible();
  expect(await scene.locator('.mtn-ridge:visible .mtn-lit').count()).toBeGreaterThan(0);
  for (const [selector, property, value] of [
    ['.mtn-s-far', 'stop-color', expected.far],
    ['.mtn-s-mid', 'stop-color', expected.mid],
    ['.mtn-s-near', 'stop-color', expected.near],
    ['.mtn-s-plane', 'stop-color', expected.plane],
    ['.mtn-rim', 'stroke', expected.rim],
  ] as const) {
    const values = await scene.locator(selector).evaluateAll(
      (elements, prop) => elements.map((element) => getComputedStyle(element).getPropertyValue(prop)), property,
    );
    expect(values.length, selector).toBeGreaterThan(0);
    expect(values, selector).toEqual(values.map(() => value));
  }
  await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
  // Resolve the independent literal and the actual token as colours, not raw CSS spellings.
  const lume = await page.evaluate((expectedColor) => {
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
    try {
      probe.style.setProperty('color', expectedColor, 'important');
      const expected = getComputedStyle(probe).color;
      probe.style.setProperty('color', 'var(--lume)', 'important');
      return { expected, actual: getComputedStyle(probe).color };
    } finally {
      probe.remove();
    }
  }, expected.lume);
  expect(lume.actual).toBe(lume.expected);
  const action = page.locator('a.home-more');
  await expect(action).toHaveCount(1);
  await expect(action).toBeVisible();
  await expect(action).toHaveCSS('color', lume.expected);
}

async function expectInactiveScene(page: Page) {
  const scene = page.locator('.mtn-scene');
  await expect(scene).toHaveCount(1);
  for (const attribute of ['data-intro', 'data-cam', 'data-trace']) {
    await expect(scene).not.toHaveAttribute(attribute, /.*/);
  }
  expect(await scene.locator('.mtn-rim').count()).toBeGreaterThan(0);
  await expect(scene.locator('.mtn-rim[pathLength]')).toHaveCount(0);
  expect(await scene.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(scene.locator(':scope > div.mtn-layer')).toHaveCount(3);
  const mist = scene.locator('.mtn-mist');
  await expect(mist).toHaveCount(1);
  await expect(mist).toHaveCSS('display', 'none');
  await expect(mist).not.toHaveAttribute('data-run', /.*/);
  await expect(page.locator('.atmosphere-toggle')).toHaveCount(1);
  await expect(page.locator('.atmosphere-toggle')).toHaveCSS('display', 'none');
}

async function expectStaticScene(page: Page) {
  await expectInactiveScene(page);
  const scene = page.locator('.mtn-scene');
  await expect(scene).toBeVisible();
  const layers = scene.locator(':scope > div.mtn-layer');
  const { height, width, reduced } = await page.evaluate(() => ({ height: innerHeight, width: innerWidth, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const wide = width >= 900;
  // Independent authored world: depth is max x .75 when reduced, 0 without script. Declared max: >=900px .6;
  // narrow portrait (<=899px and aspect <= 5/4) .36; any other width the base .52.
  const portrait = width <= 899 && width / height <= 1.25;
  const depth = reduced ? (wide ? 0.6 : portrait ? 0.36 : 0.52) * 0.75 : 0;
  const tall = wide && width / height <= 1.25;
  const expected = tall
    ? [0.22 - 0.05 * depth, 0.2 - 0.18 * depth, 0.26 - 0.34 * depth]
    : wide
      ? [0.34 - 0.05 * depth, 0.36 - 0.3 * depth, 0.38 - 0.47 * depth]
      : [0.34 - 0.05 * depth, 0.44 - 0.44 * depth, 0.46 - 0.62 * depth];
  const matrices = await layers.evaluateAll(elements => elements.map(element => {
    const m = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return [m.m41, m.m42, m.m43];
  }));
  expect(matrices).toHaveLength(3);
  matrices.forEach((m, i) => {
    expect(m[0]).toBe(0);
    expect(m[1]).toBeCloseTo(height * expected[i], 1);
    expect(m[2]).toBe(0);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`system ${theme}`, () => {
    test.use({ colorScheme: theme });
    test('uses exact declared ridge, plane, rim and action paint without a manual preference', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
      await expect(page.getByRole('button', { name: `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`, exact: true }))
        .toBeVisible();
      await expectPaint(page, theme);
    });
  });
}

test.describe('manual preference', () => {
  test.use({ colorScheme: 'dark' });
  test('native toggles persist R8 light and retained dark across reloads against the system preference', async ({ page }) => {
    const expectManual = async (theme: 'light' | 'dark') => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).not.toHaveAttribute('data-theme-vt', /.*/);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(theme);
      await expect(page.getByRole('button', { name: `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`, exact: true }))
        .toBeVisible();
      await expectPaint(page, theme);
    };
    await page.goto('/');
    await expectPaint(page, 'dark');
    await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
    await expectManual('light');
    await page.reload();
    await expectManual('light');
    await page.emulateMedia({ colorScheme: 'light' });
    await expectManual('light');
    await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
    await expectManual('dark');
    await page.reload();
    await expectManual('dark');
  });
});

for (const mode of [
  { name: 'JavaScript disabled', options: { javaScriptEnabled: false }, scripted: false },
  { name: 'reduced motion', options: { reducedMotion: 'reduce' as const }, scripted: true },
]) {
  test.describe(mode.name, () => {
    test.use(mode.options);
    test('keeps system-light R8 scenery complete and static', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
      if (mode.scripted) {
        await expect(page.locator('html')).toHaveClass(/\bjs\b/);
        await expect(page.locator('.mtn-scene')).toHaveAttribute('data-arrival', 'static');
      } else {
        await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
        await expect(page.locator('.mtn-scene')).not.toHaveAttribute('data-arrival', /.*/);
        await expect(page.locator('.theme-toggle')).toHaveCount(1);
        await expect(page.locator('.theme-toggle')).toBeHidden();
      }
      await expectPaint(page, 'light');
      await expectStaticScene(page);
      await page.evaluate(() => window.scrollTo(0, 320));
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
      await expectStaticScene(page);
    });
  });
}

test.describe('forced colours', () => {
  test.use({ forcedColors: 'active' });
  test('hides the decorative scene and atmosphere control while retaining content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.mtn-scene')).toHaveCount(1);
    await expect(page.locator('.mtn-scene')).toHaveCSS('display', 'none');
    await expect(page.locator('.mtn-scene')).toBeHidden();
    await expect(page.locator('.mtn-scene')).toHaveAttribute('data-arrival', 'static');
    await expectInactiveScene(page);
  });
});
