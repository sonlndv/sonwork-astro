import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyLiveCalendar } from '../../scripts/verify-live-calendar.mjs';
const calendar = JSON.parse(readFileSync('src/data/github-contributions.json', 'utf8'));
const sha = '1'.repeat(40);
const now = Date.parse('2026-11-15T12:00:00Z');
const initial = { calendar, meta: { source: 'github-graphql', mode: 'cache', stale: false, fetchedAt: '2026-11-15T11:59:00Z' } };
function syntheticFetch(payload = initial, releaseSHA = sha, status = 200) {
  return async url => new Response(JSON.stringify(new URL(url).pathname === '/release.json' ? { gitSHA: releaseSHA } : payload), { status });
}
test('live-calendar verifier admits a valid synthetic public provider response bound to exact source', async () => {
  const result = await verifyLiveCalendar('https://example.test', sha, syntheticFetch(), now);
  assert.equal(result.days, 365); assert.equal(result.total, calendar.total); assert.equal(result.sourceSHA, sha);
});
for (const [label, change] of [
  ['snapshot instead of authenticated provider', { source: 'public-profile-snapshot' }],
  ['stale provider', { stale: true }],
  ['fallback mode', { mode: 'snapshot' }],
  ['expired fetch', { fetchedAt: '2026-11-15T10:00:00Z' }],
  ['future fetch', { fetchedAt: '2026-11-16T00:00:00Z' }],
]) test(`live-calendar verifier refuses synthetic ${label}`, async () => {
  await assert.rejects(() => verifyLiveCalendar('https://example.test', sha, syntheticFetch({ ...initial, meta: { ...initial.meta, ...change } }), now));
});
test('live-calendar verifier refuses wrong source and non-success HTTP responses', async () => {
  await assert.rejects(() => verifyLiveCalendar('https://example.test', sha, syntheticFetch(initial, '2'.repeat(40)), now), /source SHA differs/);
  await assert.rejects(() => verifyLiveCalendar('https://example.test', sha, syntheticFetch(initial, sha, 503), now), /HTTP 200/);
});
