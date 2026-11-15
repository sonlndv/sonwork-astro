import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyArtifact } from './release-artifact.mjs';

export function prepareSecretUpload(artifactDirectory, expectedSHA, workingDirectory) {
  artifactDirectory = realpathSync(artifactDirectory);
  workingDirectory = resolve(workingDirectory);
  const parent = realpathSync(dirname(workingDirectory));
  workingDirectory = resolve(parent, relative(dirname(workingDirectory), workingDirectory));
  const inside = (root, path) => { const rel = relative(root, path); return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../')); };
  assert.ok(!inside(artifactDirectory, workingDirectory) && !inside(workingDirectory, artifactDirectory), 'Secret upload directory must be separate from the artifact');
  assert.ok(!existsSync(workingDirectory), 'Secret upload directory must not already exist');
  verifyArtifact(artifactDirectory, expectedSHA);
  const config = JSON.parse(readFileSync(resolve(artifactDirectory, 'wrangler.json'), 'utf8'));
  assert.equal(config.name, 'sonwork', 'Only the approved sonwork Worker may receive the calendar Secret');
  assert.match(config.compatibility_date ?? '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(config.keep_vars, true, 'Existing deployed variables must be preserved');
  // wrangler-action v3 secret bulk discovers config in workingDirectory; it
  // does not inherit --config from the later explicit deploy command. Give it
  // only the verified target identity, never source/build/assets/secret values.
  mkdirSync(workingDirectory);
  writeFileSync(resolve(workingDirectory, 'wrangler.json'), JSON.stringify({ name: config.name, compatibility_date: config.compatibility_date }, null, 2) + '\n', { flag: 'wx' });
  verifyArtifact(artifactDirectory, expectedSHA);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv.length, 5, 'Usage: node scripts/prepare-calendar-secret-upload.mjs ARTIFACT FULL_SHA FRESH_UPLOAD_DIRECTORY');
  prepareSecretUpload(process.argv[2], process.argv[3], process.argv[4]);
  console.log('Prepared isolated calendar Secret target from unchanged verified sonwork artifact');
}
