import test from 'node:test';
import assert from 'node:assert/strict';
import { redirectRules } from '../../scripts/redirects-file.mjs';
import { runtimeRoutes } from '../../scripts/runtime-routes.mjs';
import { readRedirectMap } from '../../scripts/redirect-map.mjs';
const row = (old_path, new_path, status = '301') => ({ old_path, new_path, status });

test('only the reclaimed Series index stops redirecting; legacy child and private/gone policies remain', () => {
  const rows = [row('/series/', '/writing'), row('/series', '/writing'), row('/series/building-perfeat/', '/writing'), row('/series-extra/', '/writing'), row('/book/', '/about'), row('/api/old', '', '410')];
  const rules = redirectRules(rows);
  assert.equal(rules.some(r => r.from === '/series' || r.from === '/series/'), false);
  for (const path of ['/series/building-perfeat/', '/series/building-perfeat', '/series-extra/', '/series-extra']) assert.equal(rules.find(r => r.from === path)?.to, '/writing');
  assert.equal(rules.some(r => r.from.startsWith('/book') || r.from.startsWith('/api')), false);
  const runtime = runtimeRoutes(rows);
  assert.equal(runtime.some(r => r.path === '/series' || r.path === '/series/'), false);
  assert.equal(runtime.find(r => r.path === '/series/building-perfeat/')?.status, 301);
  assert.equal(runtime.find(r => r.path === '/book/')?.target, '/about');
  assert.equal(runtime.find(r => r.path === '/api/old')?.status, 410);
});
test('historical CSV is retained, while its reclaimed index cannot enter emitted runtime rules', () => {
  const rows = readRedirectMap().rows;
  assert.equal(rows.find(r => r.old_path === '/series/')?.new_path, '/writing');
  assert.equal(redirectRules(rows).some(r => r.from === '/series' || r.from === '/series/'), false);
  assert.equal(runtimeRoutes(rows).some(r => r.path === '/series/'), false);
  for (const path of ['/series/solo-by-design/', '/series/from-the-desk/', '/series/life-book/', '/series/experiences/', '/series/human/']) {
    assert.equal(runtimeRoutes(rows).find(r => r.path === path)?.target, '/writing');
  }
});
