// Small static server for the built site, used by the test harness.
// `astro preview` in Astro 7 runs as a background daemon, which test runners
// can't start and stop cleanly. This one stays in the foreground.
//
// Usage: node scripts/serve-dist.mjs [dir] [port] [--compress]   (defaults: dist 4322)
// Resolves file and directory output for static browser/link/Lighthouse checks.
// Actual Cloudflare redirects/410s are tested separately against local Wrangler.
// --compress (opt in; Lighthouse uses it) encodes the text types like Cloudflare does: Brotli q4, else
// gzip 6, by Accept-Encoding. Images and fonts are never encoded. Without it, responses are raw bytes.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'node:zlib';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function findFile(root, pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = join(root, rel.replace(/(.)\/$/, '$1'));
  if (base !== root && !base.startsWith(`${root}/`)) return null;
  for (const candidate of [base, join(base, 'index.html'), `${base}.html`]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

const compressible = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

// Encodings the request accepts; an entry with q=0 does not count.
function acceptedEncodings(header) {
  const accepted = new Set();
  for (const part of String(header ?? '').split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    if (q !== undefined && !(Number.parseFloat(q.slice(2)) > 0)) continue;
    accepted.add(name);
  }
  return accepted;
}

export function startServer(dir = 'dist', port = 4322, { compress = false } = {}) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    let file = null;
    try {
      file = await findFile(root, pathname);
    } catch {
      // Malformed path: fall through to 404.
    }
    const status = file ? 200 : 404;
    file ??= join(root, '404.html');
    try {
      let body = await readFile(file);
      const headers = { 'content-type': types[extname(file)] ?? 'application/octet-stream' };
      if (compress && compressible.has(extname(file))) {
        const accepted = acceptedEncodings(req.headers['accept-encoding']);
        headers.vary = 'accept-encoding';
        if (accepted.has('br')) {
          body = brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } });
          headers['content-encoding'] = 'br';
        } else if (accepted.has('gzip')) {
          body = gzipSync(body, { level: 6 });
          headers['content-encoding'] = 'gzip';
        }
      }
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const compress = args.includes('--compress');
  const positional = args.filter((arg) => arg !== '--compress');
  const dir = positional[0] ?? 'dist';
  const port = Number(positional[1] ?? process.env.PORT ?? 4322);
  await startServer(dir, port, { compress });
  console.log(`Serving ${resolve(dir)} at http://127.0.0.1:${port}/`);
}
