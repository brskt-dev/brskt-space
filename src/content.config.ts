import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Content collections.
 *
 * publications: src/content/publications/<slug>/{pt,en}.md (or .mdx, to embed components)
 *   Entry id = "<slug>/<lang>" (folder + file name). Pairing/consistency between
 *   the two languages is enforced at build time by src/lib/publications.ts.
 *
 * home / about / dev-partner: src/content/pages/<page>/{pt,en}.md  (entry id = "pt" | "en")
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

const PRODUCT_STATUS = ['in-development', 'demo', 'live', 'paused', 'archived'] as const;
const EXPERIMENT_STATUS = [...PRODUCT_STATUS, 'running', 'concluded'] as const;
/** A service the owner offers (listed under Projects). */
const SERVICE_STATUS = ['available', 'paused'] as const;
const ALL_STATUS = [...EXPERIMENT_STATUS, 'available'] as const;

const publications = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/publications',
    generateId: ({ entry }) => stripMd(entry),
  }),
  schema: ({ image }) =>
    z
      .object({
        type: z.enum(['product', 'article', 'experiment', 'service']),
        title: z.string().min(1),
        summary: z.string().min(1),
        date: isoDate,
        updated: isoDate.optional(),
        status: z.enum(ALL_STATUS).optional(),
        /** service only: the landing page this entry points to (a PageKey with its own route). */
        landing: z.enum(['devPartner']).optional(),
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
        /** Card image (home, listings). Falls back to `cover`, then to the generated space art. */
        thumbnail: image().optional(),
        /** Highlight numbers shown as tiles under the title, e.g. { value: "489", label: "unit tests" }. */
        stats: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).default([]),
        /** Tech stack, shown as chips at the end of the page. */
        stack: z.array(z.string().min(1)).default([]),
        /** Screenshots shown as a gallery (files next to the .md). */
        gallery: z
          .array(
            z.object({
              src: image(),
              alt: z.string().min(1),
              caption: z.string().min(1).optional(),
              orientation: z.enum(['landscape', 'portrait']).default('landscape'),
            }),
          )
          .default([]),
        draft: z.boolean().default(false),
      })
      .superRefine((data, ctx) => {
        if (data.type === 'product' || data.type === 'experiment' || data.type === 'service') {
          if (!data.status) {
            ctx.addIssue({
              code: 'custom',
              path: ['status'],
              message: `"status" is required for type "${data.type}"`,
            });
          } else {
            const allowed: readonly string[] =
              data.type === 'product' ? PRODUCT_STATUS : data.type === 'service' ? SERVICE_STATUS : EXPERIMENT_STATUS;
            if (!allowed.includes(data.status)) {
              ctx.addIssue({
                code: 'custom',
                path: ['status'],
                message: `status "${data.status}" is not allowed for type "${data.type}" (use one of: ${allowed.join(', ')})`,
              });
            }
          }
        }
        if (data.landing && data.type !== 'service') {
          ctx.addIssue({ code: 'custom', path: ['landing'], message: '"landing" is only for type "service"' });
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
    /** Big greeting in the hero (the h1). */
    headline: z.string().min(1),
    tagline: z.string().min(1),
    availability: z.string().min(1),
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
    /** Short story cards ("blocks") shown before the detailed timeline. */
    story: z
      .array(
        z.object({
          when: z.string().min(1),
          title: z.string().min(1),
          text: z.string().min(1),
          icon: z.enum(['receipt', 'cpu', 'server', 'bot', 'rocket', 'code', 'terminal', 'sparkles']),
        }),
      )
      .default([]),
  }),
});

/** A card in the Dev parceiro landing: short title + one or two sentences. */
const card = z.object({ title: z.string().min(1), text: z.string().min(1) });
const block = { title: z.string().min(1), intro: z.string().min(1) };

/**
 * dev-partner: src/content/pages/dev-partner/{pt,en}.md: all the copy of the "Dev parceiro"
 * service landing (frontmatter only). The WhatsApp CTA label lives in src/i18n/ui.ts.
 */
const devPartner = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages/dev-partner',
    generateId: ({ entry }) => stripMd(entry),
  }),
  schema: z.object({
    /** <title> (without the " · Brskt Space" suffix) and meta description. */
    title: z.string().min(1).max(70),
    description: z.string().min(1).max(170),
    hero: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      lead: z.string().min(1),
      ctaNote: z.string().min(1),
      /** Short labels around "your company" in the hero picture (decorative). */
      orbit: z.array(z.string().min(1).max(24)).min(3).max(8),
    }),
    recognize: z.object({ ...block, items: z.array(card).min(3) }),
    does: z.object({ ...block, items: z.array(card).min(3) }),
    how: z.object({ ...block, steps: z.array(card).min(3), loop: z.string().min(1) }),
    ai: z.object({
      title: z.string().min(1),
      text: z.string().min(1),
      aiPart: z.array(z.string().min(1)).min(1),
      mePart: z.array(z.string().min(1)).min(1),
    }),
    who: z.object({ title: z.string().min(1), text: z.string().min(1) }),
    conditions: z.object({
      ...block,
      points: z.array(z.string().min(1)).min(1),
      note: z.string().min(1),
    }),
    faq: z.object({
      title: z.string().min(1),
      items: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).min(1),
    }),
    closing: z.object({ title: z.string().min(1), text: z.string().min(1) }),
    /** The commercial terms as numbers: shown on the page (formatted per language) and in the JSON-LD. */
    offer: z.object({
      monthlyPrice: z.number().int().positive(),
      currency: z.literal('BRL'),
      months: z.number().int().positive(),
    }),
    /** Pre-filled text of the WhatsApp conversation (wa.me ?text=). */
    whatsappMessage: z.string().min(1).max(300),
  }),
});

export const collections = { publications, home, about, devPartner };
