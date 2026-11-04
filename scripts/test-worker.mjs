import './assert-release-env.mjs';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { verifyRelease } from './verify-release.mjs';

if (process.argv.includes('--from-preview')) {
  const preview = spawn('npm', ['run', 'build:preview'], { stdio: 'inherit' });
  const code = await new Promise(resolve => preview.once('exit', resolve));
  assert.equal(code, 0, 'preview fixture build must succeed');
  assert.ok(existsSync('dist/writing/a-keyboard-plugin-is-done-when-it-types.html'));
  assert.ok(existsSync('dist/writing/the-joy-of-malleable-products.html'));
  assert.ok((readFileSync('dist/rss.xml', 'utf8').match(/<item>/g) ?? []).length > 1, 'preview RSS must carry the drafts as well as the Note');
  console.log('Preview fixture: draft posts, approved Note and populated RSS present before Wrangler starts');
}

const temporary = mkdtempSync(join(tmpdir(), 'sonwork-runtime-'));
const base = 'http://127.0.0.1:8791';
const worker = spawn('node_modules/.bin/wrangler', ['dev', '--local', '--ip', '127.0.0.1', '--port', '8791', '--persist-to', temporary], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' },
});
worker.stdout.pipe(process.stdout); worker.stderr.pipe(process.stderr);
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (worker.exitCode !== null) throw new Error(`Wrangler exited ${worker.exitCode}`);
    try { const r = await fetch(`${base}/release.json`); if (r.status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('Local Wrangler did not start');
  assert.ok(!existsSync('dist/writing/a-keyboard-plugin-is-done-when-it-types.html'), 'Wrangler must rebuild production');
  assert.ok(existsSync('dist/writing/the-joy-of-malleable-products.html'), 'approved Note must be in the production build');
  for (const slug of ['a-new-default-must-not-break-the-old-one', 'no-answer-leaves-the-server']) {
    assert.ok(!existsSync(`dist/writing/${slug}.html`), `Wrangler must rebuild production without draft ${slug}`);
  }
  const productionFeed = readFileSync('dist/rss.xml', 'utf8');
  assert.equal(productionFeed.match(/<item>/g)?.length, 1, 'production RSS must contain exactly the approved Note');
  assert.match(productionFeed, /the-joy-of-malleable-products/);
  assert.doesNotMatch(productionFeed, /a-keyboard-plugin-is-done-when-it-types|a-new-default-must-not-break-the-old-one|no-answer-leaves-the-server/);
  console.log('Wrangler production rebuild: three drafts absent, approved Note and its single RSS item present');
  const { gitSHA } = JSON.parse(readFileSync('dist/release.json', 'utf8'));
  await verifyRelease(base, gitSHA, process.env.WORKER_INVENTORY ?? join(temporary, 'http-inventory.json'));
  // Prove stale releases fail closed.
  let rejected = false;
  try { await verifyRelease(base, '0'.repeat(40)); } catch { rejected = true; }
  if (!rejected) throw new Error('Wrong release SHA was accepted');
  console.log('Wrong-SHA negative control: rejected');
  if (process.argv.includes('--browser')) {
    const browser = spawn('node_modules/.bin/playwright', ['test', '--config', 'playwright.production.config.ts'], { stdio: 'inherit', env: { ...process.env, PRODUCTION_BASE_URL: base } });
    const code = await new Promise(resolve => browser.once('exit', resolve));
    if (code !== 0) throw new Error(`Production browser tests exited ${code}`);
  }
} finally { worker.kill('SIGTERM'); }
