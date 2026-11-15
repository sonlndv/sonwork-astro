import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { startServer } from '../../scripts/serve-dist.mjs';

test('private built preview is loopback-only, noindex and refuses symlink escape', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'private-built-preview-'));
  const outside = await mkdtemp(join(tmpdir(), 'preview-outside-'));
  let server;
  try {
    await writeFile(join(dir, 'index.html'), '<h1>Private fixture</h1>');
    await writeFile(join(dir, '404.html'), '<h1>Not found</h1>');
    await writeFile(join(outside, 'private.txt'), 'Not a served asset');
    await symlink(join(outside, 'private.txt'), join(dir, 'escape.txt'));
    server = await startServer(dir, 0, { noIndex: true });
    assert.equal(server.address().address, '127.0.0.1');
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    for (const path of ['/escape.txt', '/.git/config', '/AGENTS.md', '/%2e%2e/private.txt']) {
      const missing = await fetch(base + path);
      assert.equal(missing.status, 404, path);
      assert.match(missing.headers.get('x-robots-tag'), /noindex/);
      assert.doesNotMatch(await missing.text(), /Not a served asset/);
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('actual private preview entrypoint rejects source, symlink roots and privileged ports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'preview-cli-'));
  try {
    await writeFile(join(dir, 'index.html'), '<h1>Built fixture</h1>');
    await writeFile(join(dir, 'release.json'), '{}');
    await symlink(dir, join(dir, 'linked-root'));
    for (const [root, port, error] of [[process.cwd(), '4379', /actual built-asset directory/], [join(dir, 'linked-root'), '4379', /actual built-asset directory/], [dir, '80', /unprivileged TCP port/]]) {
      const result = spawnSync(process.execPath, ['scripts/private-preview.mjs', root, port], { encoding: 'utf8', timeout: 2000 });
      assert.equal(result.status, 1, result.stderr || result.error?.message);
      assert.match(result.stderr, error);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
