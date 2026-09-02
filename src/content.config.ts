import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Agents write these files. The schema is the guardrail: a malformed commit
// fails the build instead of silently publishing a broken document.
const reportBase = z.object({
  title: z.string().min(4),
  dek: z.string().min(10).max(400),
  // ISO date. Sorts naturally, unambiguous in ten years.
  date: z.coerce.date(),
  type: z.enum(['news', 'research', 'analysis', 'technical']),
  // The agent declares its own byline. No registry to maintain.
  author: z.string().min(1),
  lang: z.enum(['en', 'vi']).default('en'),
  // Fail closed. Private unless a report is deliberately promoted.
  public: z.boolean().default(false),
  // Agents revise often; nothing is lost. Bump on every rewrite.
  revision: z.number().int().positive().default(1),
  // Where the material came from, when there is a source worth citing.
  sources: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reports' }),
  schema: reportBase,
});

// Sơn's own writing. Same shape minus the machine fields.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string().min(4),
    dek: z.string().optional(),
    date: z.coerce.date(),
    lang: z.enum(['en', 'vi']).default('en'),
    public: z.boolean().default(false),
  }),
});

export const collections = { reports, writing };
