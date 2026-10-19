import { execFileSync } from 'node:child_process';
import { readdirSync, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute, sep, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

export const OLD_HEAD = '0fe6f5dc474bd8529f416145ea1cccddaa027284';
const documents = ['DESIGN.md', 'PRODUCT.md', 'AGENTS.md', 'DEPLOY.md'];
const roots = ['src/', 'public/', 'scripts/', 'tests/', '.github/workflows/'];
const excludedParts = new Set(['node_modules', 'dist', '.astro', '.wrangler', '.impeccable', 'reports', 'evidence', '.npmrc', 'credentials.json']);
const files = ['package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json', 'lighthouserc.cjs', 'wrangler.jsonc', '.gitignore', 'library/redirect-map.csv', ...documents];
export function allowedPath(path) {
  if (path.split('/').some(part => excludedParts.has(part))) return false;
  if (path.includes('\\') || isAbsolute(path) || path.split('/').some(part => part === '..' || /^\.(?:env|dev\.vars|git|astro|wrangler)(?:\.|$)/.test(part))) return false;
  if (['public/_redirects', 'public/release.json', 'scripts/signup-e2e.mjs', 'playwright.signup.config.ts'].includes(path) || path.startsWith('tests/signup/')) return false;
  return files.includes(path) || /^playwright(?:\.production)?\.config\.ts$/.test(path) || roots.some(root => path.startsWith(root));
}
export function separateRoots(source, destination) {
  for (const [a, b] of [[source, destination], [destination, source]]) {
    const rel = relative(a, b);
    if (!rel || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) throw new Error('Export roots must be separate and not nested');
  }
}
export function scanPublic(path, bytes, forbidden) {
  const text = bytes.toString('utf8');
  if (forbidden.some(term => text.toLocaleLowerCase().includes(term.toLocaleLowerCase()))) throw new Error(`Forbidden external term detected in ${path}`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/.test(text)) throw new Error(`Possible credential detected in ${path}`);
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
function collect(source, prefix = '') {
  const result = [];
  for (const entry of readdirSync(join(source, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (excludedParts.has(entry.name) || /^\.(?:env|dev\.vars)(?:\.|$)/.test(entry.name)) continue;
    if (!prefix && !(roots.some(root => root === `${path}/` || root.startsWith(`${path}/`)) || files.includes(path) || /^playwright(?:\.production)?\.config\.ts$/.test(path) || path === '.github' || path === 'library')) continue;
    if (entry.isSymbolicLink()) throw new Error(`Symlink refused: ${path}`);
    if (entry.isDirectory()) {
      if (path === '.github' || path === 'library' || roots.some(root => path === root.slice(0, -1) || path.startsWith(root))) result.push(...collect(source, path));
    } else if (allowedPath(path)) result.push(path);
  }
  return result.sort();
}

export function assertExactTree(input, tracked, discovered) {
  assert.deepEqual([...tracked].sort(), [...input].sort(), 'candidate tracked files must exactly match the source allowlist');
  assert.deepEqual([...discovered].sort(), [...input].sort(), 'candidate contains unexpected untracked source files');
}

export function exportRelease(sourceArg, destinationArg, proofArg, forbidden = [], verifyOnly = false) {
  const source = realpathSync(sourceArg), destination = realpathSync(destinationArg);
  separateRoots(source, destination);
  const proof = resolve(proofArg); separateRoots(source, proof); separateRoots(destination, proof);
  assert.ok(lstatSync(join(destination, '.git')).isDirectory(), 'destination must be a standalone clone');
  assert.equal(realpathSync(git(destination, ['rev-parse', '--show-toplevel'])), destination);
  assert.equal(git(destination, ['remote', 'get-url', 'origin']), 'https://github.com/sonlndv/sonwork-astro.git');
  assert.equal(git(destination, ['branch', '--show-current']), 'release/sonwork-rebuild');
  assert.equal(git(destination, ['rev-parse', 'archive/pre-rebuild-2026-10-19']), OLD_HEAD);
  const paths = collect(source);
  const input = paths.map(path => {
    const bytes = readFileSync(join(source, path)); scanPublic(path, bytes, forbidden);
    return { path, bytes, hash: sha256(bytes) };
  });
  if (!verifyOnly) {
    assert.equal(git(destination, ['rev-parse', 'HEAD']), OLD_HEAD, 'export may only replace the original parent tree');
    assert.equal(git(destination, ['status', '--porcelain']), '', 'candidate must be clean before export');
    // Only tracked files in this verified fresh clone are removed. Git history stays.
    execFileSync('git', ['rm', '-r', '--', '.'], { cwd: destination, stdio: 'pipe' });
    for (const { path, bytes } of input) {
      const target = join(destination, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes);
    }
  }
  const variants = [];
  const equality = [];
  for (const { path, hash } of input) {
    const target = join(destination, path);
    assert.ok(!lstatSync(target).isSymbolicLink(), `candidate symlink: ${path}`);
    const actual = readFileSync(target); scanPublic(path, actual, forbidden);
    const candidateHash = sha256(actual);
    equality.push({ path, sourceSha256: hash, candidateSha256: candidateHash, equal: candidateHash === hash });
    if (candidateHash !== hash) {
      assert.ok(documents.includes(path), `export mismatch: ${path}`); variants.push(path);
    }
  }
  const tracked = git(destination, ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const path of tracked) assert.ok(allowedPath(path), `unexpected tracked path: ${path}`);
  if (verifyOnly) {
    assertExactTree(paths, tracked, collect(destination));
    assert.equal(git(destination, ['status', '--porcelain']), '', 'verified candidate must be clean');
    assert.equal(git(destination, ['rev-parse', 'HEAD^']), OLD_HEAD);
  }
  const result = { sourceCommit: git(source, ['rev-parse', 'HEAD']), candidateCommit: git(destination, ['rev-parse', 'HEAD']), oldParent: OLD_HEAD, files: equality, documentVariants: variants, externalForbiddenTermsSupplied: forbidden.length, genericCredentialScan: 'passed' };
  writeFileSync(proof, JSON.stringify(result, null, 2) + '\n');
  console.log(`export verified: ${input.length} files, ${variants.length} public document variants, ${forbidden.length} externally supplied forbidden terms`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination, proof, ...options] = process.argv.slice(2);
  const termFile = options.find(o => o.startsWith('--forbidden-file='))?.slice('--forbidden-file='.length);
  const forbidden = termFile ? readFileSync(termFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
  exportRelease(source, destination, proof, forbidden, options.includes('--verify-only'));
}
