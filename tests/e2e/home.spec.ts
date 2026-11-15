import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const tools = JSON.parse(readFileSync('src/data/tools.json', 'utf8')) as { id: string; name: string; purpose: string }[];
// The current contact/empty-Series amendment retires discovery, not the
// existing calendar, tool, privacy and publication safeguards.
for (const theme of ['dark', 'light'] as const) {
  test(`approved About is one column with five simple tools and the real calendar (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const errors: string[] = []; const external: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Trying things with AI.Learning as I go.');
    await expect(page.locator('.home-intro')).toHaveText('I’m Son, a business guy in Vietnam. I’m exploring how AI can automate parts of my work and help me build things I find useful.');
    await expect(page.locator('.tool-choice')).toHaveText(tools.map(tool => tool.name));
    await expect(page.locator('.github-calendar')).toHaveCount(1);
    await expect(page.locator('.calendar-day')).toHaveCount(365);
    const rendered = await page.locator('.calendar-day').evaluateAll(elements => elements.map(el => ({ date: (el as HTMLElement).dataset.date, count: Number((el as HTMLElement).dataset.count), level: Number((el as HTMLElement).dataset.level), label: el.getAttribute('aria-label'), title: el.getAttribute('title') })));
    expect(rendered).toEqual(snapshot.days.map((day: { date: string; count: number; level: number }) => {
      const description = `${day.date}: ${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} (UTC)`;
      return { ...day, label: description, title: description };
    }));
    await expect(page.locator('#calendar-description')).toContainText('2,165 contributions. Not live data.');
    await expect(page.locator('.calendar-months span')).toHaveText(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
    await expect(page.locator('#calendar-description')).toContainText(snapshot.source);
    await expect(page.locator('#calendar-description time')).toHaveAttribute('datetime', snapshot.retrievedAt);
    const bounds = await page.locator('.about-opening, .about-tools').evaluateAll(els => els.map(el => ({ left: el.getBoundingClientRect().left, width: el.getBoundingClientRect().width })));
    expect(bounds[0]).toEqual(bounds[1]);
    await expect(page.locator('.home-feature, .planned-preview')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Contact Son', exact: true }).getByRole('link')).toHaveCount(4);
    await expect(page.locator('main')).not.toContainText('Always-on agents');
    await expect(page.locator('.usage-chart, .chart-tabs, .stack-list, .series-disclosure, [data-simulation], [data-doop-action]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('DATA CONNECTION PENDING');
    await expect(page.locator('form, input, button[type="submit"], [data-newsletter]')).toHaveCount(0);
    expect(errors).toEqual([]); expect(external).toEqual([]);
  });

  test(`five tools preview on focus and persist real tap/click/keyboard selection (${theme})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: theme }); await page.goto('/');
    for (const tool of tools) {
      const button = page.getByRole('button', { name: tool.name, exact: true });
      await button.focus(); await expect(page.locator('#tool-purpose')).toHaveText(`${tool.name}: ${tool.purpose}`);
      await button.press('Enter'); await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.tool-choice[aria-pressed="true"]')).toHaveCount(1);
      if (isMobile) await button.tap(); else await button.click();
      await expect(page.locator('#tool-purpose')).toHaveText(`${tool.name}: ${tool.purpose}`);
      await expect(page).toHaveURL('/');
      await expect(page.locator('[data-tools] a, [data-tools] [data-series]')).toHaveCount(0);
    }
    if (!isMobile) {
      await page.getByRole('button', { name: 'gbrain', exact: true }).click();
      await page.getByRole('button', { name: 'Hermes', exact: true }).hover();
      await expect(page.locator('#tool-purpose')).toHaveText('Hermes: A general-purpose assistant.');
      await page.mouse.move(0, 0);
      await expect(page.locator('#tool-purpose')).toHaveText('gbrain: Shared memory for agents.');
      await expect(page.getByRole('button', { name: 'gbrain', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test(`calendar pointer/touch details and single-tab arrow navigation without picker (${theme})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: theme }); await page.goto('/');
    const peak = page.locator('.calendar-day[data-date="2026-10-19"]');
    if (isMobile) await peak.tap(); else await peak.click();
    await expect(page.locator('#calendar-detail')).toHaveText('2026-10-19 · 632 contributions (UTC)');
    await expect(peak).toHaveAttribute('aria-pressed', 'true');
    await peak.focus(); await peak.press('ArrowDown');
    await expect(page.locator('.calendar-day[data-date="2026-10-20"]')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.calendar-day[data-date="2026-10-27"]')).toBeFocused();
    await page.keyboard.press('Home'); await expect(page.locator('.calendar-day').first()).toBeFocused();
    await page.keyboard.press('End'); await expect(page.locator('.calendar-day').last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#calendar-detail')).toHaveText('2026-11-15 · 0 contributions (UTC)');
    await expect(page.locator('.calendar-day[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.locator('.calendar-day').last()).not.toBeFocused();
    await expect(page.locator('.github-calendar select, [data-calendar-picker], .github-calendar details')).toHaveCount(0);
    // Son retains natural compact data-viz cells; no replacement explorer UI.
    expect(await page.locator('.calendar-scroll').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(isMobile);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`tools and all daily values remain available without JavaScript (${theme})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: theme, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage(); await page.goto(`${baseURL}/`);
      await expect(page.locator('.tool-choice').first()).toBeHidden();
      await expect(page.locator('.tools-static strong')).toHaveText(tools.map(tool => tool.name));
      await expect(page.locator('.tools-static span')).toHaveText(tools.map(tool => tool.purpose));
      await expect(page.getByRole('table', { name: 'Every UTC date and contribution count in the public GitHub snapshot' })).toHaveCount(1);
      const rows = await page.locator('.github-calendar noscript tbody tr').evaluateAll(els => els.map(el => ({ date: el.querySelector('th')!.textContent, count: Number(el.querySelector('td')!.textContent) })));
      expect(rows).toEqual(snapshot.days.map(({ date, count }: { date: string; count: number }) => ({ date, count })));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
  });
}

test('generic Series and Project stay reachable through native navigation and history', async ({ page }) => {
  await page.goto('/');
  const mainNav = () => page.getByRole('navigation', { name: 'Main', exact: true });
  await mainNav().getByRole('link', { name: 'Series', exact: true }).click();
  await expect(page).toHaveURL('/series');
  await expect(page.locator('main')).toHaveText('Series.Coming soon');
  await mainNav().getByRole('link', { name: 'Project', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Coming soon.');
  await expect(page.locator('main .row, main .work-card, main .build-entry')).toHaveCount(0);
  await page.getByRole('link', { name: 'Read the series', exact: false }).click();
  await expect(page).toHaveURL('/series');
  await page.goBack(); await expect(page).toHaveURL('/project');
  await page.goForward(); await expect(page).toHaveURL('/series');
  await mainNav().getByRole('link', { name: 'About Me', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('navigation', { name: 'Contact Son' })).toBeVisible();
});
