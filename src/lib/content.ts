import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

// Drafts show in `astro dev` and in builds run with SHOW_DRAFTS=true
// (structure review, preview). A plain production build hides them.
export const showDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === 'true';

export function isVisible(entry: { data: { draft: boolean } }): boolean {
  return showDrafts || !entry.data.draft;
}

async function visible<C extends CollectionKey>(collection: C): Promise<CollectionEntry<C>[]> {
  return getCollection(collection, isVisible) as Promise<CollectionEntry<C>[]>;
}

export async function getPosts() {
  const posts = await visible('posts');
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getWork() {
  const work = await visible('work');
  return work.sort((a, b) => a.data.order - b.data.order);
}

export async function getSideProjects() {
  const projects = await visible('side-projects');
  return projects.sort((a, b) => a.data.order - b.data.order);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
