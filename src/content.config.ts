import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The engine's themes. Agents file every reading under exactly one.
export const THEMES = ['news', 'country', 'industry', 'company', 'business-model', 'sociology'] as const;

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reports' }),
  schema: z.object({
    title: z.string().min(4),
    dek: z.string().min(10).max(400),
    date: z.coerce.date(),
    type: z.enum(THEMES),
    author: z.string().min(1),          // the agent's own name, kept forever
    lang: z.enum(['en', 'vi']).default('en'),
    public: z.boolean().default(false), // legacy, no-op
    revision: z.number().int().positive().default(1),
    sources: z.array(z.string().url()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

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

// A project in the portfolio: one profile page each.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(2),
    order: z.number().int().positive(),
    status: z.enum(['live', 'building', 'next', 'paused']),
    summary: z.string().min(10).max(300),
    started: z.coerce.date().optional(),
    themes: z.array(z.string()).optional(),
  }),
});

// The build diary: one entry per project per day, how it was built and changed.
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    project: z.string().min(2),        // the project's id (file name without .md)
    date: z.coerce.date(),
    title: z.string().min(4),
    author: z.string().default('Alfred'),
  }),
});

export const collections = { reports, writing, projects, journal };
