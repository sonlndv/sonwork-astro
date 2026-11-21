import { getCollection, type CollectionEntry } from 'astro:content';
import { isVisible } from './content';
import { chooseFeatured, notesForSeries } from './series-policy.mjs';
import { LANGS, LANG_LABELS, languageOf, topicOf, topicsOf } from './i18n-policy.mjs';

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

// One topic is one logical post: every language variant of the same note,
// collapsed to a single listing/RSS/route entry. A variant counts as
// published only by its own draft flag, never by SHOW_DRAFTS — so a
// translation still pending Son's approval never surfaces as readable
// content in preview, even though getNotes() (via isVisible) lets the
// draft file itself through so preview can still account for the topic.
export interface LogicalNote {
  id: string;
  collection: 'notes';
  data: CollectionEntry<'notes'>['data'];
  translations: Translation[];
}
export async function getLogicalNotes(seriesId: string): Promise<LogicalNote[]> {
  const notes = await getNotes(seriesId);
  const logical: LogicalNote[] = [];
  for (const members of topicsOf(notes) as CollectionEntry<'notes'>[][]) {
    const published = members.filter((member: CollectionEntry<'notes'>) => !member.data.draft);
    if (published.length === 0) continue;
    const primary = published.find((member: CollectionEntry<'notes'>) => languageOf(member.id) === 'en') ?? published[0];
    const translations = LANGS.map(lang => ({ lang, label: LANG_LABELS[lang], note: published.find((member: CollectionEntry<'notes'>) => languageOf(member.id) === lang) }));
    logical.push({ id: topicOf(primary.id), collection: 'notes', data: primary.data, translations });
  }
  return logical.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
