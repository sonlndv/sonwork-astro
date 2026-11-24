import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../../src/data/github-contributions.json' with { type: 'json' };
import { calendarSummary } from '../../src/lib/contribution-calendar.mjs';

test('annual summary uses the validated full range, including dates before the current calendar year', () => {
  assert.equal(calendarSummary(snapshot).label, '2,165 contributions in the last year');
  assert.equal(calendarSummary(snapshot, 'vi').label, '2.165 lượt đóng góp trong năm qua');
  assert.equal(calendarSummary(snapshot).range, 'Nov 16, 2025 – Nov 15, 2026 (UTC)');
  const data = structuredClone(snapshot);
  data.days[0].count += 1000; data.total += 1000;
  assert.equal(calendarSummary(data).label, '3,165 contributions in the last year');
});

test('zero and singular are real validated totals, never an error fallback', () => {
  for (const total of [0, 1]) {
    const data = structuredClone(snapshot);
    data.days.forEach(day => { day.count = 0; day.level = 0; });
    data.days[0].count = total; data.days[0].level = total; data.total = total;
    assert.equal(calendarSummary(data).label, `${total} ${total === 1 ? 'contribution' : 'contributions'} in the last year`);
    assert.equal(calendarSummary(data, 'vi').label, `${total} lượt đóng góp trong năm qua`);
  }
  assert.throws(() => calendarSummary(null));
  assert.throws(() => calendarSummary({ ...snapshot, total: 0 }));
});

test('a partial calendar cannot be presented as a year', () => {
  const data = structuredClone(snapshot);
  data.total -= data.days.shift().count; data.from = data.days[0].date;
  assert.throws(() => calendarSummary(data), /full 365-day/);
});
