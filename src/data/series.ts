// Series — collections that group long-form Journal entries.
// A post joins a series via its `series:` frontmatter (use the slug below).
export interface Series { slug: string; name: string; description: string; }

export const series: Series[] = [
  { slug: 'building-perfeat', name: 'Building Perfeat', description: 'Shipping a food diary solo, from the first cut to the App Store.' },
  { slug: 'solo-by-design',  name: 'Solo, by design',  description: 'Running a portfolio of one, and why each bet stays small.' },
  { slug: 'from-the-desk',   name: 'From the desk',    description: 'Shorter field notes between the longer work.' },
];

export const seriesBySlug = Object.fromEntries(series.map(s => [s.slug, s]));
export const seriesName = (slug?: string) => (slug && seriesBySlug[slug]?.name) || 'Journal';
