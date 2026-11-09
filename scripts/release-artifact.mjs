import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function inventory(directory, prefix = '') {
  const files = {};
  for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!prefix && entry.name === 'artifact.json') continue;
    if (entry.isDirectory()) Object.assign(files, inventory(directory, path));
    else {
      assert.ok(entry.isFile(), `Artifact entry must be a regular file: ${path}`);
      files[path] = createHash('sha256').update(readFileSync(join(directory, path))).digest('hex');
    }
  }
  return files;
}

export function verifyArtifact(directory, expectedSha) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'Full expected source SHA is required');
  const metadata = JSON.parse(readFileSync(join(directory, 'artifact.json'), 'utf8'));
  assert.equal(metadata.gitSHA, expectedSha, 'Artifact source SHA differs');
  assert.deepEqual(inventory(directory), metadata.files, 'Artifact bytes differ from the verified release');
  const config = JSON.parse(readFileSync(join(directory, 'wrangler.json'), 'utf8'));
  assert.equal(config.build, undefined, 'Artifact must not rebuild during deployment');
  assert.equal(config.no_bundle, true, 'Artifact must not be bundled again');
  assert.equal(config.assets.directory, './dist');
  assert.ok(Object.hasOwn(metadata.files, config.main.replace(/^\.\//, '')), 'Bundled Worker must be inventoried');
  assert.equal(JSON.parse(readFileSync(join(directory, 'dist/release.json'), 'utf8')).gitSHA, expectedSha);
  assert.match(metadata.wranglerVersion, /^\d+\.\d+\.\d+$/);
  return metadata;
}

export function createArtifact(directory, expectedSha) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'Full expected source SHA is required');
  assert.equal(JSON.parse(readFileSync('dist/release.json', 'utf8')).gitSHA, expectedSha);
  mkdirSync(directory);
  cpSync('dist', join(directory, 'dist'), { recursive: true });
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  delete config.$schema;
  delete config.build;
  config.main = resolve(config.main);
  const configPath = join(directory, 'wrangler.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  // The normal Wrangler runtime has already rebuilt production from the preview.
  // Bundle those exact assets once, without invoking another site build.
  const bundleDirectory = join(directory, 'worker');
  execFileSync('node_modules/.bin/wrangler', ['deploy', '--dry-run', '--config', configPath, '--outdir', bundleDirectory], { stdio: 'inherit' });
  const stem = basename(config.main, extname(config.main));
  rmSync(join(directory, '.wrangler'), { recursive: true, force: true });
  const entries = readdirSync(bundleDirectory).filter(name => name === `${stem}.js` || name === `${stem}.mjs`);
  assert.equal(entries.length, 1, 'Dry run must emit one bundled Worker entrypoint');
  config.main = `./worker/${entries[0]}`;
  config.no_bundle = true;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  const metadata = {
    gitSHA: expectedSha,
    wranglerVersion: JSON.parse(readFileSync('node_modules/wrangler/package.json', 'utf8')).version,
    files: inventory(directory),
  };
  writeFileSync(join(directory, 'artifact.json'), JSON.stringify(metadata, null, 2) + '\n');
  return verifyArtifact(directory, expectedSha);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyArtifact(resolve(process.argv[2]), process.argv[3]);
  console.log('Verified production artifact bytes and exact source SHA');
}
