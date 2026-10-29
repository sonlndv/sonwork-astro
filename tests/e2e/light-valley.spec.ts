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

// Fixed contract values: light #d3deed/#bfd0e5/#a7bfdc; retained dark #26375d/#1e2f53/#152549.
const paint = {
  light: {
    far: 'rgb(211, 222, 237)', mid: 'rgb(191, 208, 229)', near: 'rgb(167, 191, 220)',
    plane: 'rgba(52, 74, 118, 0.07)', rim: 'rgba(40, 64, 130, 0.25)', lume: 'oklch(0.44 0.13 236)',
  },
  dark: {
    far: 'rgb(38, 55, 93)', mid: 'rgb(30, 47, 83)', near: 'rgb(21, 37, 73)',
    plane: 'rgba(2, 5, 14, 0.4)', rim: 'rgba(127, 156, 245, 0.38)', lume: 'oklch(0.8 0.135 222)',
  },
} as const;

async function expectPaint(page: Page, theme: 'light' | 'dark') {
  const expected = paint[theme];
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
  const { height, reduced } = await page.evaluate(() => ({ height: innerHeight, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const depth = reduced ? 0.38 : 0; // independent authored Home fallback, not a runtime offset oracle
  const expected = [0.34 - 0.26 * depth, 0.44 - 0.44 * depth, 0.46 - 0.7 * depth];
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
