import fallbackSnapshot from '../data/github-contributions.json' with { type: 'json' };
import { validateCalendar } from './contribution-calendar.mjs';

const DAY = 86_400_000;
const TTL = 15 * 60 * 1000;
const MAX_BYTES = 128 * 1024;
const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const SOURCE = 'https://github.com/users/sonlndv/contributions';
const QUERY = `query Calendar($from: DateTime!, $to: DateTime!) {
  user(login: "sonlndv") { contributionsCollection(from: $from, to: $to) {
    contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } }
  } }
}`;
function windowAt(now) {
  const through = new Date(now).toISOString().slice(0, 10);
  return { from: new Date(Date.parse(through + 'T00:00:00Z') - 364 * DAY).toISOString().slice(0, 10), through };
}

export function projectGithubCalendar(payload, now = Date.now()) {
  if (!payload || payload.errors?.length) throw new Error('Invalid provider result');
  const raw = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!raw || !Number.isSafeInteger(raw.totalContributions) || !Array.isArray(raw.weeks) || raw.weeks.length > 54) throw new Error('Invalid provider calendar');
  const { from, through } = windowAt(now);
  const days = [];
  for (const week of raw.weeks) {
    if (!Array.isArray(week.contributionDays) || week.contributionDays.length > 7) throw new Error('Invalid provider week');
    for (const day of week.contributionDays) {
      if (!day || Object.keys(day).sort().join(',') !== 'contributionCount,contributionLevel,date' || typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new Error('Invalid provider day');
      const level = LEVELS.indexOf(day.contributionLevel);
      if (level < 0 || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) throw new Error('Invalid provider count');
      if (day.date >= from && day.date <= through) days.push({ date: day.date, count: day.contributionCount, level });
    }
  }
  const calendar = { source: SOURCE, visibility: 'public-profile', metric: 'profile-contributions', retrievedAt: new Date(now).toISOString(), from, through, days, total: raw.totalContributions };
  return validateCalendar(calendar);
}

async function boundedJson(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Provider response too large');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing provider body');
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) { await reader.cancel(); throw new Error('Provider response too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Shared provider/projection/cache/error path used by Worker and private Node adapter.
// No credential is read here from build env, disk, CLI auth or browser input.
export function createCalendarService({ token, fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000 } = {}) {
  validateCalendar(fallbackSnapshot);
  let lastGood; let fetchedAt = 0; let retryAt = 0; let inFlight;
  const envelope = (mode) => {
    const calendar = lastGood ?? fallbackSnapshot;
    return { calendar: structuredClone(calendar), meta: { mode, fetchedAt: calendar.retrievedAt, stale: mode === 'stale' || mode === 'snapshot', source: lastGood ? 'github-graphql' : 'public-profile-snapshot' } };
  };
  async function refresh() {
    const controller = new AbortController(); let timer;
    try {
      const operation = (async () => {
        const range = windowAt(now());
        const response = await fetchImpl('https://api.github.com/graphql', {
          // Workers supports manual/follow, not error. Reject every non-2xx below;
          // manual mode never forwards the credential to a redirect destination.
          method: 'POST', redirect: 'manual', signal: controller.signal,
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/vnd.github+json', 'user-agent': 'Sonwork-public-calendar' },
          body: JSON.stringify({ query: QUERY, variables: { from: range.from + 'T00:00:00Z', to: range.through + 'T23:59:59Z' } }),
        });
        if (!response.ok) {
          const seconds = Number(response.headers.get('retry-after'));
          const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
          retryAt = Math.max(now() + 60_000, Number.isFinite(seconds) && seconds > 0 ? now() + Math.min(seconds, 86_400) * 1000 : 0, Number.isFinite(reset) && reset > now() ? Math.min(reset, now() + DAY) : 0);
          throw new Error('Provider unavailable');
        }
        return projectGithubCalendar(await boundedJson(response), now());
      })();
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Provider timeout')); }, timeoutMs); });
      lastGood = await Promise.race([operation, timeout]); fetchedAt = now(); retryAt = 0;
      return envelope('fresh');
    } catch {
      retryAt = Math.max(retryAt, now() + 60_000);
      return envelope(lastGood ? 'stale' : 'snapshot');
    } finally { clearTimeout(timer); }
  }
  return {
    async read() {
      if (lastGood && now() - fetchedAt < TTL) return envelope('cache');
      if (inFlight) return inFlight;
      if (typeof token !== 'string' || !token || /[\r\n]/.test(token) || now() < retryAt) return envelope(lastGood ? 'stale' : 'snapshot');
      inFlight = refresh();
      try { return await inFlight; } finally { inFlight = undefined; }
    },
  };
}

export async function calendarResponse(request, service) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow, noarchive', 'referrer-policy': 'no-referrer' };
  if (!['GET', 'HEAD'].includes(request.method)) return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { ...headers, allow: 'GET, HEAD' } });
  if (new URL(request.url).search) return new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: 'parameters_not_allowed' }), { status: 400, headers });
  const data = await service.read();
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(data), { status: 200, headers });
}
