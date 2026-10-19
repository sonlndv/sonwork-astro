import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { builtPages } from './routes';

// PLAN.md: axe finds 0 serious or critical violations on every page, mobile and
// desktop. The stylesheet follows the system color scheme, so both are checked.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(['serious', 'critical']);

for (const path of [...builtPages(), '/no-such-page/']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} in ${colorScheme} mode has no serious axe violations`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      const describe = (v: (typeof violations)[number]) =>
        `${v.impact} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`;
      const minor = violations.filter((v) => !BLOCKING.has(v.impact ?? ''));
      if (minor.length > 0) {
        testInfo.annotations.push({ type: 'axe minor', description: minor.map(describe).join('\n') });
        console.log(`${path} (${colorScheme}, ${testInfo.project.name}): ${minor.map(describe).join('; ')}`);
      }

      const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ''));
      expect(blocking.map(describe), 'serious or critical axe violations').toEqual([]);
    });
  }
}
