import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { validateCalendar } from '../src/lib/contribution-calendar.mjs';

export async function verifyLiveCalendar(base, expectedSHA, fetchImpl = globalThis.fetch, now = Date.now()) {
  assert.match(expectedSHA ?? '', /^[a-f0-9]{40}$/, 'Full live source SHA is required');
  async function read(path) {
    const response = await fetchImpl(new URL(path, base), { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    assert.equal(response.status, 200, 'Live calendar verification requires HTTP 200');
    const body = await response.text(); assert.ok(body.length <= 160000, 'Live response exceeds public calendar bound');
    return JSON.parse(body);
  }
  assert.equal((await read('/release.json')).gitSHA, expectedSHA, 'Live calendar source SHA differs');
  const payload = await read('/api/github-calendar');
  validateCalendar(payload.calendar);
  assert.equal(payload.calendar.days.length, 365, 'Live provider must cover the complete 365-day window');
  assert.equal(payload.meta?.source, 'github-graphql', 'Official calendar provider is not connected');
  assert.equal(payload.meta.stale, false, 'Live calendar must not be stale');
  assert.ok(['fresh', 'cache'].includes(payload.meta.mode), 'Live calendar must come from a successful provider fetch');
  const age = now - Date.parse(payload.meta.fetchedAt);
  assert.ok(Number.isFinite(age) && age >= -120000 && age <= 17 * 60 * 1000, 'Live provider fetched time is missing, future or expired');
  return { sourceSHA: expectedSHA, source: payload.meta.source, mode: payload.meta.mode, stale: false, fetchedAt: payload.meta.fetchedAt, days: payload.calendar.days.length, total: payload.calendar.total };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv.length, 4, 'Usage: node scripts/verify-live-calendar.mjs ORIGIN FULL_SOURCE_SHA');
  console.log(JSON.stringify(await verifyLiveCalendar(process.argv[2], process.argv[3])));
}
