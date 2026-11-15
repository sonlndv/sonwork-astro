import { expect, test } from '@playwright/test';
import { readRedirectMap, samplePath } from '../../scripts/redirect-map.mjs';

// Actual HTTP semantics are exercised for every row and private-query variant by
// test:production against exact packaged LOCAL Wrangler, never an unrelated/public host.
test('every retained legacy row has a deliberate status and live target or retirement', async () => {
  const { rows } = readRedirectMap();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(['301', '410', 'none']).toContain(row.status);
    expect(samplePath(row.old_path)).toMatch(/^\//);
    if (row.status === '301') expect(row.new_path).toMatch(/^\/(?:$|about|work|writing|subscribe)/);
  }
});
