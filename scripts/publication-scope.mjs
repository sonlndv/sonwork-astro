import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PRIVATE_DRAFT_PATHS = Object.freeze([
  'src/content/series/always-on-agents.mdx',
  'src/content/notes/always-on-agents/available-isnt-always-thinking.mdx',
]);
export const PRIVATE_PREVIEW_ROUTES = Object.freeze([
  '/series/always-on-agents',
  '/series/always-on-agents/available-isnt-always-thinking',
]);
export const PUBLIC_SCOPE_FILE = '.public-source.json';
export const PUBLIC_SCOPE = Object.freeze({ schemaVersion: 1, excludedPrivateDrafts: PRIVATE_DRAFT_PATHS });

// Absence never silently selects a less restrictive test mode. Only the exact
// exporter declaration admits the public projection, and then both private
// sources must actually be absent. Original private worktrees retain both.
export function publicationScope(root = process.cwd()) {
  const marker = resolve(root, PUBLIC_SCOPE_FILE);
  const markerInfo = lstatSync(marker, { throwIfNoEntry: false });
  const isPublicProjection = !!markerInfo;
  if (isPublicProjection) {
    assert.ok(markerInfo.isFile() && !markerInfo.isSymbolicLink(), 'Invalid public-source declaration');
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), PUBLIC_SCOPE, 'Invalid public-source declaration');
  }
  for (const path of PRIVATE_DRAFT_PATHS) {
    const file = resolve(root, path);
    if (isPublicProjection) {
      assert.ok(!lstatSync(file, { throwIfNoEntry: false }), `Public projection must exclude private draft source: ${path}`);
    } else {
      assert.ok(existsSync(file) && lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink(), `Private draft source must be preserved: ${path}`);
      assert.match(readFileSync(file, 'utf8'), /^draft: true$/m, 'Private Series material must remain a draft');
    }
  }
  return { isPublicProjection, privatePreviewRoutes: isPublicProjection ? [] : [...PRIVATE_PREVIEW_ROUTES] };
}
