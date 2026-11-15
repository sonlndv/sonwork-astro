import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../../src/data/github-contributions.json' with { type: 'json' };
import { createCalendarService, calendarResponse, projectGithubCalendar } from '../../src/lib/github-calendar-api.mjs';

// Synthetic transport fixture only; it is never used as live-provider evidence.
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const fixture = () => ({ data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 2165, weeks: Array.from({ length: Math.ceil(snapshot.days.length / 7) }, (_, index) => ({ contributionDays: snapshot.days.slice(index * 7, index * 7 + 7).map(d => ({ date: d.date, contributionCount: d.count, contributionLevel: levels[d.level] })) })) } } } } });
const clock = Date.parse('2026-11-15T08:00:00Z');
const token = 'unit-test-only-not-a-real-credential';

test('real projection preserves UTC levels/counts and rejects malformed or private-field payloads', () => {
  const projected = projectGithubCalendar(fixture(), clock);
  assert.deepEqual(projected.days, snapshot.days); assert.equal(projected.total, 2165);
  for (const mutate of [x => { x.errors = [{ message: 'untrusted upstream text' }]; }, x => { x.data.user.contributionsCollection.contributionCalendar.totalContributions++; }, x => { x.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays[0].contributionLevel = 'UNKNOWN'; }, x => { x.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays[0].date = '2025-02-30'; }, x => { x.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays[0].repository = 'private-detail'; }]) {
    const input = fixture(); mutate(input); assert.throws(() => projectGithubCalendar(input, clock));
  }
});

test('cache/coalescing/TTL use actual provider wrapper and fixed read-only query', async () => {
  let now = clock; const calls = [];
  const service = createCalendarService({ token, now: () => now, fetchImpl: async (url, options) => { calls.push({ url, options }); await new Promise(r => setTimeout(r, 2)); return Response.json(fixture()); } });
  const [one, two] = await Promise.all([service.read(), service.read()]);
  assert.equal(one.meta.mode, 'fresh'); assert.deepEqual(one, two); assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/graphql');
  const sent = JSON.parse(calls[0].options.body); assert.match(sent.query, /user\(login: "sonlndv"\)/); assert.doesNotMatch(sent.query, /mutation|repository|commitContributions|read:user/);
  assert.equal((await service.read()).meta.mode, 'cache'); assert.equal(calls.length, 1);
  now += 15 * 60 * 1000 + 1; assert.equal((await service.read()).meta.mode, 'fresh'); assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(one).includes(token));
});

test('provider errors retain validated last-good and cooldown; missing credential never fetches', async () => {
  let now = clock; let fail = false; let calls = 0;
  const service = createCalendarService({ token, now: () => now, fetchImpl: async () => { calls++; return fail ? new Response('never expose upstream body', { status: 401 }) : Response.json(fixture()); } });
  await service.read(); now += 15 * 60 * 1000 + 1; fail = true;
  const stale = await service.read(); assert.equal(stale.meta.mode, 'stale'); assert.equal(stale.meta.stale, true); assert.deepEqual(stale.calendar.days, snapshot.days);
  await service.read(); assert.equal(calls, 2); assert.ok(!JSON.stringify(stale).includes('never expose'));
  const absent = createCalendarService({ now: () => clock, fetchImpl: () => { throw Error('must not fetch'); } });
  assert.equal((await absent.read()).meta.mode, 'snapshot');
});

for (const kind of ['401', '403', '429', 'timeout', 'graphql', 'invalid', 'oversize', 'network']) test(`real error path ${kind} returns truthful safe snapshot`, async () => {
  const fetchImpl = async () => {
    if (/^\d+$/.test(kind)) return new Response('secret upstream text', { status: Number(kind) });
    if (kind === 'timeout') return new Promise(() => {});
    if (kind === 'network') throw Error('secret transport detail');
    if (kind === 'graphql') return Response.json({ errors: [{ message: 'secret upstream text' }] });
    if (kind === 'oversize') return new Response('x'.repeat(129 * 1024));
    return Response.json({ data: { user: null } });
  };
  const result = await createCalendarService({ token, now: () => clock, fetchImpl, timeoutMs: 5 }).read();
  assert.equal(result.meta.mode, 'snapshot'); assert.equal(result.meta.stale, true); assert.deepEqual(result.calendar, snapshot);
  assert.ok(!JSON.stringify(result).includes('secret')); assert.ok(!JSON.stringify(result).includes(token));
});

test('upstream body-stall timeout aborts transport and oversized chunked body is cancelled', async () => {
  let aborted = false; let cancelled = false;
  const stalled = createCalendarService({ token, now: () => clock, timeoutMs: 5, fetchImpl: async (_url, options) => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{'));
    options.signal.addEventListener('abort', () => { aborted = true; controller.error(new Error('synthetic body aborted')); });
  } })) });
  assert.equal((await stalled.read()).meta.mode, 'snapshot'); assert.equal(aborted, true);
  const oversized = createCalendarService({ token, now: () => clock, fetchImpl: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(128 * 1024 + 1)); }, cancel() { cancelled = true; } })) });
  assert.equal((await oversized.read()).meta.mode, 'snapshot'); assert.equal(cancelled, true);
});

test('HTTP contract rejects method/query before provider and HEAD has no body', async () => {
  const service = createCalendarService();
  for (const [method, query, status] of [['POST', '', 405], ['GET', '?login=someone-else', 400], ['GET', '?upstream=https://example.invalid', 400]]) {
    const response = await calendarResponse(new Request('https://example.invalid/api/github-calendar' + query, { method }), service);
    assert.equal(response.status, status); assert.deepEqual(Object.keys(await response.json()), ['error']);
  }
  const head = await calendarResponse(new Request('https://example.invalid/api/github-calendar', { method: 'HEAD' }), service);
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});
