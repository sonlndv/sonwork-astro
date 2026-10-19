// Small static server for the built site, used by the test harness.
// `astro preview` in Astro 7 runs as a background daemon, which test runners
// can't start and stop cleanly. This one stays in the foreground.
//
// Usage: node scripts/serve-dist.mjs [dir] [port]   (defaults: dist 4322)
// Resolves file and directory output for static browser/link/Lighthouse checks.
// Actual Cloudflare redirects/410s are tested separately against local Wrangler.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function startServer(dir = 'dist', port = 4322) {
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
      const body = await readFile(file);
      res.writeHead(status, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? 'dist';
  const port = Number(process.argv[3] ?? process.env.PORT ?? 4322);
  await startServer(dir, port);
  console.log(`Serving ${resolve(dir)} at http://127.0.0.1:${port}/`);
}
