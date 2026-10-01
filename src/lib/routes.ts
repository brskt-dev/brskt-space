/**
 * The complete list of localized routes, derived from src/i18n/ui.ts segments and the
 * validated publications. Used by src/pages/[lang]/[...path].astro (getStaticPaths)
 * and by the sitemap, so both always agree.
 */
import { LANGS, segments, type Lang, type PageRef, type SectionKey, urlFor } from '../i18n/ui';
import { getPublications, type Publication } from './publications';

export type RouteView =
  | { view: 'home' }
  | { view: 'about' }
  | { view: 'section'; section: SectionKey }
  | { view: 'publication'; slug: string };

export interface SiteRoute {
  lang: Lang;
  /** Rest param under /[lang]/ ("" → undefined for the language home). */
  path: string | undefined;
  ref: PageRef;
  route: RouteView;
}

const restParam = (...parts: string[]) => {
  const joined = parts.filter(Boolean).join('/');
  return joined === '' ? undefined : joined;
};

export async function getSiteRoutes(): Promise<SiteRoute[]> {
  const pubs = await getPublications();
  const sections: SectionKey[] = ['projects', 'articles'];
  const routes: SiteRoute[] = [];

  for (const lang of LANGS) {
    routes.push({ lang, path: undefined, ref: { kind: 'page', page: 'home' }, route: { view: 'home' } });
    routes.push({
      lang,
      path: restParam(segments.about[lang]),
      ref: { kind: 'page', page: 'about' },
      route: { view: 'about' },
    });

    for (const section of sections) {
      const items = pubs.filter((p) => p.section === section);
      if (items.length === 0) continue; // empty sections do not exist at all
      routes.push({
        lang,
        path: restParam(segments[section][lang]),
        ref: { kind: 'page', page: section },
        route: { view: 'section', section },
      });
      for (const pub of items) {
        routes.push({
          lang,
          path: restParam(segments[section][lang], pub.slug),
          ref: { kind: 'publication', type: pub.type, slug: pub.slug },
          route: { view: 'publication', slug: pub.slug },
        });
      }
    }
  }
  return routes;
}

/** Sitemap helper: one entry per language-independent page, with its URL in each language. */
export async function getSitemapEntries(): Promise<
  { urls: Record<Lang, string>; lastmod?: Date }[]
> {
  const routes = await getSiteRoutes();
  const pubs = await getPublications();
  const bySlug = new Map<string, Publication>(pubs.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  const out: { urls: Record<Lang, string>; lastmod?: Date }[] = [];
  for (const r of routes) {
    const key = JSON.stringify(r.ref);
    if (seen.has(key)) continue;
    seen.add(key);
    const urls = Object.fromEntries(LANGS.map((l) => [l, urlFor(l, r.ref)])) as Record<Lang, string>;
    let lastmod: Date | undefined;
    if (r.ref.kind === 'publication') {
      const p = bySlug.get(r.ref.slug);
      if (p) lastmod = p.entries.pt.data.updated ?? p.date;
    }
    out.push({ urls, lastmod });
  }
  return out;
}
