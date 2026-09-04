// "What Sonar found" shows one day of research: the newest day that has
// readings, one reading per theme, in theme order. Son's rule (2026-09-04):
// the engine files daily, so the home shows the day, not a running list.
// The full archive stays at /readings/.
import type { CollectionEntry } from 'astro:content';
import { THEMES } from '../content.config';

type Report = CollectionEntry<'reports'>;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function latestDay(reports: Report[]): { date: Date | null; day: string; items: Report[] } {
  if (reports.length === 0) return { date: null, day: '', items: [] };
  const newest = reports.reduce((a, b) => (b.data.date > a.data.date ? b : a));
  const day = iso(newest.data.date);
  const ofDay = reports.filter(r => iso(r.data.date) === day);
  const items: Report[] = [];
  for (const theme of THEMES) {
    const hit = ofDay
      .filter(r => r.data.type === theme)
      .sort((a, b) => b.data.revision - a.data.revision)[0];
    if (hit) items.push(hit);
  }
  return { date: newest.data.date, day, items };
}
