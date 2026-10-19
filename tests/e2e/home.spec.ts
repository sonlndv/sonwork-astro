import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const approvedIntro = "I'm Son, a business guy in Vietnam. I don't have a software engineering background. I'm figuring out what I can build with AI, learning as I go, and writing down what works and what doesn't. I'm curious how far this can go as AI gets smarter.";
const approvedBuild = "I'm a business guy trying to build things with AI and figure out what a future with superintelligence might mean for people like me.";

const source = readFileSync('src/content/pages/about.mdx', 'utf8');
const homeField = (name: string) => source.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1];
for (const width of [390, 1440]) for (const theme of ['dark', 'light'] as const) {
  test(`About-first home ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.addInitScript(t => localStorage.setItem('theme', t), theme);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(homeField('homeTitle')).toBe("I'm Son");
    expect(homeField('homeIntro')).toBe(approvedIntro);
    expect(homeField('homeBuild')).toBe(approvedBuild);
    expect(homeField('description')!.length).toBeLessThanOrEqual(200);
    expect(source).toMatch(/^draft: false$/m);
    expect(source.split('---')[2].trimStart().split('\n')[0]).toBe(approvedIntro);
    await expect(page.locator('h1')).toHaveText("I'm Son");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', homeField('description')!);
    const intro = page.locator('.home-intro');
    await expect(intro).toHaveText(homeField('homeIntro')!);
    const words = (await intro.innerText()).split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    await expect(intro).toContainText('Vietnam');
    const box = (await intro.boundingBox())!;
    expect(box.y + box.height).toBeLessThan(width === 390 ? 844 : 900);
    expect(await page.evaluate(() => innerWidth)).toBe(width);
    await expect(page.locator('.masthead')).toHaveCount(0);
    await expect(page.locator('main h2')).toHaveText(['Selected projects', 'Contact', 'Newsletter']);
    await expect(page.locator('form.subscribe-form')).toHaveCount(1);
    await expect(page.locator('.front-about form')).toHaveCount(0);
    const form = (await page.locator('form.subscribe-form').boundingBox())!;
    const contact = (await page.locator('.front-contact').boundingBox())!;
    expect(form.y).toBeGreaterThanOrEqual(contact.y + contact.height);
    expect(form.y).toBeGreaterThanOrEqual(844);
    const profile = (await page.locator('.front-about').boundingBox())!;
    const projects = (await page.locator('.front-projects').boundingBox())!;
    expect(projects.y).toBeGreaterThanOrEqual(profile.y + profile.height);
    if (width === 1440) expect(profile.width).toBeGreaterThan(1000);
    await expect(page.locator('.front-projects h3')).toHaveText(['Trivia Hub', 'Keymarchy', 'Perfeat']);
    await expect(page.locator('.work-card a[href="https://games.sonwork.org"]')).toHaveCount(1);
    await expect(page.locator('.side-project').first().locator('a')).not.toHaveCount(0);
    await expect(page.locator('.side-project').last().locator('a')).toHaveCount(0);
    await expect(page.locator('.side-project').last()).toContainText('Building');
    const summary = page.locator('summary');
    await expect(summary).toHaveText("What I'm exploring");
    const summaryBox = (await summary.boundingBox())!;
    expect(summaryBox.y + summaryBox.height).toBeLessThan(width === 390 ? 844 : 900);
    await expect(page.locator('details')).not.toHaveAttribute('open', '');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('details')).toHaveAttribute('open', '');
    await expect(page.locator('details p')).toHaveText(homeField('homeBuild')!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await summary.click();
    await expect(page.locator('details')).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const small = await page.locator('main a, main button, main summary').evaluateAll(els => els.filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.height < 43.99 && getComputedStyle(el, '::after').position !== 'absolute';
    }).map(el => el.textContent));
    expect(small).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/about/');
    // MDX applies the site's existing smart punctuation to body prose.
    await expect(page.locator('.prose > p').first()).toHaveText(approvedIntro.replaceAll("'", '’'));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', homeField('description')!);
    const contributions = page.locator('#small-contributions + .contributions');
    await expect(contributions.locator('li')).toHaveCount(2);
    expect(await contributions.locator('li').evaluateAll(rows => rows.map(row => getComputedStyle(row, '::marker').content))).toEqual(['none', 'none']);
    await expect(contributions.locator('p')).toHaveText(['Screenshot copy and save improvements.', 'Fixed false warnings in doctor.']);
    for (const link of await contributions.locator('a').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(link).toHaveCSS('font-size', '16px');
    }
    for (const description of await contributions.locator('p').all()) {
      await expect(description).toHaveCSS('font-size', '15px');
    }
    await expect(contributions.locator('a')).toHaveText(['omaframe', 'gbrain']);
    await expect(contributions.locator('a').nth(0)).toHaveAttribute('href', 'https://github.com/btsouth/omaframe/pull/22');
    await expect(contributions.locator('a').nth(1)).toHaveAttribute('href', 'https://github.com/garrytan/gbrain/pull/1772');
    await expect(page.locator('#small-contributions + .contributions + h2')).toHaveText('Contact');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`About without JS ${width} ${theme}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: theme, viewport: { width, height: width === 390 ? 844 : 900 } });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.locator('.home-intro')).toHaveText(homeField('homeIntro')!);
    await page.locator('summary').click();
    await expect(page.locator('details p')).toBeVisible();
    await expect(page.getByRole('link', { name: 'son@sonwork.org', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
    await expect(page.getByRole('button', { name: 'Copy email' })).toBeHidden();
    await expect(page.locator('form.subscribe-form')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`${baseURL}/about/`);
    await expect(page.locator('.contributions li')).toHaveCount(2);
    expect(await page.locator('.contributions li').evaluateAll(rows => rows.map(row => getComputedStyle(row, '::marker').content))).toEqual(['none', 'none']);
    await expect(page.locator('.contributions a').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}
for (const outcome of ['success', 'rejected', 'unavailable'] as const) {
  test(`copy email ${outcome} reports truthfully and retains mailto`, async ({ page }) => {
    await page.addInitScript(outcome => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: outcome === 'unavailable' ? undefined : {
        writeText: async (value: string) => {
          if (outcome === 'rejected') throw new Error('Denied');
          (window as any).copiedEmail = value;
        },
      } });
    }, outcome);
    await page.goto('/');
    await page.getByRole('button', { name: 'Copy email', exact: true }).click();
    await expect(page.locator('#copy-email-status')).toHaveText(outcome === 'success' ? 'Email copied.' : "Could not copy. Select the address or open your email app.");
    expect(await page.evaluate(() => (window as any).copiedEmail)).toBe(outcome === 'success' ? 'son@sonwork.org' : undefined);
    await expect(page.getByRole('link', { name: 'son@sonwork.org', exact: true })).toHaveAttribute('href', 'mailto:son@sonwork.org');
  });
}

for (const result of ['resolve', 'reject'] as const) {
  test(`copy retains keyboard focus pending and after ${result}`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).copyCalls = 0;
      Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: () => {
          (window as any).copyCalls++;
          return new Promise<void>((resolve, reject) => {
            (window as any).finishCopy = resolve;
            (window as any).rejectCopy = reject;
          });
        },
      } });
    });
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Copy email', exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#copy-email-status')).toBeEmpty();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).copyCalls)).toBe(1);
    expect(await button.evaluate((el: HTMLButtonElement) => el.offsetHeight)).toBeGreaterThanOrEqual(44);
    await page.evaluate(result => result === 'resolve' ? (window as any).finishCopy() : (window as any).rejectCopy(new Error('Denied')), result);
    await expect(page.locator('#copy-email-status')).toHaveText(result === 'resolve' ? 'Email copied.' : 'Could not copy. Select the address or open your email app.');
    await expect(button).toBeFocused();
    await expect(button).not.toHaveAttribute('aria-disabled');
    await expect(button).not.toHaveAttribute('aria-busy');
  });
}
