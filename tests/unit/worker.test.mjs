import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../src/worker/index.mjs';
import { buildSha } from '../../scripts/build-release.mjs';

const request = (path, method = 'GET') => new Request(`https://sonwork.org${path}`, { method });
const env = (status = 404) => ({ ASSETS: { fetch: async () => new Response('asset', { status }) } });

test('retired API and files return actual 410 for GET, HEAD and POST', async () => {
  for (const path of ['/api/notes', '/api/', '/login', '/logout', '/og/old.png', '/404/', '/404.html', '/404']) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const response = await worker.fetch(request(path, method), env());
      assert.equal(response.status, 410, `${method} ${path}`);
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
});
test('actual assets beat retirement patterns; missing old hashes are gone', async () => {
  for (const path of ['/favicon.svg', '/_astro/current.css', '/pagefind/old.js']) {
    assert.equal((await worker.fetch(request(path), env(200))).status, 200);
  }
  for (const path of ['/_astro/old.css', '/pagefind/old.js']) {
    assert.equal((await worker.fetch(request(path), env())).status, 410);
  }
});
test('unknown paths stay 404', async () => {
  assert.equal((await worker.fetch(request('/new-unknown'), env())).status, 404);
});
test('private booking and unsubscribe queries never reach redirect destinations', async () => {
  for (const path of ['/book', '/book/', '/book/status', '/book/status/', '/api/unsubscribe', '/api/unsubscribe/']) {
    const response = await worker.fetch(request(`${path}?e=fictional%40example.invalid&t=fictional-token&utm_source=old`), env());
    assert.equal(response.status, 301, path);
    const location = new URL(response.headers.get('location'), 'https://sonwork.org');
    assert.equal(location.search, '');
    assert.equal(location.pathname, path.startsWith('/api') ? '/subscribe' : '/about');
  }
});
test('ordinary redirects preserve queries and exact routes beat patterns', async () => {
  const response = await worker.fetch(request('/projects/?utm_source=old'), env());
  assert.equal(response.status, 301);
  assert.equal(new URL(response.headers.get('location')).pathname, '/work');
  assert.equal(new URL(response.headers.get('location')).search, '?utm_source=old');
});
test('release identifier accepts only actual full Git SHAs', () => {
  assert.throws(() => buildSha({ GITHUB_SHA: 'invented' }));
  assert.match(buildSha({}), /^[a-f0-9]{40}$/);
});

test('live verification stops before legacy endpoints when release SHA differs', async () => {
  const { verifyRelease } = await import('../../scripts/verify-release.mjs');
  const original = globalThis.fetch;
  const paths = [];
  globalThis.fetch = async url => {
    paths.push(new URL(url).pathname);
    return Response.json({ gitSHA: '1'.repeat(40) });
  };
  try {
    await assert.rejects(() => verifyRelease('https://example.invalid', '0'.repeat(40)), /Release identity failed/);
    assert.deepEqual(paths, ['/release.json']);
  } finally { globalThis.fetch = original; }
});
