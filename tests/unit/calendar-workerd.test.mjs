import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

const snapshot = JSON.parse(readFileSync(new URL('../../src/data/github-contributions.json', import.meta.url), 'utf8'));
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const fixture = { data: { user: { contributionsCollection: { contributionCalendar: {
  totalContributions: snapshot.total,
  weeks: Array.from({ length: Math.ceil(snapshot.days.length / 7) }, (_, i) => ({
    contributionDays: snapshot.days.slice(i * 7, i * 7 + 7).map(day => ({
      date: day.date, contributionCount: day.count, contributionLevel: levels[day.level],
    })),
  })),
} } } } };

// Exercise actual workerd RequestInit validation, not a Node fetch mock.
// Every credential/response in this test is an explicit synthetic fixture.
const code = (await build({
  stdin: {
    contents: `import { createCalendarService } from './src/lib/github-calendar-api.mjs';
      export default { async fetch(request, env) {
        const service = createCalendarService({ token: env.GITHUB_CALENDAR_TOKEN,
          now: () => Date.parse('2026-11-15T12:00:00Z') });
        const value = await service.read();
        return Response.json({ meta: value.meta, days: value.calendar.days.length });
      } };`,
    resolveDir: resolve('.'), sourcefile: 'calendar-runtime-test.js',
  },
  bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
})).outputFiles[0].text;

async function run(upstreamStatus) {
  const calls = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, compatibilityDate: '2026-05-20', script: code,
    host: '127.0.0.1', cf: false, log: new Log(LogLevel.NONE),
    bindings: { GITHUB_CALENDAR_TOKEN: 'fixture-calendar-read-token' },
    outboundService: async request => {
      calls.push({ url: request.url, method: request.method });
      assert.equal(request.url, 'https://api.github.com/graphql', 'Never forward a credential to the redirect target');
      if (upstreamStatus === 302) return new Response(null, {
        status: 302, headers: { location: 'https://redirect-target.invalid/never-follow' },
      });
      return Response.json(fixture);
    },
  }));
  try {
    const response = await mf.dispatchFetch('http://calendar-test.local/');
    return { payload: await response.json(), calls };
  } finally { await mf.dispose(); }
}

test('native Worker calendar transport accepts a response and refuses redirects without following', async () => {
  const success = await run(200);
  const redirect = await run(302);
  assert.equal(success.payload.meta.source, 'github-graphql', 'Supported native Worker fetch must reach the provider');
  assert.equal(success.payload.meta.stale, false);
  assert.equal(success.payload.days, 365);
  assert.deepEqual(success.calls, [{ url: 'https://api.github.com/graphql', method: 'POST' }]);
  assert.equal(redirect.payload.meta.source, 'public-profile-snapshot');
  assert.equal(redirect.payload.meta.stale, true);
  assert.deepEqual(redirect.calls, [{ url: 'https://api.github.com/graphql', method: 'POST' }], 'Reject 3xx without any second request');
});
