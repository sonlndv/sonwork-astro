import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedPath, separateRoots, scanPublic } from '../../scripts/sanitized-release-export.mjs';

test('public allowlist excludes private planning, caches, credentials and unused signup integration', () => {
  for (const path of ['PLAN.md', 'BRIEF.md', 'HANDOFF.md', 'library/dns-records.md', '.env', 'src/.env.local', 'src/link/.git/config', 'reports/proof.json', 'dist/index.html', 'scripts/signup-e2e.mjs', 'tests/signup/flows.spec.ts', 'playwright.signup.config.ts', 'public/release.json', '../src/escape']) assert.equal(allowedPath(path), false, path);
  for (const path of ['src/pages/index.astro', 'public/favicon.png', 'library/redirect-map.csv', 'scripts/verify-release.mjs', 'tests/production/release.spec.ts', 'wrangler.jsonc']) assert.equal(allowedPath(path), true, path);
});
test('export roots must be separate, never nested or equal', () => {
  assert.throws(() => separateRoots('/tmp/source', '/tmp/source'));
  assert.throws(() => separateRoots('/tmp/source', '/tmp/source/release'));
  assert.throws(() => separateRoots('/tmp/source/release', '/tmp/source'));
  assert.doesNotThrow(() => separateRoots('/tmp/source', '/tmp/release'));
});
test('external forbidden terms are case insensitive and never returned in errors', () => {
  assert.throws(() => scanPublic('fixture.txt', Buffer.from('FICTIONAL_RESTRICTED_TERM'), ['fictional_restricted_term']), error => !error.message.includes('fictional_restricted_term'));
  assert.doesNotThrow(() => scanPublic('fixture.txt', Buffer.from('approved public content'), []));
});

test('a Git fixture rejects extra tracked and untracked source files', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { assertExactTree } = await import('../../scripts/sanitized-release-export.mjs');
  const root = mkdtempSync(join(tmpdir(), 'sonwork-export-test-'));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git(['init']); mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src/expected.mjs'), 'export default 1;');
    writeFileSync(join(root, 'src/unexpected.mjs'), 'export default 2;');
    git(['add', 'src']);
    const input = ['src/expected.mjs'];
    const tracked = () => git(['ls-files', '-z']).split('\0').filter(Boolean);
    const discovered = () => readdirSync(join(root, 'src')).map(name => `src/${name}`);
    assert.throws(() => assertExactTree(input, tracked(), discovered()), /tracked files must exactly match/);
    git(['rm', '--cached', 'src/unexpected.mjs']);
    assert.throws(() => assertExactTree(input, tracked(), discovered()), /unexpected untracked/);
    rmSync(join(root, 'src/unexpected.mjs'));
    assert.doesNotThrow(() => assertExactTree(input, tracked(), discovered()));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
