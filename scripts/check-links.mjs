// Link check over the built site: serves dist/ with scripts/serve-dist.mjs,
// crawls every page reachable from / and from the 404 page, and fails on any
// broken internal link or missing #fragment. External links are skipped
// (rate limits and flaky hosts); pass --external to check them too.
//
// Usage: node scripts/check-links.mjs [dir] [--external]   (default: dist)

import { check, LinkState } from 'linkinator';
import { startServer } from './serve-dist.mjs';

const args = process.argv.slice(2);
const external = args.includes('--external');
const dir = args.find((arg) => !arg.startsWith('--')) ?? 'dist';
const port = Number(process.env.LINKS_PORT ?? 4323);
const origin = `http://127.0.0.1:${port}`;

const server = await startServer(dir, port);
try {
  const result = await check({
    path: [`${origin}/`, `${origin}/404.html`],
    recurse: true,
    checkFragments: true,
    redirects: 'error',
    linksToSkip: async (link) => !external && !link.startsWith(origin),
  });
  const broken = result.links.filter((link) => link.state === LinkState.BROKEN);
  const checked = result.links.filter((link) => link.state === LinkState.OK);
  const skipped = result.links.filter((link) => link.state === LinkState.SKIPPED);
  for (const link of broken) {
    console.error(`BROKEN ${link.status ?? '-'} ${link.url} (on ${link.parent ?? 'start'})`);
  }
  console.log(`links in ${dir}: ${checked.length} ok, ${broken.length} broken, ${skipped.length} skipped (external)`);
  process.exitCode = broken.length > 0 ? 1 : 0;
} finally {
  server.close();
}
