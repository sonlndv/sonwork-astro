import { writeFileSync } from 'node:fs';
import { readRedirectMap, currentRouteOverride, currentRedirects } from './redirect-map.mjs';

export function runtimeRoutes(rows = readRedirectMap().rows) {
  return [
    ...rows.filter(r => r.status !== 'none' && !currentRouteOverride(r.old_path) && !currentRedirects.some(rule => rule.from === r.old_path))
      .map(({ old_path, new_path, status }) => ({ path: old_path, target: new_path, status: Number(status) })),
    ...currentRedirects.map(({ from, to }) => ({ path: from, target: to, status: 301 })),
  ];
}

export function writeRuntimeRoutes() {
  writeFileSync(new URL('../src/worker/legacy-routes.json', import.meta.url), JSON.stringify(runtimeRoutes(), null, 2) + '\n');
}
