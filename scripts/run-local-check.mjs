import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startServer } from './serve-dist.mjs';
import { buildSha } from './build-release.mjs';

const mode = process.argv[2];
assert.ok(['e2e', 'lh'].includes(mode), 'Expected e2e or lh');
const server = await startServer('dist', 0, { compress: mode === 'lh' });
let child;
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/release.json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).gitSHA, buildSha(), 'Build must match this checkout');
  const command = mode === 'e2e' ? ['playwright', 'test'] : ['lhci', 'autorun'];
  child = spawn(`node_modules/.bin/${command[0]}`, [...command.slice(1), ...process.argv.slice(3)], {
    stdio: 'inherit', env: { ...process.env, TEST_BASE_URL: base },
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  const [code] = await once(child, 'exit');
  process.exitCode = code ?? 1;
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
