import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyArtifact } from '../../scripts/release-artifact.mjs';
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
test('static assets bypass the Worker except explicit precedence and private routes', () => {
  assert.deepEqual(config.assets.run_worker_first, ['/api', '/api/*', '/book', '/book/', '/book/status', '/book/status/', '/404', '/404/', '/404.html']);
  assert.ok(!config.assets.run_worker_first.includes('/_astro/*'));
  assert.equal(config.assets.not_found_handling, 'none');
});

function artifactFixture(t, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'sonwork-artifact-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'dist'));
  mkdirSync(join(directory, 'worker'));
  const gitSHA = '1'.repeat(40);
  const files = {
    'dist/index.html': '<h1>Approved release</h1>',
    'dist/release.json': JSON.stringify({ gitSHA }),
    'worker/index.js': 'export default { fetch() { return new Response(\"approved\"); } };',
    'wrangler.json': JSON.stringify({ main: './worker/index.js', no_bundle: true, assets: { directory: './dist' }, ...overrides }),
  };
  for (const [path, content] of Object.entries(files)) writeFileSync(join(directory, path), content);
  const metadata = { gitSHA, wranglerVersion: '4.151.1', files: Object.fromEntries(Object.entries(files).map(([path, content]) => [path, createHash('sha256').update(content).digest('hex')])) };
  writeFileSync(join(directory, 'artifact.json'), JSON.stringify(metadata));
  return { directory, gitSHA };
}

test('a release artifact accepts only its full source SHA and unchanged deployment bytes', t => {
  const { directory, gitSHA } = artifactFixture(t);
  assert.equal(verifyArtifact(directory, gitSHA).gitSHA, gitSHA);
  assert.throws(() => verifyArtifact(directory, '2'.repeat(40)), /source SHA differs/);
  assert.throws(() => verifyArtifact(directory, 'short'), /Full expected source SHA/);
  writeFileSync(join(directory, 'dist/index.html'), '<h1>Unverified replacement</h1>');
  assert.throws(() => verifyArtifact(directory, gitSHA), /Artifact bytes differ/);
});

test('an artifact cannot rebuild or rebundle after validation', t => {
  const rebuilding = artifactFixture(t, { build: { command: 'npm run build' } });
  assert.throws(() => verifyArtifact(rebuilding.directory, rebuilding.gitSHA), /must not rebuild/);
  const rebundling = artifactFixture(t, { no_bundle: false });
  assert.throws(() => verifyArtifact(rebundling.directory, rebundling.gitSHA), /must not be bundled again/);
});
