import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fetchNavigation } from '../../scripts/verify-release.mjs';

test('navigation checks send the actual navigate header and do not auto-follow redirects', async () => {
  let received;
  const server = createServer((request, response) => {
    received = request.headers['sec-fetch-mode'];
    response.writeHead(301, { location: '/target' }); response.end('redirect');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetchNavigation(new URL(`http://127.0.0.1:${server.address().port}/old`));
    assert.equal(received, 'navigate');
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/target');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
