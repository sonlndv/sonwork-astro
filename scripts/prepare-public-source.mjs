import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PRIVATE_DRAFT_PATHS, PUBLIC_SCOPE, PUBLIC_SCOPE_FILE, publicationScope } from './publication-scope.mjs';

const PUBLIC_REMOTE = 'https://github.com/sonlndv/sonwork-astro.git';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (root, ...args) => execFileSync('git', args, { cwd: root, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
const textGit = (root, ...args) => git(root, ...args).toString().trim();
const inside = (root, path) => { const rel = relative(root, path); return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../')); };
export function fullSHA(value) { assert.match(value ?? '', /^[a-f0-9]{40}$/, 'Full source SHA is required'); return value; }
function safePath(path) { assert.ok(path && !isAbsolute(path) && !/[\\\x00-\x1f\x7f]/.test(path) && !path.split('/').includes('..') && posix.normalize(path) === path && path !== '.git' && !path.startsWith('.git/'), 'Unsafe source path'); }
function docPath(path) { return /^(?:AGENTS|PRODUCT|DESIGN|DEPLOY|THIRD-PARTY-NOTICES)\.md$|^docs\/.+\.md$|^src\/content\/README\.md$/.test(path); }

export function projectionPlan(entries, variants = new Map()) {
  const source = new Map();
  for (const entry of entries) {
    safePath(entry.path);
    assert.ok(['100644', '100755'].includes(entry.mode), 'Regular source files only');
    assert.doesNotMatch(entry.path, /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.hermes|\.omh|\.obsidian)(?:\/|$)|\.canvas$|config\.local\.json$/i, 'Unreviewed private configuration or administrative source is refused, not silently omitted');
    assert.ok(!source.has(entry.path), 'Duplicate source path'); source.set(entry.path, entry);
  }
  assert.ok(PRIVATE_DRAFT_PATHS.every(path => source.has(path)) && !source.has(PUBLIC_SCOPE_FILE), 'Private source inventory must contain both preserved drafts and no public declaration');
  const files = new Map([...source].filter(([path]) => !PRIVATE_DRAFT_PATHS.includes(path)));
  const declaredVariants = [];
  for (const [path, bytes] of variants) {
    safePath(path);
    assert.ok(docPath(path) && files.has(path), 'Only existing documentation may have a declared public variant');
    assert.doesNotMatch(bytes.toString(), /\/home\/|\.hermes\/|\.canvas\b|kanban:\/\//i, 'Public documentation must not contain local private paths or administrative data');
    declaredVariants.push({ path, canonicalSHA256: sha256(files.get(path).bytes), publicSHA256: sha256(bytes) });
    files.set(path, { ...files.get(path), bytes });
  }
  files.set(PUBLIC_SCOPE_FILE, { path: PUBLIC_SCOPE_FILE, mode: '100644', bytes: Buffer.from(JSON.stringify(PUBLIC_SCOPE, null, 2) + '\n') });
  return { files, excluded: [...PRIVATE_DRAFT_PATHS], declaredVariants };
}

function tree(root, sha) {
  return git(root, 'ls-tree', '-r', '-z', sha).toString().split('\0').filter(Boolean).map(record => {
    const [meta, path] = record.split('\t'); const [mode, type, blob] = meta.split(' ');
    assert.equal(type, 'blob', 'Regular source blobs only'); safePath(path);
    return { path, mode, blob, bytes: git(root, 'cat-file', 'blob', blob) };
  });
}
function variantsAt(directory) {
  const variants = new Map();
  function visit(prefix = '') {
    for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name; safePath(path);
      if (entry.isDirectory()) visit(path);
      else { assert.ok(entry.isFile() && !entry.isSymbolicLink() && docPath(path), 'Variant must be a regular allowed document'); variants.set(path, readFileSync(join(directory, path))); }
    }
  }
  visit(); return variants;
}
function verifyTree(entries, expected) {
  const actual = new Map(entries.map(entry => [entry.path, entry]));
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), 'Public tree path set differs');
  for (const [path, entry] of expected) {
    assert.equal(actual.get(path).mode, entry.mode, `Public mode differs: ${path}`);
    assert.equal(sha256(actual.get(path).bytes), sha256(entry.bytes), `Public bytes differ: ${path}`);
  }
}

export function preparePublicSource({ source, candidate, sourceSHA, baseSHA, proof, variantsDirectory, verifyOnly = false }) {
  fullSHA(sourceSHA); fullSHA(baseSHA);
  source = realpathSync(source); candidate = realpathSync(candidate); proof = resolve(realpathSync(dirname(resolve(proof))), basename(proof));
  assert.ok(!inside(source, candidate) && !inside(candidate, source), 'Public clone and private source must be separate');
  assert.ok(!inside(source, proof) && !inside(candidate, proof), 'Proof must be outside both repositories');
  assert.ok(!existsSync(proof), 'Use a new external proof file for each attempt');
  assert.ok(lstatSync(join(candidate, '.git')).isDirectory() && !lstatSync(join(candidate, '.git')).isSymbolicLink(), 'Candidate must be a standalone fresh clone');
  assert.equal(textGit(candidate, 'remote', 'get-url', 'origin'), PUBLIC_REMOTE, 'Wrong public repository');
  assert.notEqual(textGit(candidate, 'branch', '--show-current'), 'main', 'Use a dedicated candidate branch, never main');
  const remote = textGit(candidate, '-c', 'credential.helper=', 'ls-remote', '--exit-code', 'origin', 'refs/heads/main').split(/\s+/);
  assert.equal(remote[0], baseSHA, 'Public main advanced; prepare from the new actual base');
  assert.equal(remote[1], 'refs/heads/main');
  assert.equal(textGit(source, 'rev-parse', 'HEAD'), sourceSHA, 'Private source must be frozen');
  assert.equal(textGit(source, 'status', '--porcelain'), '', 'Private source must be clean');
  assert.equal(publicationScope(source).isPublicProjection, false);
  const entries = tree(source, sourceSHA);
  let variants = new Map();
  if (variantsDirectory) {
    variantsDirectory = realpathSync(variantsDirectory);
    assert.ok(!inside(source, variantsDirectory) && !inside(candidate, variantsDirectory) && !inside(variantsDirectory, source) && !inside(variantsDirectory, candidate), 'Variants must be supplied separately from source and public clone');
    variants = variantsAt(variantsDirectory);
  }
  const plan = projectionPlan(entries, variants);
  if (!verifyOnly) {
    assert.equal(textGit(candidate, 'rev-parse', 'HEAD'), baseSHA, 'Fresh public clone must be at the exact actual main');
    assert.equal(textGit(candidate, 'status', '--porcelain'), '', 'Fresh public clone must be clean');
    const old = tree(candidate, baseSHA);
    assert.ok(old.every(entry => ['100644', '100755'].includes(entry.mode)), 'Fresh public base must contain only regular files');
    for (const entry of old) if (!plan.files.has(entry.path)) git(candidate, 'rm', '--', entry.path);
    // Copy only frozen tracked public-eligible blobs. Never copy original
    // private MDX, working-tree secrets, Git objects or private commit ancestry.
    for (const [path, entry] of plan.files) {
      const target = join(candidate, path); let parent = dirname(target);
      while (parent !== candidate) { if (existsSync(parent)) assert.ok(!lstatSync(parent).isSymbolicLink(), 'Symlink parent refused'); parent = dirname(parent); }
      assert.ok(!existsSync(target) || (lstatSync(target).isFile() && !lstatSync(target).isSymbolicLink()), 'Regular candidate files only');
      mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, entry.bytes); chmodSync(target, entry.mode === '100755' ? 0o755 : 0o644);
    }
    // Named paths only. A private canonical worktree is never staged or reset.
    git(candidate, 'add', '--', ...[...plan.files.keys()].filter(path => !variants.has(path)));
    for (const [path, bytes] of variants) {
      const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: candidate, input: bytes, timeout: 30000 }).toString().trim();
      git(candidate, 'update-index', '--add', '--cacheinfo', `${plan.files.get(path).mode},${blob},${path}`);
    }
    const stagedTree = textGit(candidate, 'write-tree'); verifyTree(tree(candidate, stagedTree), plan.files);
  } else {
    assert.equal(textGit(candidate, 'status', '--porcelain'), '', 'Committed public candidate must be clean');
    assert.equal(textGit(candidate, 'rev-parse', 'HEAD^'), baseSHA, 'Public release must be one normal child of actual main');
    assert.equal(textGit(candidate, 'rev-list', '--count', `${baseSHA}..HEAD`), '1', 'Private commit graph must not enter public history');
    verifyTree(tree(candidate, 'HEAD'), plan.files);
  }
  assert.equal(publicationScope(candidate).isPublicProjection, true);
  assert.equal(textGit(source, 'rev-parse', 'HEAD'), sourceSHA);
  assert.equal(textGit(source, 'status', '--porcelain'), '', 'Private source changed during projection');
  const receipt = {
    schemaVersion: 1, status: verifyOnly ? 'committed_tree_verified' : 'prepared_not_verified', privateSourceSHA: sourceSHA, actualPublicBase: baseSHA,
    publicProjectionSHA: verifyOnly ? textGit(candidate, 'rev-parse', 'HEAD') : null,
    publicTree: textGit(candidate, 'write-tree'), exactParent: verifyOnly ? textGit(candidate, 'rev-parse', 'HEAD^') : baseSHA,
    exclusions: entries.filter(entry => plan.excluded.includes(entry.path)).map(entry => ({ path: entry.path, privateBlob: entry.blob, privateSHA256: sha256(entry.bytes) })),
    generatedPublicDeclaration: PUBLIC_SCOPE_FILE, declaredPublicDocVariants: plan.declaredVariants,
    equality: [...plan.files].map(([path, entry]) => ({ path, mode: entry.mode, SHA256: sha256(entry.bytes), sourceEqual: !plan.declaredVariants.some(variant => variant.path === path) && path !== PUBLIC_SCOPE_FILE })),
    privateSourceUnchanged: true, privateHistoryPushed: false, remoteWrites: false,
  };
  mkdirSync(dirname(proof), { recursive: true }); writeFileSync(proof, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length >= 5, 'Usage: node scripts/prepare-public-source.mjs SOURCE FRESH_CLONE SOURCE_SHA ACTUAL_MAIN_SHA EXTERNAL_PROOF [--verify-only] [--variants EXTERNAL_DOC_DIRECTORY]');
  const [source, candidate, sourceSHA, baseSHA, proof, ...options] = args;
  let variantsDirectory; let verifyOnly = false;
  while (options.length) { const option = options.shift(); if (option === '--verify-only') verifyOnly = true; else if (option === '--variants') { assert.ok(options.length, '--variants requires a directory'); variantsDirectory = options.shift(); } else assert.fail('Unknown projection option'); }
  const receipt = preparePublicSource({ source, candidate, sourceSHA, baseSHA, proof, variantsDirectory, verifyOnly });
  console.log(JSON.stringify({ status: receipt.status, sourceSHA, baseSHA, publicSHA: receipt.publicProjectionSHA, publicTree: receipt.publicTree, publicFiles: receipt.equality.length, excludedPrivateDrafts: receipt.exclusions.length, docVariants: receipt.declaredPublicDocVariants.length, remoteWrites: false }));
}
