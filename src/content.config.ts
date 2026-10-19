import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Schemas follow the field tables in src/content/README.md.

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(10).max(200),
    date: z.coerce.date(),
    draft: z.boolean(),
    tags: z.array(z.string()),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().min(10).max(300),
    status: z.literal('live'),
    url: z.url(),
    started: z.coerce.date(),
    stack: z.array(z.string()),
    order: z.number().int().positive(),
    draft: z.boolean(),
  }),
});

const sideProjects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/side-projects' }),
  schema: z.object({
    title: z.string(),
    blurb: z.string().min(10).max(300),
    status: z.enum(['listed', 'public', 'building', 'pre-alpha']),
    url: z.url().optional(),
    repo: z.url().optional(),
    order: z.number().int().positive(),
    draft: z.boolean(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(10).max(200),
    homeTitle: z.string().optional(),
    homeIntro: z.string().refine(value => {
      const words = value.trim().split(/\s+/).length;
      return words >= 40 && words <= 60;
    }, 'Home introduction must contain 40 to 60 words').optional(),
    homeBuild: z.string().optional(),
    draft: z.boolean(),
  }),
});

export const collections = { posts, work, 'side-projects': sideProjects, pages };
