import './assert-release-env.mjs';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { verifyRelease } from './verify-release.mjs';
import { createArtifact, verifyArtifact } from './release-artifact.mjs';
import { publicationScope, PRIVATE_PREVIEW_ROUTES } from './publication-scope.mjs';

const fromPreview = process.argv.includes('--from-preview');
const usePreview = process.argv.includes('--use-preview');
assert.ok(!usePreview || fromPreview, '--use-preview requires --from-preview');
const outputIndex = process.argv.indexOf('--artifact-output');
const artifactDirectory = outputIndex < 0 ? undefined : resolve(process.argv[outputIndex + 1] ?? assert.fail('--artifact-output requires a directory'));
if (fromPreview) {
  if (!usePreview) {
    const preview = spawn('npm', ['run', 'build:preview'], { stdio: 'inherit' });
    const [code] = await once(preview, 'exit');
    assert.equal(code, 0, 'preview fixture build must succeed');
  }
  assert.ok(existsSync('dist/writing/a-keyboard-plugin-is-done-when-it-types.html'));
  assert.ok(existsSync('dist/series/me/the-joy-of-malleable-products.html'));
  const scope = publicationScope();
  for (const path of PRIVATE_PREVIEW_ROUTES) {
    assert.equal(existsSync(`dist${path}.html`), !scope.isPublicProjection, 'Private preview preserves draft routes; public source excludes them');
  }
  const previewFeed = readFileSync('dist/rss.xml', 'utf8');
  assert.ok((previewFeed.match(/<item>/g) ?? []).length > 1, 'preview RSS must carry the original draft posts as well as the Note');
  for (const privatePath of PRIVATE_PREVIEW_ROUTES) assert.ok(!previewFeed.includes(privatePath), 'private Series/Notes must not enter preview RSS');
  console.log('Preview fixture: draft posts, approved Note and populated RSS present before Wrangler starts');
}

const temporary = mkdtempSync(join(tmpdir(), 'sonwork-runtime-'));
const base = 'http://127.0.0.1:8791';
let worker;
async function stopWorker() {
  if (worker && worker.exitCode === null && worker.signalCode === null) {
    const exited = once(worker, 'exit');
    worker.kill('SIGTERM');
    await exited;
  }
}
async function startWorker(extra = []) {
  worker = spawn('node_modules/.bin/wrangler', ['dev', '--local', '--ip', '127.0.0.1', '--port', '8791', '--persist-to', temporary, ...extra], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' },
  });
  worker.stdout.pipe(process.stdout); worker.stderr.pipe(process.stderr);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (worker.exitCode !== null || worker.signalCode !== null) throw new Error(`Wrangler exited ${worker.exitCode ?? worker.signalCode}`);
    try { const response = await fetch(`${base}/release.json`); if (response.status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Local Wrangler did not start');
}
try {
  // Always exercise the guarded normal command: a preview cannot survive Wrangler's build.
  await startWorker();
  assert.ok(!existsSync('dist/writing/a-keyboard-plugin-is-done-when-it-types.html'), 'Wrangler must rebuild production');
  assert.ok(existsSync('dist/series/me/the-joy-of-malleable-products.html'), 'approved Me note must be in the production build');
  assert.ok(!existsSync('dist/writing/the-joy-of-malleable-products.html'), 'the old article asset must give way to its canonical redirect');
  assert.ok(!existsSync('dist/writing.html'), 'Writing must no longer be a public section');
  for (const slug of ['a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server']) {
    assert.ok(!existsSync(`dist/writing/${slug}.html`), `Wrangler must rebuild production without draft ${slug}`);
  }
  assert.ok(!existsSync('dist/series/always-on-agents/available-isnt-always-thinking.html'), 'conceptual note must remain unpublished');
  assert.ok(!existsSync('dist/series/always-on-agents.html'), 'preserved Always-on series must remain a private draft, not a published upcoming-series lesson');
  const productionFeed = readFileSync('dist/rss.xml', 'utf8');
  assert.equal(productionFeed.match(/<item>/g)?.length, 1, 'production RSS must contain exactly the approved Note');
  assert.match(productionFeed, /the-joy-of-malleable-products/);
  assert.doesNotMatch(productionFeed, /a-keyboard-plugin-is-done-when-it-types|a-new-default-must-not-break-the-old-one|no-answer-leaves-the-server/);
  console.log('Wrangler production rebuild: three drafts absent, approved Note and its single RSS item present');
  const { gitSHA } = JSON.parse(readFileSync('dist/release.json', 'utf8'));
  if (artifactDirectory) {
    await stopWorker();
    createArtifact(artifactDirectory, gitSHA);
    await startWorker(['--config', join(artifactDirectory, 'wrangler.json'), '--no-bundle']);
  }
  await verifyRelease(base, gitSHA, process.env.WORKER_INVENTORY ?? join(temporary, 'http-inventory.json'));
  // Prove stale releases fail closed.
  await assert.rejects(() => verifyRelease(base, '0'.repeat(40)), /Release identity failed/);
  console.log('Wrong-SHA negative control: rejected');
  if (process.argv.includes('--browser')) {
    const browser = spawn('node_modules/.bin/playwright', ['test', '--config', 'playwright.production.config.ts'], { stdio: 'inherit', env: { ...process.env, PRODUCTION_BASE_URL: base } });
    const [code] = await once(browser, 'exit');
    if (code !== 0) throw new Error(`Production browser tests exited ${code}`);
  }
  await stopWorker();
  if (artifactDirectory) {
    rmSync(join(artifactDirectory, '.wrangler'), { recursive: true, force: true });
    verifyArtifact(artifactDirectory, gitSHA);
    console.log('Verified exact production artifact: HTTP, browser, SHA and file integrity');
  }
} finally {
  await stopWorker();
}
