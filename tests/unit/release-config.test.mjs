import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
test('all normal Wrangler commands rebuild guarded production output', () => {
  assert.equal(config.build?.command, 'npm run build');
});
test('static assets bypass the Worker except explicit precedence and private routes', () => {
  assert.deepEqual(config.assets.run_worker_first, ['/api', '/api/*', '/book', '/book/', '/book/status', '/book/status/', '/404', '/404/', '/404.html']);
  assert.ok(!config.assets.run_worker_first.includes('/_astro/*'));
  assert.equal(config.assets.not_found_handling, 'none');
});
test('an in-progress deployment and its readback cannot be canceled by a new push', () => {
  assert.match(readFileSync('.github/workflows/deploy.yml', 'utf8'), /cancel-in-progress: false/);
});
