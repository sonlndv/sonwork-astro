import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('spawned release guard fails closed for nonproduction NODE_ENV without printing values', () => {
  for (const value of ['development', 'test']) {
    const environment = { ...process.env, NODE_ENV: value };
    delete environment.SHOW_DRAFTS;
    for (const key of Object.keys(environment)) if (key.startsWith('PUBLIC_SIGNUP')) delete environment[key];
    const result = spawnSync(process.execPath, ['scripts/assert-release-env.mjs'], { env: environment, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release builds require/);
    assert.ok(!result.stderr.includes(value), 'guard must not print raw environment values');
  }
});
test('release guard allows empty or production NODE_ENV and npm dev remains the normal dev server', () => {
  assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).scripts.dev, 'astro dev');
  for (const value of ['', 'production']) {
    const environment = { ...process.env, NODE_ENV: value };
    delete environment.SHOW_DRAFTS;
    for (const key of Object.keys(environment)) if (key.startsWith('PUBLIC_SIGNUP')) delete environment[key];
    const result = spawnSync(process.execPath, ['scripts/assert-release-env.mjs'], { env: environment, encoding: 'utf8' });
    assert.equal(result.status, 0);
  }
});

test('actual npm build/check/preview commands reject nonproduction NODE_ENV before writing output', async () => {
  const { mkdtempSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'sonwork-release-env-'));
  try {
    for (const value of ['development', 'test']) for (const command of ['build', 'check', 'build:preview']) {
      const output = join(root, `output-${command.replace(':', '-')}`);
      const environment = { ...process.env, NODE_ENV: value };
      delete environment.SHOW_DRAFTS;
      for (const key of Object.keys(environment)) if (key.startsWith('PUBLIC_SIGNUP')) delete environment[key];
      const args = command === 'build' ? ['run', command, '--', '--outDir', output] : ['run', command];
      const result = spawnSync('npm', args, { env: environment, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Release builds require/);
      assert.ok(!result.stderr.includes(value), 'guard must not print raw environment values');
      assert.ok(!existsSync(output));
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
