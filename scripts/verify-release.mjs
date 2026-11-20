import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRedirectMap, samplePath, currentRouteOverride, currentRedirects } from './redirect-map.mjs';

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

// Contents of every actual <style> element in the given HTML documents, each distinct string once. Comments and
// <script> bodies are removed first, so text that merely mentions a style tag is never collected.
export function collectInlineStyles(documents) {
  const found = new Set();
  for (const document of documents) {
    const markup = document.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    for (const [, content] of markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) if (content.trim()) found.add(content);
  }
  return [...found];
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
  const hiddenDrafts = ['a-keyboard-plugin-is-done-when-it-types', 'a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server'];
  const noteImageSha256 = '84cbb4083e00a864acad623637edfb0d55afd46ecfaafa0360aaf368f86894ab';
  const html = [];
  const notePath = '/series/me/the-joy-of-malleable-products';
  const tools = JSON.parse(readFileSync(new URL('../src/data/tools.json', import.meta.url), 'utf8'));
  const calendar = JSON.parse(readFileSync(new URL('../src/data/github-contributions.json', import.meta.url), 'utf8'));
  const retainedPaths = JSON.parse(readFileSync(new URL('../src/data/retained-series-slugs.json', import.meta.url), 'utf8')).map(slug => `/series/${slug}`);
  for (const path of ['/', '/series', '/series/me', '/study', ...retainedPaths, '/project', '/about', '/work', '/work/trivia-hub', notePath, '/subscribe']) {
    await check(path, async () => {
      const response = await get(path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      const body = (await response.text()).replaceAll('&#39;', "'").replaceAll('&#x27;', "'"); html.push(body);
      assert.doesNotMatch(body, /class=["'][^"']*draft-label/);
      assert.ok(body.includes(`href="https://sonwork.org${path}"`), 'canonical must use the production URL');
      assert.doesNotMatch(body, /\bdata-(?:signup-(?:url|key)|newsletter)=/);
      assert.doesNotMatch(body, /<form\b|<input\b|<button\b[^>]*type="submit"/);
      const primary = /<nav\b[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/.exec(body)?.[1];
      assert.ok(primary, 'shared primary navigation must be present');
      for (const [href, label] of [['/', 'About Me'], ['/series', 'Series'], ['/study', 'Study'], ['mailto:son@sonwork.org', 'Contact']]) assert.ok(primary.includes(`href="${href}"`) && primary.includes(label), `missing primary destination ${label}`);
      assert.ok(!primary.includes('href="/writing"'), 'Writing is no longer a primary section');
      const progress = /<nav\b[^>]*aria-label="Pages in progress"[^>]*>([\s\S]*?)<\/nav>/.exec(body)?.[1];
      assert.ok(progress, 'unfinished pages must remain accessible in the footer');
      assert.ok(progress.includes('href="/project"') && progress.includes('Project (coming soon)'), 'Project must remain clearly unfinished');
      assert.match(body, /href="mailto:son@sonwork\.org"/);
      assert.doesNotMatch(body, /<a\b[^>]*href="\/subscribe"[^>]*>Subscribe<\/a>/);
      if (path === '/subscribe') {
        const notices = [...body.matchAll(/<p\b[^>]*class="signup-closed"[^>]*>Signup opens soon\.<\/p>/g)];
        assert.equal(notices.length, 1, 'legacy Subscribe must show one noninteractive notice');
      } else if (path === '/') {
        assert.doesNotMatch(body, /<p\b[^>]*class=["'][^"']*\bsignup-closed\b/);
      }
      if (path === '/') {
        const headline = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(body)?.[1];
        assert.ok(headline, 'About must retain its main headline');
        assert.equal(headline.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), 'Trying things with AI.Learning as I go.', 'About headline text must survive animated span markup');
        for (const text of ['Agents and tools I use', 'GitHub contributions', '2,165 contributions. Not live data.']) assert.ok(body.includes(text), `missing ${text}`);
        const contacts = /<nav\b[^>]*aria-label="Contact Son"[^>]*>([\s\S]*?)<\/nav>/.exec(body)?.[1];
        assert.ok(contacts, 'About must have its compact public contact row');
        for (const href of ['mailto:son@sonwork.org', 'https://x.com/sonldv', 'https://github.com/sonlndv', 'https://www.linkedin.com/in/sonle2003/']) assert.ok(contacts.includes(`href="${href}"`), `missing exact public contact ${href}`);
        assert.doesNotMatch(body, /How I use|See the planned|class="[^"]*\bplanned-preview\b/);
        assert.doesNotMatch(body, /DATA CONNECTION PENDING|AI usage over time|GitHub commits|Always-on agents|data-doop-action/);
        const days = [...body.matchAll(/<button\b[^>]*class="calendar-day"[^>]*>/g)].map(([tag]) => ({ date: /data-date="([^"]+)"/.exec(tag)?.[1], count: Number(/data-count="([^"]+)"/.exec(tag)?.[1]), level: Number(/data-level="([^"]+)"/.exec(tag)?.[1]) }));
        assert.deepEqual(days, calendar.days, 'all approved UTC contribution counts and original levels must survive packaging');
        for (const tool of tools) assert.ok(body.includes(`data-tool="${tool.id}"`), `missing simple tool ${tool.name}`);
        assert.doesNotMatch(body, /class="(?:build-entry|front-projects)"/);
      }
      if (retainedPaths.includes(path)) {
        const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(body)?.[1];
        assert.ok(main, 'Series must have its shared main landmark');
        assert.equal(main.replace(/<[^>]+>/g, '').trim(), 'Series.Coming soon');
        assert.ok(body.includes('<title>Series | Son.</title>'));
        assert.ok(body.includes('name="description" content="Coming soon."'));
        assert.doesNotMatch(main, /<a\b|<time\b|<article\b|<button\b|<li\b|How I use|planned|Always-on|05/);
      }
      if (path === '/project') assert.match(body, /Coming soon/);
      if (path === '/about') assert.match(body, /business guy in Vietnam/);
      if (path === '/work' || path === '/work/trivia-hub') assert.match(body, /Trivia Hub/);
      if (path === '/subscribe') {
        assert.match(body, /Legacy newsletter links are retired\. No subscription has been changed here\./);
        assert.match(body, /href="mailto:son@sonwork\.org"/);
        assert.match(body, /href="\/series">All series<\/a>/);
      }
      if (path === '/series') {
        const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(body)?.[1];
        assert.ok(main?.includes('href="/series/me"'), 'Series must list the approved Me collection');
        assert.equal([...main.matchAll(/href="\/series\/[^"]+"/g)].length, 1, 'Series must list exactly the approved collection');
      }
      if (path === '/series/me') {
        const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(body)?.[1];
        assert.match(main, /<h1[^>]*>Me<\/h1>/);
        assert.match(main, /<h2[^>]*>Notes<\/h2>/);
        assert.ok(main.includes(`href="${notePath}"`), 'Me must link its approved note');
        assert.equal([...main.matchAll(/href="\/series\/me\/[^"]+"/g)].length, 1, 'Me must list exactly the approved note');
      }
      if (path === '/study') {
        assert.match(body, /<h1[^>]*>Study<\/h1>/);
        assert.match(body, /Coming soon\./);
      }
      if (path === notePath) {
        assert.match(body, /<h1[^>]*>The joy of malleable products<\/h1>/);
        assert.equal([...body.matchAll(/<h1[\s>]/g)].length, 1, 'article must have a single h1');
        assert.match(body, /<figcaption>Mounty’s dark theme in a public demo vault with illustrative content\.<\/figcaption>/);
        assert.match(body, /<img[^>]*src="\/images\/mounty-dark-demo\.png"/);
        assert.match(body, /href="https:\/\/github\.com\/sonlndv\/Mounty"/);
        assert.doesNotMatch(body, /<video\b|href="\/work\/mounty"/);
        assert.match(body, /aria-label="Note location"/);
        assert.ok(body.includes('href="/series/me"'), 'the note must link back to its Me series');
      }
      if (path !== '/') {
        const variant = await get(`${path}/`);
        assert.ok([301, 307, 308].includes(variant.status));
        assert.equal(new URL(variant.headers.get('location'), base).pathname, path);
        assert.equal((await follow(`${path}/`)).status, 200);
      }
    });
  }
  for (const { from, to } of currentRedirects) await check(`content move ${from}`, async () => {
    const response = await get(from);
    assert.equal(response.status, 301);
    assert.equal(new URL(response.headers.get('location'), base).pathname, to);
    assert.equal((await follow(from)).status, 200);
  });
  for (const slug of hiddenDrafts) {
    await check(`hidden draft ${slug}`, async () => {
      assert.equal((await get(`/writing/${slug}`)).status, 404);
      assert.ok(html.every(body => !body.includes(`/writing/${slug}`)));
    });
  }
  for (const draftPath of ['/series/always-on-agents', '/series/always-on-agents/available-isnt-always-thinking']) await check(`preserved draft remains private ${draftPath}`, async () => {
    assert.equal((await get(draftPath)).status, 404);
    assert.ok(html.every(body => !body.includes(`href="${draftPath}"`)));
  });
  await check('RSS', async () => {
    const response = await get('/rss.xml'); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /xml/);
    const feed = await response.text();
    assert.equal([...feed.matchAll(/<item[\s>]/g)].length, 1, 'RSS must contain exactly the approved Note');
    assert.match(feed, /<title>The joy of malleable products<\/title>/);
    assert.ok(feed.includes(notePath));
    assert.doesNotMatch(feed, /available-isnt-always-thinking/);
    for (const slug of hiddenDrafts) assert.ok(!feed.includes(slug), `RSS must not include ${slug}`);
  });
  await check('Note image bytes', async () => {
    const response = await get('/images/mounty-dark-demo.png'); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), noteImageSha256);
    assert.equal(bytes.readUInt32BE(16), 800); assert.equal(bytes.readUInt32BE(20), 604);
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
  // Cover both inline styles and linked stylesheets, including their non-preloaded font subsets.
  const css = collectInlineStyles(html);
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
      const current = currentRouteOverride(variant);
      if (current) {
        if (variant === current) assert.equal(response.status, 200, 'reclaimed Series index must load directly');
        else {
          assert.ok([301, 307, 308].includes(response.status));
          assert.equal(new URL(response.headers.get('location'), base).pathname, current);
        }
        const page = await follow(variant);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /<h1[^>]*>Series[\s<]/, 'historical index row must now reach the actual Series page');
      } else if (row.status === '410') assert.equal(response.status, 410);
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
  await check('fixed public calendar API', async () => {
    const response = await get('/api/github-calendar'); assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ['calendar', 'meta']);
    assert.deepEqual(Object.keys(data.meta).sort(), ['fetchedAt', 'mode', 'source', 'stale']);
    assert.ok(['fresh', 'cache', 'stale', 'snapshot'].includes(data.meta.mode));
    assert.equal(data.calendar.source, calendar.source);
    assert.equal(data.calendar.days.length, 365);
    assert.ok(data.calendar.days.every(day => Object.keys(day).sort().join(',') === 'count,date,level'));
    if (data.meta.mode === 'snapshot') assert.deepEqual(data.calendar, calendar);
    assert.equal((await get('/api/github-calendar', { method: 'HEAD' })).status, 200);
    assert.equal((await get('/api/github-calendar?login=other')).status, 400);
    assert.equal((await get('/api/github-calendar?query=mutation')).status, 400);
    assert.equal((await get('/api/github-calendar/')).status, 410);
    assert.equal((await get('/api/graphql')).status, 410);
  });
  // Mutations are checked only on the local runtime, never against a live API.
  if (['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
    for (const method of ['POST', 'PUT', 'DELETE']) await check(`fixed calendar rejects ${method}`, async () => {
      const response = await get('/api/github-calendar', { method }); assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    });
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
