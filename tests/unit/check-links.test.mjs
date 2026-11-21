import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { check } from 'linkinator';
import { glob } from 'glob';

test('independent built-page seeds detect a nested failure even when 404 wins the cache race', async () => {
  const pages = { '/': '<a href="/child">child</a>', '/404.html': '<a href="/child">child</a>', '/child': '<a href="/nested">nested</a>', '/nested': '<a href="/missing">broken</a>' };
  const server = createServer((req, res) => {
    const send = () => { res.writeHead(pages[req.url] ? 200 : 404, { 'content-type': 'text/html' }); res.end(pages[req.url] ?? 'missing'); };
    if (req.url === '/') setTimeout(send, 100); else send();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const old = await check({ path: [`${origin}/`, `${origin}/404.html`], recurse: true });
    assert.equal(old.passed, true);
    const complete = await check({ path: Object.keys(pages).map(path => origin + path), recurse: true });
    assert.equal(complete.passed, false);
    assert.ok(complete.links.some(link => link.url === `${origin}/missing` && link.status === 404));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('link gate checks nested and unlinked built pages', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'links-'));
  try {
    await mkdir(join(dir, 'nested'));
    await writeFile(join(dir, 'index.html'), '<a href="/child">child</a>');
    await writeFile(join(dir, '404.html'), '<a href="/child">child</a>');
    await writeFile(join(dir, 'child.html'), '<a href="/nested/page">nested</a>');
    await writeFile(join(dir, 'nested/page.html'), '<a href="/missing-nested">broken</a>');
    await writeFile(join(dir, 'unlinked.html'), '<a href="/missing-unlinked">broken</a>');
    await writeFile(join(dir, 'nested/with space.html'), '<a href="/missing-encoded">broken</a>');
    assert.equal((await glob(`${dir}/**/*.html`)).length, 6);
    const child = spawn(process.execPath, ['scripts/check-links.mjs', dir], { env: { ...process.env, LINKS_PORT: '0' } });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk; });
    const code = await new Promise(resolve => child.on('close', resolve));
    assert.equal(code, 1, output);
    assert.match(output, /BROKEN 404 .*\/missing-nested/);
    assert.match(output, /BROKEN 404 .*\/missing-unlinked/);
    assert.match(output, /BROKEN 404 .*\/missing-encoded/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('link gate rejects an empty build instead of reporting success', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'empty-links-'));
  try {
    const child = spawn(process.execPath, ['scripts/check-links.mjs', dir]);
    let output = '';
    child.stderr.on('data', chunk => { output += chunk; });
    assert.equal(await new Promise(resolve => child.on('close', resolve)), 1);
    assert.match(output, /No built HTML pages/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
