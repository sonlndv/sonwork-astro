import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRedirectMap, samplePath } from './redirect-map.mjs';

// Node fetch overwrites Sec-Fetch-Mode with cors. Use HTTP directly so the
// navigation gate exercises the same routing header a browser actually sends.
export function fetchNavigation(url) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      headers: { 'Sec-Fetch-Mode': 'navigate' },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers }));
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error('Navigation request timed out')));
    request.on('error', reject); request.end();
  });
}

export async function verifyRelease(base, expectedSha, output) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'expected actual full release SHA is required');
  const inventory = [];
  const errors = [];
  const get = async (path, options = {}) => {
    const url = new URL(path, base);
    const response = options.headers?.['Sec-Fetch-Mode'] === 'navigate' ? await fetchNavigation(url) : await fetch(url, { redirect: 'manual', ...options });
    inventory.push({ path, method: options.method ?? 'GET', navigation: options.headers?.['Sec-Fetch-Mode'] === 'navigate', status: response.status, location: response.headers.get('location'), type: response.headers.get('content-type') });
    return response;
  };
  const check = async (name, fn) => {
    try { await fn(); } catch (error) { errors.push(`${name}: ${error.message}`); }
  };
  const follow = async path => {
    let url = new URL(path, base);
    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      assert.ok(!seen.has(url.href), `redirect cycle at ${url.pathname}`);
      seen.add(url.href);
      assert.equal(url.origin, new URL(base).origin, 'redirect must remain on the release host');
      const response = await get(url);
      if (![301, 302, 307, 308].includes(response.status)) return response;
      url = new URL(response.headers.get('location'), url);
    }
    throw new Error('too many redirects');
  };
  await check('release identity', async () => {
    const response = await get(`/release.json?verify=${expectedSha}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).gitSHA, expectedSha);
  });
  // Never probe retired application routes on a stale/unidentified live release.
  if (errors.length) {
    if (output) writeFileSync(output, JSON.stringify({ base, expectedSha, requests: inventory.length, errors, inventory }, null, 2) + '\n');
    throw new Error(`Release identity failed: ${errors.join('; ')}`);
  }
  const html = [];
  for (const path of ['/', '/about', '/work', '/work/trivia-hub', '/writing', '/subscribe']) {
    await check(path, async () => {
      const response = await get(path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      const body = (await response.text()).replaceAll('&#39;', "'").replaceAll('&#x27;', "'"); html.push(body);
      assert.doesNotMatch(body, /class=["'][^"']*draft-label/);
      assert.ok(body.includes(`href="https://sonwork.org${path}"`), 'canonical must use the production URL');
      assert.doesNotMatch(body, /data-signup-(url|key)=/);
      if (path === '/' || path === '/subscribe') assert.match(body, /<form[^>]*class="subscribe-form"/);
      for (const button of body.matchAll(/<button\b([^>]*)>Subscribe<\/button>/g)) assert.match(button[1], /disabled/);
      if (path === '/') for (const text of ["I'm Son", 'Trivia Hub', 'Keymarchy', 'Perfeat']) assert.ok(body.includes(text), `missing ${text}`);
      if (path === '/about') assert.match(body, /business guy in Vietnam/);
      if (path === '/work' || path === '/work/trivia-hub') assert.match(body, /Trivia Hub/);
      if (path === '/subscribe') assert.match(body, /No subscription has been changed here/);
      if (path !== '/') {
        const variant = await get(`${path}/`);
        assert.ok([301, 307, 308].includes(variant.status));
        assert.equal(new URL(variant.headers.get('location'), base).pathname, path);
        assert.equal((await follow(`${path}/`)).status, 200);
      }
    });
  }
  for (const slug of ['a-keyboard-plugin-is-done-when-it-types', 'a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server']) {
    await check(`hidden draft ${slug}`, async () => {
      assert.equal((await get(`/writing/${slug}`)).status, 404);
      assert.ok(html.every(body => !body.includes(`/writing/${slug}`)));
    });
  }
  await check('RSS', async () => {
    const response = await get('/rss.xml'); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /xml/);
    assert.doesNotMatch(await response.text(), /<item[\s>]/);
  });
  await check('unknown', async () => {
    const response = await get('/release-unknown-path-404'); assert.equal(response.status, 404);
    const body = await response.text();
    assert.match(body, /name="robots"[^>]*content="noindex, follow"/);
    assert.doesNotMatch(body, /rel="canonical"|property="og:url"/);
  });
  const assets = new Map([
    ['/robots.txt', /text\/plain/], ['/favicon.svg', /image\/svg\+xml/],
    ...['/favicon.png', '/apple-touch-icon.png', '/icon-512.png', '/og.png'].map(p => [p, /image\/png/]),
  ]);
  for (const body of html) {
    for (const match of body.matchAll(/(?:href|src)=["']([^"']+\.(?:css|woff2))(?:["'])/g)) {
      const path = match[1]; assert.ok(path.startsWith('/')); assets.set(path, path.endsWith('.css') ? /text\/css/ : /font\/woff2|application\/font/);
    }
  }
  const css = [];
  for (const [path, type] of assets) await check(`asset ${path}`, async () => {
    const response = await get(path); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), type);
    if (path.endsWith('.css')) css.push(await response.text());
    else if (path.endsWith('.png')) assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  });
  // Fonts referenced from CSS must work too, including non-preloaded subsets.
  for (const body of css) for (const [, path] of body.matchAll(/url\(["']?(\/fonts\/[^)"']+)["']?\)/g)) {
    await check(`font ${path}`, async () => { const r = await get(path); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /font|octet-stream/); });
  }
  for (const row of readRedirectMap().rows) {
    const path = samplePath(row.old_path);
    const variants = path.endsWith('/') && path !== '/' ? [path, path.slice(0, -1)] : [path];
    for (const variant of variants) for (const navigation of [false, true]) await check(`map ${variant} navigation=${navigation}`, async () => {
      const response = await get(variant, navigation ? { headers: { 'Sec-Fetch-Mode': 'navigate' } } : {});
      if (row.status === '410') assert.equal(response.status, 410);
      else if (row.status === '301') {
        // /about/ is a canonical slash normalization by the asset host (307).
        const same = variant.replace(/\/$/, '') === row.new_path.replace(/\/$/, '');
        assert.ok((same ? [200, 301, 307, 308] : [301]).includes(response.status));
        if (response.status !== 200) assert.equal(new URL(response.headers.get('location'), base).pathname, row.new_path);
        assert.equal((await follow(variant)).status, 200);
      } else assert.equal((await follow(variant)).status, 200);
    });
  }
  for (const path of ['/book', '/book/status/', '/api/unsubscribe', '/api/unsubscribe/']) await check(`private ${path}`, async () => {
    const response = await get(`${path}?e=fictional%40example.invalid&t=fictional-token&utm_source=old`);
    assert.equal(response.status, 301);
    const target = new URL(response.headers.get('location'), base); assert.equal(target.search, '');
    assert.equal(target.pathname, path.startsWith('/api') ? '/subscribe' : '/about');
    assert.equal((await follow(target)).status, 200);
  });
  await check('ordinary query', async () => {
    const r = await get('/projects/?utm_source=old'); assert.equal(r.status, 301);
    assert.equal(new URL(r.headers.get('location'), base).search, '?utm_source=old');
  });
  // Mutations are checked only on the local runtime, never against a live API.
  if (['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
    for (const method of ['HEAD', 'POST', 'DELETE']) await check(`retired API ${method}`, async () => {
      const r = await get('/api/retired-test', { method }); assert.equal(r.status, 410);
      if (method === 'HEAD') assert.equal(await r.text(), '');
    });
  }
  const result = { base, expectedSha, requests: inventory.length, csvRows: readRedirectMap().rows.length, errors, inventory };
  if (output) writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(`release HTTP: ${inventory.length} requests, ${result.csvRows} CSV rows, ${errors.length} failures`);
  assert.deepEqual(errors, []);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyRelease(process.argv[2], process.argv[3] ?? process.env.GITHUB_SHA, process.argv[4]);
}
