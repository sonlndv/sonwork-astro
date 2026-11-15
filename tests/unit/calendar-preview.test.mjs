import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { startServer } from '../../scripts/serve-dist.mjs';
import { createCalendarService } from '../../src/lib/github-calendar-api.mjs';
import snapshot from '../../src/data/github-contributions.json' with { type: 'json' };

// TRACK is rejected by Node's HTTP parser with400, before the application listener.
for (const [method, expected] of [['TRACE', 405], ['TRACK', 400]]) test(`raw HTTP ${method} is refused without terminating preview`, () => {
  const code = `
    import assert from 'node:assert/strict';
    import { request } from 'node:http';
    import { once } from 'node:events';
    import { startServer } from './scripts/serve-dist.mjs';
    const server = await startServer('dist', 0, { noIndex: true });
    try {
      const status = await new Promise((resolve, reject) => {
        const req = request({ host: '127.0.0.1', port: server.address().port, path: '/api/github-calendar', method: '${method}' }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
        req.on('error', reject); req.end();
      });
      assert.equal(status, ${expected});
      assert.equal((await fetch('http://127.0.0.1:' + server.address().port + '/api/github-calendar')).status, 200);
    } finally { const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed; }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 8000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

// Real local HTTP adapter; synthetic transport never proves GitHub connection.
test('private same-origin adapter shares provider cache and never exposes credential/upstream fields', async () => {
  let calls = 0;
  const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
  const synthetic = ['runtime', 'test', 'only'].join('-');
  const service = createCalendarService({ token: synthetic, now: () => Date.parse('2026-11-15T08:00:00Z'), fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/graphql');
    assert.equal(options.headers.authorization, `Bearer ${synthetic}`);
    return Response.json({ data: { privateFieldNeverReturned: 'sentinel-private-field', user: { contributionsCollection: { contributionCalendar: { totalContributions: snapshot.total, weeks: Array.from({ length: 53 }, (_, index) => ({ contributionDays: snapshot.days.slice(index * 7, index * 7 + 7).map(day => ({ date: day.date, contributionCount: day.count, contributionLevel: levels[day.level] })) })) } } } } });
  } });
  const server = await startServer('dist', 0, { noIndex: true, calendarService: service });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [method, query, status] of [['POST', '', 405], ['GET', '?query=mutation', 400], ['GET', '?login=other', 400]]) {
      assert.equal((await fetch(base + '/api/github-calendar' + query, { method })).status, status);
    }
    assert.equal(calls, 0, 'refused input must never invoke provider');
    const response = await fetch(base + '/api/github-calendar');
    const text = await response.text(); const data = JSON.parse(text);
    assert.deepEqual(data.calendar.days, snapshot.days); assert.equal(data.meta.mode, 'fresh');
    assert.ok(!text.includes(synthetic)); assert.ok(!text.includes('sentinel-private-field'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const cached = await (await fetch(base + '/api/github-calendar')).json();
    assert.equal(cached.meta.mode, 'cache'); assert.equal(calls, 1);
    const head = await fetch(base + '/api/github-calendar', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(calls, 1);
    for (const path of ['/src/lib/github-calendar-api.mjs', '/scripts/calendar-credential.mjs', '/.env', '/api/graphql']) {
      const denied = await fetch(base + path); assert.equal(denied.status, 404);
      assert.match(denied.headers.get('x-robots-tag'), /noindex/);
    }
  } finally {
    const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed;
  }
});
