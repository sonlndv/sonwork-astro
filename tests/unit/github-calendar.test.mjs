import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calendarLayout, validateCalendar } from '../../src/lib/contribution-calendar.mjs';

const raw = readFileSync('src/data/github-contributions.json');
const snapshot = JSON.parse(raw);

test('selected public snapshot retains every supplied UTC date, count and GitHub level', () => {
  assert.equal(snapshot.source, 'https://github.com/users/sonlndv/contributions');
  assert.equal(snapshot.from, '2025-11-16');
  assert.equal(snapshot.through, '2026-11-15');
  assert.equal(snapshot.days.length, 365);
  assert.equal(snapshot.days.reduce((sum, day) => sum + day.count, 0), 2165);
  assert.deepEqual(snapshot.days.find(day => day.date === '2026-10-19'), { date: '2026-10-19', count: 632, level: 4 });
  // Exact approved snapshot, including original dates/counts/intensities/provenance.
  assert.equal(createHash('sha256').update(raw).digest('hex'), '42387790e4fa01c12c30dc4d10cb6ca968a717b54231a506d6fd0babc80c50af');
  assert.doesNotThrow(() => validateCalendar(snapshot));
});

test('calendar is Sunday-first with correct month columns and no timezone conversion', () => {
  const layout = calendarLayout(snapshot);
  assert.equal(layout.weeks, 53);
  assert.equal(layout.offset, 0);
  assert.equal(layout.total, 2165);
  assert.deepEqual(layout.days, snapshot.days);
  assert.deepEqual(layout.months.map(month => month.label), ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  assert.equal(layout.months[1].column, 3);
  assert.equal(layout.months.at(-1).column, 51);
});

test('invalid, noncontiguous, duplicated or falsified snapshot values fail closed', () => {
  for (const mutate of [
    data => { data.days[0].date = '2025-02-30'; },
    data => { data.days[1].date = data.days[0].date; },
    data => { data.days.splice(10, 1); },
    data => { data.days[0].count = -1; },
    data => { data.days[0].count = 0.5; },
    data => { data.days[0].level = 5; },
    data => { data.through = '2026-11-16'; },
    data => { data.total = 2166; },
    data => { data.source = 'https://example.org/private'; },
    data => { data.days[0].repository = 'not-allowlisted'; },
  ]) {
    const data = structuredClone(snapshot);
    mutate(data);
    assert.throws(() => validateCalendar(data));
  }
});

test('chart-only source removes obsolete picker bindings and retains nonvisual semantics', () => {
  const source = readFileSync('src/components/GithubCalendar.astro', 'utf8');
  assert.doesNotMatch(source, /data-calendar-picker|picker\.|Browse daily counts|About this snapshot/);
  assert.match(source, /aria-describedby="calendar-description"/);
  assert.match(source, /id="calendar-description" class="visually-hidden"/);
  assert.match(source, /<noscript>[\s\S]*class="visually-hidden"[\s\S]*<table/);
});
