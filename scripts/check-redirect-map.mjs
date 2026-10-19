// Offline check of the redirect map against the built site in dist/.
// Fails when a 301 would land on a page the build doesn't have (a 404 after
// the redirect), when the map itself is malformed, or when dist/_redirects
// isn't the file scripts/redirects-file.mjs makes from the map (stale, a 410 or
// none row in it, a missing /x twin, a rule that redirects to itself).
//
// Usage: node scripts/check-redirect-map.mjs [dir]   (default: dist)

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { HEADER, readRedirectMap } from './redirect-map.mjs';
import { renderRedirects, samePage, twinOf, privateRoute } from './redirects-file.mjs';

const dist = resolve(process.argv[2] ?? 'dist');
const STATUSES = new Set(['301', '410', 'none']);

function servedBy(path) {
  const clean = path.split(/[?#]/)[0].replace(/(.)\/$/, '$1');
  const base = join(dist, clean);
  return [base, join(base, 'index.html'), `${base}.html`].some(
    (file) => existsSync(file) && statSync(file).isFile(),
  );
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`No build in ${dist}. Run a build first.`);
  process.exit(1);
}

const { header, rows } = readRedirectMap();
const errors = [];
const notServed = [];

if (header.join(',') !== HEADER.join(',')) {
  errors.push(`header is "${header.join(',')}", expected "${HEADER.join(',')}"`);
}

const seen = new Set();
for (const [i, row] of rows.entries()) {
  const line = i + 2;
  const { old_path: oldPath, new_path: newPath, status } = row;
  if (!oldPath.startsWith('/')) errors.push(`line ${line}: old_path "${oldPath}" must start with /`);
  if (seen.has(oldPath)) errors.push(`line ${line}: duplicate old_path ${oldPath}`);
  seen.add(oldPath);
  if (!STATUSES.has(status)) {
    errors.push(`line ${line}: ${oldPath}: status "${status}" is not 301, 410 or none`);
    continue;
  }
  if (status === '301') {
    if (!newPath) errors.push(`line ${line}: ${oldPath}: 301 without new_path`);
    else if (!servedBy(newPath)) errors.push(`line ${line}: ${oldPath} -> ${newPath}: target is not a page in the build (would 404)`);
  }
  if (status === '410' && newPath) {
    errors.push(`line ${line}: ${oldPath}: 410 must not have a new_path (has ${newPath})`);
  }
  if (status === 'none' && !oldPath.includes('*') && !servedBy(oldPath)) {
    notServed.push(oldPath);
  }
}

// The host's redirect file, as the build shipped it.
const redirectsFile = join(dist, '_redirects');
let ruleCount = 0;
if (!existsSync(redirectsFile)) {
  errors.push(`${redirectsFile} is missing (astro.config.mjs writes public/_redirects on build)`);
} else {
  const text = readFileSync(redirectsFile, 'utf8');
  if (text !== renderRedirects(rows)) {
    errors.push(`${redirectsFile} is not what the map makes now: rebuild (scripts/redirects-file.mjs)`);
  }
  const rules = new Map();
  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, code, ...rest] = line.split(/\s+/);
    const where = `_redirects line ${i + 1}`;
    if (!from || !to || code !== '301' || rest.length > 0) {
      errors.push(`${where}: "${line}" is not "<from> <to> 301"`);
      continue;
    }
    if (rules.has(from)) errors.push(`${where}: duplicate source ${from}`);
    rules.set(from, to);
    if (samePage(from, to)) errors.push(`${where}: ${from} redirects to itself`);
    if (!servedBy(to)) errors.push(`${where}: ${from} -> ${to}: target is not a page in the build (would 404)`);
  }
  ruleCount = rules.size;
  const explicit = new Set(rows.filter((r) => r.status === '301').map((r) => r.old_path));
  for (const { old_path: oldPath, new_path: newPath, status } of rows) {
    if (status !== '301' || privateRoute(oldPath)) {
      if (rules.has(oldPath)) errors.push(`_redirects: ${oldPath} is a ${status}/Worker-handled row and must not be redirected`);
      continue;
    }
    if (!samePage(oldPath, newPath) && rules.get(oldPath) !== newPath) errors.push(`_redirects: ${oldPath} -> ${newPath} is missing`);
    const twin = twinOf(oldPath);
    if (twin && !samePage(twin, newPath) && !explicit.has(twin) && rules.get(twin) !== newPath) errors.push(`_redirects: twin ${twin} -> ${newPath} is missing`);
  }
}

const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
console.log(`redirect map: ${rows.length} rows (${Object.entries(counts).map(([s, n]) => `${n} x ${s}`).join(', ')}), checked against ${dist}`);

if (notServed.length > 0) {
  errors.push(`kept paths missing from build: ${notServed.join(' ')}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  console.error(`${errors.length} problem(s) in the redirect map`);
  process.exit(1);
}
console.log(`ok: every 301 target is a page in the build, every 410 has no target; _redirects has ${ruleCount} rules, no 410 or none rows`);
