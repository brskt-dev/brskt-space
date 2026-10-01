import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Content collections.
 *
 * publications: src/content/publications/<slug>/{pt,en}.md
 *   Entry id = "<slug>/<lang>" (folder + file name). Pairing/consistency between
 *   the two languages is enforced at build time by src/lib/publications.ts.
 *
 * home / about: src/content/pages/<page>/{pt,en}.md  (entry id = "pt" | "en")
 */

const stripMd = (entry: string) => entry.replace(/\.(md|mdx)$/i, '');

/**
 * Dates must be written as YYYY-MM-DD. YAML turns an unquoted 2026-10-01 into a Date;
 * a quoted "2026-10-01" is accepted too. Anything else (e.g. 01/10/2026, which
 * `new Date()` would silently read as 10 January) is rejected instead of guessed.
 */
const isoDate = z
  .union([
    z.date(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format, e.g. 2026-10-01'),
  ])
  .pipe(z.coerce.date());

const PRODUCT_STATUS = ['in-development', 'live', 'paused', 'archived'] as const;
const EXPERIMENT_STATUS = [...PRODUCT_STATUS, 'running', 'concluded'] as const;

const publications = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/publications',
    generateId: ({ entry }) => stripMd(entry),
  }),
  schema: ({ image }) =>
    z
      .object({
        type: z.enum(['product', 'article', 'experiment']),
        title: z.string().min(1),
        summary: z.string().min(1),
        date: isoDate,
        updated: isoDate.optional(),
        status: z.enum(EXPERIMENT_STATUS).optional(),
        tags: z.array(z.string().min(1)).default([]),
        links: z
          .array(
            z.object({
              label: z.string().min(1),
              url: z.url(),
            }),
          )
          .default([]),
        cover: image().optional(),
        draft: z.boolean().default(false),
      })
      .superRefine((data, ctx) => {
        if (data.type === 'product' || data.type === 'experiment') {
          if (!data.status) {
            ctx.addIssue({
              code: 'custom',
              path: ['status'],
              message: `"status" is required for type "${data.type}"`,
            });
          } else if (
            data.type === 'product' &&
            !(PRODUCT_STATUS as readonly string[]).includes(data.status)
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['status'],
              message: `status "${data.status}" is not allowed for type "product" (use one of: ${PRODUCT_STATUS.join(', ')})`,
            });
          }
        }
      }),
});

const home = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages/home',
    generateId: ({ entry }) => stripMd(entry),
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    tagline: z.string().min(1),
    availability: z.string().min(1),
    focus: z
      .array(
        z.object({
          title: z.string().min(1),
          text: z.string().min(1),
        }),
      )
      .default([]),
  }),
});

const about = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages/about',
    generateId: ({ entry }) => stripMd(entry),
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
});

export const collections = { publications, home, about };
