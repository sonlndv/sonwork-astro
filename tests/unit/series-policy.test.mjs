import test from 'node:test';
import assert from 'node:assert/strict';
import { flowNodes, chooseFeatured, notesForSeries } from '../../src/lib/series-policy.mjs';
const entry = (id, date, draft = false, featured = false) => ({ id, data: { date: new Date(date), draft, featured } });

test('flow consumes actual text and preserves stage order without inventing values', () => {
  assert.deepEqual(flowNodes('event → context -> action => verify —> wait'), ['event', 'context', 'action', 'verify', 'wait'].map(label => ({ label })));
  assert.deepEqual(flowNodes(''), []);
  assert.throws(() => flowNodes({}), TypeError);
});
test('featured selection honours explicit choice then latest published, with deterministic ties', () => {
  const first = entry('first', '2026-01-01', false, true), latest = entry('latest', '2026-11-14');
  assert.equal(chooseFeatured([latest, first]), first);
  assert.equal(chooseFeatured([entry('draft', '2026-12-01', true), latest]), latest);
  assert.equal(chooseFeatured([entry('b', '2026-11-14'), entry('a', '2026-11-14')]).id, 'a');
  assert.equal(chooseFeatured([]), undefined);
  assert.equal(chooseFeatured([entry('draft', '2026-12-01', true)]), undefined);
});

const note = (id, parent, order = 1, draft = false) => ({ id, data: { series: parent, order, draft } });
const publicOnly = entry => !entry.data.draft;
test('note collection policy refuses orphaned, mismatched and deeper-than-route parents', () => {
  const parents = [entry('first', '2026-01-01')];
  for (const invalid of [note('missing/note', 'missing'), note('wrong/note', 'first'), note('first/nested/note', 'first')]) {
    assert.throws(() => notesForSeries('first', parents, [invalid], publicOnly), /Note parent and directory must agree/);
  }
});
test('public note selection hides draft children and all children of a draft parent', () => {
  const parents = [entry('first', '2026-01-01'), entry('hidden', '2026-01-01', true)];
  const notes = [note('first/second', 'first', 2), note('first/first', 'first'), note('first/draft', 'first', 3, true), note('hidden/public', 'hidden')];
  assert.deepEqual(notesForSeries('first', parents, notes, publicOnly).map(note => note.id), ['first/first', 'first/second']);
  assert.deepEqual(notesForSeries('hidden', parents, notes, publicOnly), []);
  assert.equal(notesForSeries('hidden', parents, notes, () => true).length, 1);
});
