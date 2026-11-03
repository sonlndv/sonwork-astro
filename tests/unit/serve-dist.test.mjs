import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { request } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { startServer } from '../../scripts/serve-dist.mjs';

// node:http, not fetch: fetch decodes bodies, and these tests compare the encoded bytes.
function get(port, path, { method = 'GET', encoding } = {}) {
  return new Promise((resolve, reject) => {
    const headers = encoding === undefined ? {} : { 'accept-encoding': encoding };
    const req = request({ host: '127.0.0.1', port, path, method, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('serve-dist compression', () => {
  let dir;
  let compressed;
  let plain;
  let indexBytes;
  let notFoundBytes;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'serve-dist-'));
    indexBytes = Buffer.from(`<!doctype html><p>${'Sonwork graded sky. '.repeat(300)}</p>`);
    notFoundBytes = Buffer.from('<!doctype html><h1>Not found</h1>');
    await writeFile(join(dir, 'index.html'), indexBytes);
    await writeFile(join(dir, '404.html'), notFoundBytes);
    await writeFile(join(dir, 'a.webp'), Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 1, 2, 3, 4, 5, 6, 7]));
    compressed = await startServer(dir, 0, { compress: true });
    plain = await startServer(dir, 0);
  });

  after(async () => {
    await Promise.all([compressed, plain].map((server) => new Promise((done) => server?.close(done))));
    await rm(dir, { recursive: true, force: true });
  });

  test('br is preferred and decodes to the file', async () => {
    const res = await get(compressed.address().port, '/', { encoding: 'gzip, br' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-encoding'], 'br');
    assert.match(res.headers.vary, /accept-encoding/i);
    assert.ok(res.body.length < indexBytes.length);
    assert.deepEqual(brotliDecompressSync(res.body), indexBytes);
  });

  test('gzip alone gives gzip', async () => {
    const res = await get(compressed.address().port, '/', { encoding: 'gzip' });
    assert.equal(res.headers['content-encoding'], 'gzip');
    assert.match(res.headers.vary, /accept-encoding/i);
    assert.deepEqual(gunzipSync(res.body), indexBytes);
  });

  test('no accept-encoding gives identical bytes and no encoding', async () => {
    const res = await get(compressed.address().port, '/');
    assert.equal(res.headers['content-encoding'], undefined);
    assert.deepEqual(res.body, indexBytes);
  });

  test('an encoding with q=0 is not accepted', async () => {
    const res = await get(compressed.address().port, '/', { encoding: 'br;q=0, gzip' });
    assert.equal(res.headers['content-encoding'], 'gzip');
    assert.deepEqual(gunzipSync(res.body), indexBytes);
  });

  test('images are never encoded', async () => {
    const res = await get(compressed.address().port, '/a.webp', { encoding: 'br' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-encoding'], undefined);
    assert.equal(res.body.length, 12);
  });

  test('the 404 page is encoded too', async () => {
    const res = await get(compressed.address().port, '/missing', { encoding: 'br' });
    assert.equal(res.status, 404);
    assert.equal(res.headers['content-encoding'], 'br');
    assert.deepEqual(brotliDecompressSync(res.body), notFoundBytes);
  });

  test('HEAD carries the encoding headers and no body', async () => {
    const res = await get(compressed.address().port, '/', { method: 'HEAD', encoding: 'br' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-encoding'], 'br');
    assert.equal(res.body.length, 0);
  });

  test('without the option the server stays raw', async () => {
    const res = await get(plain.address().port, '/', { encoding: 'br' });
    assert.equal(res.headers['content-encoding'], undefined);
    assert.equal(res.headers.vary, undefined);
    assert.deepEqual(res.body, indexBytes);
  });
});
