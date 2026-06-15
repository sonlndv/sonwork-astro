import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Field notes — longer reads, written about Sơn by his agent.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    series: z.string().optional(),
    tags: z.array(z.string()).default([]),
    readTime: z.string().default('3 min'),
    draft: z.boolean().default(false),
    emoji: z.string().default('📝'),
    author: z.string().optional(), // byline desk: karpathy | robin | lando (falls back to series default)
  }),
});

// Interviews — the agent talks to Sơn, on the record.
const interviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/interviews' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    readTime: z.string().default('5 min'),
    q: z.string(),          // teaser question (agent)
    a: z.string(),          // teaser answer (Sơn)
    draft: z.boolean().default(false),
    author: z.string().default('lando'), // interviewer — defaults to the editor, Lando
  }),
});

export const collections = { posts, interviews };
