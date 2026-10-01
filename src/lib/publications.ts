/**
 * Publications: loading + build-time integrity check.
 *
 * Every page that lists or renders publications (and the site header, which decides
 * which nav links exist) goes through getPublications(), so the check runs on every
 * build. Throwing here fails `astro build` — that is the enforcement of the
 * "a publication only goes live when BOTH languages exist" rule.
 *
 * Rules (non-draft publications):
 *   - src/content/publications/<slug>/ must contain exactly pt.md AND en.md;
 *   - `type`, `date` and `status` must match between pt and en;
 *   - `status` is required for product / experiment (also enforced by the schema);
 *   - `draft` must match between pt and en; draft: true on both → excluded entirely.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { LANGS, sectionForType, type Lang, type PublicationType, type SectionKey } from '../i18n/ui';

export type PublicationEntry = CollectionEntry<'publications'>;

export interface Publication {
  slug: string;
  type: PublicationType;
  section: SectionKey;
  date: Date;
  status?: string;
  /** Per-language entries (render with `render(entry)` from astro:content). */
  entries: Record<Lang, PublicationEntry>;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIR = 'src/content/publications';

class PublicationIntegrityError extends Error {
  constructor(message: string) {
    super(`[publications] ${message}`);
    this.name = 'PublicationIntegrityError';
  }
}

const sameDate = (a: Date, b: Date) => a.getTime() === b.getTime();
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function loadAndValidate(): Promise<Publication[]> {
  const all = await getCollection('publications');
  const bySlug = new Map<string, Partial<Record<Lang, PublicationEntry>>>();

  for (const entry of all) {
    const match = /^([^/]+)\/([^/]+)$/.exec(entry.id);
    if (!match) {
      throw new PublicationIntegrityError(
        `Unexpected file "${DIR}/${entry.id}.md". Publications must live at ${DIR}/<slug>/pt.md and ${DIR}/<slug>/en.md.`,
      );
    }
    const [, slug, lang] = match;
    if (!SLUG_RE.test(slug)) {
      throw new PublicationIntegrityError(
        `Invalid slug "${slug}" (${DIR}/${slug}/). Use lowercase letters, digits and hyphens only, e.g. "my-project".`,
      );
    }
    if (!(LANGS as readonly string[]).includes(lang)) {
      throw new PublicationIntegrityError(
        `Unexpected file "${DIR}/${slug}/${lang}.md" in publication "${slug}". Only pt.md and en.md are allowed.`,
      );
    }
    const pair = bySlug.get(slug) ?? {};
    pair[lang as Lang] = entry;
    bySlug.set(slug, pair);
  }

  const publications: Publication[] = [];
  for (const [slug, pair] of bySlug) {
    const { pt, en } = pair;
    if (!pt || !en) {
      const present = pt ? 'pt.md' : 'en.md';
      const missing = pt ? 'en.md' : 'pt.md';
      const onlyEntry = (pt ?? en)!;
      if (onlyEntry.data.draft) continue; // a lone draft never ships, nothing to check
      throw new PublicationIntegrityError(
        `Publication "${slug}" is missing ${DIR}/${slug}/${missing} (found only ${present}). ` +
          `A publication goes live only when BOTH pt.md and en.md exist — add the translation or set "draft: true".`,
      );
    }

    if (pt.data.draft !== en.data.draft) {
      throw new PublicationIntegrityError(
        `Publication "${slug}": "draft" differs between pt.md (${pt.data.draft}) and en.md (${en.data.draft}). Set it the same in both files.`,
      );
    }
    if (pt.data.draft) continue; // excluded from the build entirely

    const mismatches: string[] = [];
    if (pt.data.type !== en.data.type) mismatches.push(`type (pt: "${pt.data.type}", en: "${en.data.type}")`);
    if (!sameDate(pt.data.date, en.data.date))
      mismatches.push(`date (pt: ${iso(pt.data.date)}, en: ${iso(en.data.date)})`);
    if (pt.data.status !== en.data.status)
      mismatches.push(`status (pt: "${pt.data.status ?? '—'}", en: "${en.data.status ?? '—'}")`);
    if (mismatches.length) {
      throw new PublicationIntegrityError(
        `Publication "${slug}": pt.md and en.md disagree on ${mismatches.join('; ')}. These fields must be identical in both languages.`,
      );
    }

    const type = pt.data.type;
    if ((type === 'product' || type === 'experiment') && !pt.data.status) {
      throw new PublicationIntegrityError(`Publication "${slug}": "status" is required for type "${type}".`);
    }

    publications.push({
      slug,
      type,
      section: sectionForType(type),
      date: pt.data.date,
      status: pt.data.status,
      entries: { pt, en },
    });
  }

  // Newest first, then by slug for a stable order.
  publications.sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));
  return publications;
}

let cache: Promise<Publication[]> | undefined;

/** All live (validated, non-draft) publications. Throws on any integrity problem. */
export function getPublications(): Promise<Publication[]> {
  // Do not cache in dev so edits are picked up; in build, validate once.
  if (import.meta.env.DEV) return loadAndValidate();
  cache ??= loadAndValidate();
  return cache;
}

export async function getSection(section: SectionKey): Promise<Publication[]> {
  return (await getPublications()).filter((p) => p.section === section);
}

/** Which listing sections have at least one publication (drives nav + routes). */
export async function getSectionAvailability(): Promise<Record<SectionKey, boolean>> {
  const pubs = await getPublications();
  return {
    projects: pubs.some((p) => p.section === 'projects'),
    articles: pubs.some((p) => p.section === 'articles'),
  };
}
