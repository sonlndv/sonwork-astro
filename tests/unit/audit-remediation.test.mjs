import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { startServer } from '../../scripts/serve-dist.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

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
