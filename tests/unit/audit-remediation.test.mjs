import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { startServer } from '../../scripts/serve-dist.mjs';
import { mkdtemp, mkdir, writeFile, rm, cp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('retained scenery is outside the active build and public release tree', () => {
  assert.equal(existsSync('public/mountains'), false);
  for (const name of ['atmosphere.js', 'atmosphere.css', 'companion.js', 'texture.svg']) {
    assert.equal(existsSync(`public/${name}`), false);
    assert.ok(existsSync(`historical/scenery/${name}`));
  }
  for (const name of ['REAL-PLANETS-CREDITS.md', 'home-star-catalog.LICENSE.txt', 'mountains.js']) assert.ok(existsSync(`historical/scenery/mountains/${name}`));
  assert.doesNotMatch(readFileSync('astro.config.mjs', 'utf8'), /writeStarSky/);
  assert.doesNotMatch(readFileSync('src/styles/global.css', 'utf8'), /sim-stages|stage-dot|sim-controls/);
  assert.match(readFileSync('src/components/AgentSimulation.astro', 'utf8'), /agent-simulation\.css/);
});

test('local check runner propagates failures and closes its server after cancellation', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'runner-boundary-'));
  const runner = resolve('scripts/run-local-check.mjs');
  try {
    await mkdir(join(cwd, 'dist'));
    await mkdir(join(cwd, 'node_modules/.bin'), { recursive: true });
    await writeFile(join(cwd, 'dist/release.json'), JSON.stringify({ gitSHA: '1'.repeat(40) }));
    const fixture = '#!/usr/bin/env node\nconsole.log(process.env.TEST_BASE_URL);\nif (process.env.FIXTURE_WAIT) { process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 1000); } else process.exit(7);\n';
    for (const name of ['playwright', 'lhci']) await writeFile(join(cwd, 'node_modules/.bin', name), fixture, { mode: 0o755 });
    for (const mode of ['e2e', 'lh', 'invalid']) {
      const child = spawn(process.execPath, [runner, mode], { cwd, env: { ...process.env, GITHUB_SHA: '1'.repeat(40) } });
      const closed = once(child, 'close');
      let error = '';
      child.stderr.on('data', chunk => { error += chunk; });
      assert.equal((await closed)[0], mode === 'invalid' ? 1 : 7, error);
      if (mode === 'invalid') assert.match(error, /Expected e2e or lh/);
    }
    const child = spawn(process.execPath, [runner, 'e2e'], { cwd, env: { ...process.env, GITHUB_SHA: '1'.repeat(40), FIXTURE_WAIT: '1' } });
    const closed = once(child, 'close');
    try {
      const [chunk] = await once(child.stdout, 'data');
      const base = chunk.toString().trim();
      assert.equal((await fetch(`${base}/release.json`)).status, 200);
      child.kill('SIGTERM');
      assert.equal((await closed)[0], 0);
      await assert.rejects(fetch(`${base}/release.json`));
    } finally {
      if (child.exitCode === null) child.kill('SIGTERM');
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('browser configs require an owned server and Lighthouse matches only its exact origin', async () => {
  const env = { ...process.env };
  delete env.TEST_BASE_URL;
  for (const config of ['playwright.config.ts', 'lighthouserc.cjs']) {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(resolve(config))})`], { env });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk; });
    assert.equal((await once(child, 'close'))[0], 1);
    assert.match(error, /isolated, identity-checked server/);
  }
  const cwd = await mkdtemp(join(tmpdir(), 'lighthouse-routes-'));
  try {
    await mkdir(join(cwd, 'dist/nested'), { recursive: true });
    await writeFile(join(cwd, 'dist/index.html'), '<h1>Home</h1>');
    await writeFile(join(cwd, 'dist/nested/page.html'), '<h1>Page</h1>');
    const code = `const assert = require('node:assert/strict'); const c = require(${JSON.stringify(resolve('lighthouserc.cjs'))}).ci; assert.equal(c.collect.url.length, 2); for (const url of c.collect.url) { assert.equal(c.assert.assertMatrix.filter(a => new RegExp(a.matchingUrlPattern).test(url)).length, 1); assert.ok(c.assert.assertMatrix.every(a => !new RegExp(a.matchingUrlPattern).test(url.replace('127.0.0.1', '127x0x0x1')))); }`;
    const child = spawn(process.execPath, ['-e', code], { cwd, env: { ...env, TEST_BASE_URL: 'http://127.0.0.1:34567' } });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk; });
    assert.equal((await once(child, 'close'))[0], 0, error);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('retained scene imports resolve and the explicit star generator reproduces the retained artwork', async () => {
  const css = readFileSync('src/styles/home-scene.css', 'utf8');
  for (const [, path] of css.matchAll(/@import '([^']+)'/g)) assert.ok(existsSync(resolve('src/styles', path)), path);
  const cwd = await mkdtemp(join(tmpdir(), 'retained-stars-'));
  try {
    await mkdir(join(cwd, 'scripts'));
    await mkdir(join(cwd, 'src/assets'), { recursive: true });
    await cp('scripts/generate-star-sky.mjs', join(cwd, 'scripts/generate-star-sky.mjs'));
    await cp('src/assets/home-star-catalog.json', join(cwd, 'src/assets/home-star-catalog.json'));
    const child = spawn(process.execPath, ['scripts/generate-star-sky.mjs'], { cwd });
    assert.equal((await once(child, 'close'))[0], 0);
    for (const name of ['wide', 'tall']) assert.deepEqual(await readFile(join(cwd, `src/assets/home-star-sky-${name}.svg`)), await readFile(`src/assets/home-star-sky-${name}.svg`));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('parallel static servers own distinct ports and reject occupied ports', async () => {
  const first = await startServer('public', 0);
  const second = await startServer('public', 0);
  try {
    assert.notEqual(first.address().port, second.address().port);
    await assert.rejects(startServer('public', first.address().port), { code: 'EADDRINUSE' });
  } finally {
    await Promise.all([first, second].map(server => new Promise(resolve => server.close(resolve))));
  }
});

test('browser and Lighthouse runners reject stale build identity before starting checks', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'stale-build-'));
  try {
    await mkdir(join(cwd, 'dist'));
    await writeFile(join(cwd, 'dist/release.json'), JSON.stringify({ gitSHA: '0'.repeat(40) }));
    for (const mode of ['e2e', 'lh']) {
      const child = spawn(process.execPath, [resolve('scripts/run-local-check.mjs'), mode], {
        cwd, env: { ...process.env, GITHUB_SHA: '1'.repeat(40) },
      });
      let output = '';
      child.stderr.on('data', chunk => { output += chunk; });
      const code = await new Promise(resolve => child.on('close', resolve));
      assert.equal(code, 1, output);
      assert.match(output, /Build must match this checkout/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
