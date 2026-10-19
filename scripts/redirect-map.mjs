// Reads library/redirect-map.csv (the SNW-2 map of old sonwork.org URLs).
// Columns: old_path,new_path,status,sources,old_live_status,old_title,confidence,note
// status is 301, 410 or none. Rows with `*` are prefix patterns.

import { readFileSync } from 'node:fs';

export const HEADER = [
  'old_path',
  'new_path',
  'status',
  'sources',
  'old_live_status',
  'old_title',
  'confidence',
  'note',
];

export const MAP_FILE = new URL('../library/redirect-map.csv', import.meta.url);

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines in quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readRedirectMap(file = MAP_FILE) {
  const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'));
  return {
    header,
    rows: rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']))),
  };
}

// A concrete path to request for a row: patterns get one sample under their prefix.
export function samplePath(oldPath) {
  return oldPath.endsWith('*') ? `${oldPath.slice(0, -1)}redirect-test-sample` : oldPath;
}
