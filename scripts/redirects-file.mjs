// Generate ordinary 301 rules. The Worker handles 410s and private-query redirects.
import { readRedirectMap } from './redirect-map.mjs';

export const REDIRECTS_HEADER = [
  '# Generated from library/redirect-map.csv by scripts/redirects-file.mjs. Do not edit.',
  '# 410 and private-query routes are handled by the Worker.',
];

// /about/ and /about are the same page; / stays /.
export const samePage = (a, b) => a.replace(/(.)\/$/, '$1') === b.replace(/(.)\/$/, '$1');

export const privateRoute = path => /^\/book(?:\/status)?\/?$/.test(path) || /^\/api\/unsubscribe\/?$/.test(path);

export const twinOf = (path) => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : null);

export function redirectRules(rows = readRedirectMap().rows) {
  const rules = [];
  const seen = new Set();
  const add = (from, to) => {
    if (samePage(from, to) || seen.has(from)) return;
    seen.add(from);
    rules.push({ from, to, status: 301 });
  };
  const moved = rows.filter((row) => row.status === '301' && !privateRoute(row.old_path));
  for (const row of moved) add(row.old_path, row.new_path);
  for (const row of moved) {
    const twin = twinOf(row.old_path);
    if (twin) add(twin, row.new_path);
  }
  const isPattern = (rule) => rule.from.includes('*');
  const exact = rules.filter((rule) => !isPattern(rule));
  const patterns = rules.filter(isPattern).sort((a, b) => b.from.length - a.from.length);
  return [...exact, ...patterns];
}

export function renderRedirects(rows) {
  const lines = redirectRules(rows).map(({ from, to, status }) => `${from} ${to} ${status}`);
  return `${[...REDIRECTS_HEADER, ...lines].join('\n')}\n`;
}
