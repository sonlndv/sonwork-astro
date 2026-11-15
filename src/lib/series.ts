import { getCollection, type CollectionEntry } from 'astro:content';
import { isVisible } from './content';
import { chooseFeatured, notesForSeries } from './series-policy.mjs';

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
