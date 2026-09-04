#!/usr/bin/env node
// Route a task phrase through AGENTS.md's Routing Map, the way an agent would,
// and check every probe in scripts/routing-probes.tsv still lands on its row.
//
//   node scripts/route.mjs "file the reading I finished on India's identity stack"
//   node scripts/route.mjs --test          # every probe must match; exit 1 otherwise
//
// Rows match on nouns: a row scores one point per distinct word (4+ letters,
// not a stop word) shared with the phrase; first row wins a tie, as in the map.
import { readFile } from 'node:fs/promises';

const STOP = new Set(['that', 'this', 'with', 'from', 'want', 'have', 'been', 'into', 'what', 'when', 'then', 'them', 'they', 'were', 'will', 'your', 'about', 'which', 'every', 'never', 'something', 'anything', 'please', 'help', 'make', 'sure', 'like', 'just', 'also', 'here', 'there', 'their', 'more', 'some', 'only', 'ever', 'thing', 'things']);
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length >= 4 && !STOP.has(w)));

export async function loadMap(path = 'AGENTS.md') {
  const md = await readFile(path, 'utf8');
  const start = md.indexOf('## Routing Map');
  const block = md.slice(start, md.indexOf('\n## ', start + 10));
  return block.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Task') && !l.startsWith('| :--'))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .map(([task, when, load]) => ({ task, when, load, vocab: words(task + ' ' + when) }));
}

export function route(rows, phrase) {
  const q = words(phrase);
  let best = null;
  for (const r of rows) {
    const hits = [...q].filter(w => r.vocab.has(w));
    if (hits.length && (!best || hits.length > best.hits.length)) best = { ...r, hits };
  }
  return best;
}

const args = process.argv.slice(2);
const rows = await loadMap();
if (args[0] === '--test') {
  const probes = (await readFile('scripts/routing-probes.tsv', 'utf8')).split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
  let bad = 0;
  for (const [phrase, expected] of probes) {
    const r = route(rows, phrase);
    const ok = r && r.task === expected;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} "${phrase}" -> ${r ? r.task : '(no row)'}${ok ? '' : ` (expected ${expected})`}`);
  }
  console.log(`${probes.length - bad}/${probes.length} probes land on their row`);
  process.exit(bad ? 1 : 0);
} else {
  const r = route(rows, args.join(' '));
  if (!r) { console.log('No row matches. The map is at AGENTS.md › Routing Map.'); process.exit(1); }
  console.log(`${r.task}\n  because: ${r.hits.join(', ')}\n  load: ${r.load}`);
}
