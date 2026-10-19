import { writeFileSync } from 'node:fs';
import { readRedirectMap } from './redirect-map.mjs';

export function writeRuntimeRoutes() {
  const rows = readRedirectMap().rows.filter(r => r.status !== 'none')
    .map(({ old_path, new_path, status }) => ({ path: old_path, target: new_path, status: Number(status) }));
  writeFileSync(new URL('../src/worker/legacy-routes.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
}
