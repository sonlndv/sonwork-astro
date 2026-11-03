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
// phone/narrow light #bfc6d0/#a6b1bf/#8593a8 (deepened 2026-11-03), plane rgba(46,60,86,.2), rim rgba(52,66,96,.3);
// phone dark #26375d/#1e2f53/#152549, plane rgba(2,5,14,.4), rim rgba(140,168,250,.42);
// desktop (>=900px) light #bac2cf/#9eaabb/#7a8aa0 (deepened 2026-11-03; rim .36), dark #2c4068/#243a64/#1c3060 (rim rgba(150,178,255,.5)).
const paintByWidth = {
  narrow: {
    light: {
      far: 'rgb(191, 198, 208)', mid: 'rgb(166, 177, 191)', near: 'rgb(133, 147, 168)',
      plane: 'rgba(46, 60, 86, 0.2)', rim: 'rgba(52, 66, 96, 0.3)', lume: 'oklch(0.36 0.12 258)',
    },
    dark: {
      far: 'rgb(38, 55, 93)', mid: 'rgb(30, 47, 83)', near: 'rgb(21, 37, 73)',
      plane: 'rgba(2, 5, 14, 0.4)', rim: 'rgba(140, 168, 250, 0.42)', lume: 'oklch(0.8 0.11 254)',
    },
  },
  wide: {
    light: {
      far: 'rgb(186, 194, 207)', mid: 'rgb(158, 170, 187)', near: 'rgb(122, 138, 160)',
      plane: 'rgba(46, 60, 86, 0.2)', rim: 'rgba(52, 66, 96, 0.36)', lume: 'oklch(0.36 0.12 258)',
    },
    dark: {
      far: 'rgb(44, 64, 104)', mid: 'rgb(36, 58, 100)', near: 'rgb(28, 48, 96)',
      plane: 'rgba(2, 5, 14, 0.4)', rim: 'rgba(150, 178, 255, 0.5)', lume: 'oklch(0.8 0.11 254)',
    },
  },
} as const;

// Home's own accepted celestial-world terrain palette (one palette at every width), independent literals from the
// authored contract (DESIGN.md "Terrain material", with the tuned plane/rim alphas of the accepted C15 stylesheet):
// day far/mid/near #b5c0cd/#92a3b8/#6c829a (deepened 2026-11-03), plane rgba(39,60,87,.28), rim rgba(75,97,126,.38);
// night #34496b/#253c5b/#182d49, plane rgba(2,5,14,.55), rim rgba(154,181,211,.55). Index/calm routes keep paintByWidth.
const homePaint = {
  light: {
    far: 'rgb(181, 192, 205)', mid: 'rgb(146, 163, 184)', near: 'rgb(108, 130, 154)',
    plane: 'rgba(39, 60, 87, 0.28)', rim: 'rgba(75, 97, 126, 0.38)', lume: 'oklch(0.36 0.12 258)',
  },
  dark: {
    far: 'rgb(52, 73, 107)', mid: 'rgb(37, 60, 91)', near: 'rgb(24, 45, 73)',
    plane: 'rgba(2, 5, 14, 0.55)', rim: 'rgba(154, 181, 211, 0.55)', lume: 'oklch(0.8 0.11 254)',
  },
} as const;

async function expectPaint(page: Page, theme: 'light' | 'dark', route: 'home' | 'index' = 'home') {
  const view = page.viewportSize()!;
  // Index/calm routes: tall desktops (>=900px and aspect <= 5/4) firm the day mid/near faces: #96a3b6/#71829a (deepened 2026-11-03).
  const tallDesktop = view.width >= 900 && view.width / view.height <= 1.25;
  const base = paintByWidth[view.width >= 900 ? 'wide' : 'narrow'][theme];
  const expected = route === 'home'
    ? homePaint[theme]
    : tallDesktop && theme === 'light'
      ? { ...base, mid: 'rgb(150, 163, 182)', near: 'rgb(113, 130, 154)' }
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
  if (route === 'home') {
    const action = page.locator('a.home-more');
    await expect(action).toHaveCount(1);
    await expect(action).toBeVisible();
    await expect(action).toHaveCSS('color', lume.expected);
  }
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
  const { height, width, reduced, mode } = await page.evaluate(() => ({
    height: innerHeight, width: innerWidth, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    mode: document.querySelector('.mtn-scene')?.getAttribute('data-mode') ?? '', // the scene's own route mode
  }));
  const wide = width >= 900;
  // Independent authored world: Home is static at its entry pose in every mode, so depth is 0 with or without script
  // and under reduced motion (it was max x .75 for reduced before Home's scene became scroll- and preference-fixed).
  void reduced;
  const depth = 0;
  const tall = wide && width / height <= 1.25;
  // Home on a portrait phone (<=719px wide, aspect <= 5/4) declares its own accepted rest poses (DESIGN.md "Portrait
  // composition"): far 34svh - 5svh*depth, middle 38svh - 44svh*depth, near 40svh - 54svh*depth.
  const homePhone = mode === 'home' && width <= 719 && width / height <= 1.25;
  const expected = homePhone
    ? [0.34 - 0.05 * depth, 0.38 - 0.44 * depth, 0.4 - 0.54 * depth]
    : tall
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
      // The retained index route keeps its original (pre-celestial) exact palette in the same system theme.
      await page.goto('/work');
      await expect(page.locator('.mtn-scene')).toHaveAttribute('data-mode', 'index');
      await expectPaint(page, theme, 'index');
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
    // The manual preference carries to the retained index route, which keeps its original palette.
    await page.goto('/work');
    await expect(page.locator('.mtn-scene')).toHaveAttribute('data-mode', 'index');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectPaint(page, 'dark', 'index');
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
      // The retained index route keeps its original palette in the same fallback (static paint; its rest pose is covered in sky-valley).
      await page.goto('/work');
      await expect(page.locator('.mtn-scene')).toHaveAttribute('data-mode', 'index');
      await expectPaint(page, 'light', 'index');
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
