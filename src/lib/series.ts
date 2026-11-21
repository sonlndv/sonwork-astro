import { getCollection, type CollectionEntry } from 'astro:content';
import { isVisible } from './content';
import { chooseFeatured, notesForSeries } from './series-policy.mjs';
import { translationsOf } from './i18n-policy.mjs';

export async function getSeries() {
  const entries = await getCollection('series', isVisible);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id));
}
export async function getNotes(seriesId: string): Promise<CollectionEntry<'notes'>[]> {
  const parents = await getCollection('series');
  const notes = await getCollection('notes');
  return notesForSeries(seriesId, parents, notes, isVisible);
}
export async function getFeaturedSeries() { return chooseFeatured(await getSeries()); }
export function notePath(note: { id: string }) { return `/series/${note.id}`; }

export interface Translation { lang: 'en' | 'vi'; label: string; note?: CollectionEntry<'notes'> }
export async function getTranslations(note: CollectionEntry<'notes'>): Promise<Translation[]> {
  const siblings = await getNotes(note.data.series);
  return translationsOf(note, siblings);
}
