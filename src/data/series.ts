// Series — collections that group long-form Journal entries.
// A post joins a series via its `series:` frontmatter (use the slug below).
// `author` = the default desk for the series; a post can override with its own `author:`.
import { authors } from './authors';

export interface Series { slug: string; name: string; description: string; author: string; }

export const series: Series[] = [
  { slug: 'building-perfeat', name: 'Building Perfeat', description: 'Shipping a food diary solo, from the first cut to the App Store.', author: 'karpathy' },
  { slug: 'solo-by-design',  name: 'Solo, by design',  description: 'Running a portfolio of one, and why each bet stays small.',        author: 'karpathy' },
  { slug: 'from-the-desk',   name: 'From the desk',    description: 'Shorter field notes between the longer work.',                      author: 'robin' },
];

export const seriesBySlug = Object.fromEntries(series.map(s => [s.slug, s]));
export const seriesName = (slug?: string) => (slug && seriesBySlug[slug]?.name) || 'Journal';
// Resolve a post's author: explicit frontmatter > series default > editor.
export const resolveAuthor = (postAuthor?: string, seriesSlug?: string) =>
  postAuthor || (seriesSlug && seriesBySlug[seriesSlug]?.author) || 'lando';
