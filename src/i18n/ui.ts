/**
 * UI labels, route segments and URL helpers.
 *
 * Every internal URL on the site is built here (or in src/lib/url.ts, which this
 * module re-exports). Components must never hand-write "/pt/..." strings.
 */
import { joinBase } from '../lib/url';
import { EXTERNAL_HINT } from '../lib/markdown-external-links.mjs';

export const LANGS = ['pt', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const otherLang = (lang: Lang): Lang => (lang === 'pt' ? 'en' : 'pt');

/** BCP 47 tag used in <html lang>, hreflang and lang="" attributes. */
export const htmlLang: Record<Lang, string> = { pt: 'pt-BR', en: 'en' };
/** Open Graph locale. */
export const ogLocale: Record<Lang, string> = { pt: 'pt_BR', en: 'en_US' };
/** Intl locale for date formatting. */
export const intlLocale: Record<Lang, string> = { pt: 'pt-BR', en: 'en-US' };

/* -------------------------------------------------------------------------- */
/* Route segments                                                             */
/* -------------------------------------------------------------------------- */

export type PageKey = 'home' | 'about' | 'projects' | 'articles';
export type PublicationType = 'product' | 'article' | 'experiment';
/** Listing section a publication type belongs to. */
export type SectionKey = 'projects' | 'articles';

export const segments: Record<PageKey, Record<Lang, string>> = {
  home: { pt: '', en: '' },
  about: { pt: 'sobre', en: 'about' },
  projects: { pt: 'projetos', en: 'projects' },
  articles: { pt: 'artigos', en: 'articles' },
};

export const sectionForType = (type: PublicationType): SectionKey =>
  type === 'article' ? 'articles' : 'projects';

/** A language-independent reference to a page; resolved to a URL per language. */
export type PageRef =
  | { kind: 'page'; page: PageKey }
  | { kind: 'publication'; type: PublicationType; slug: string };

/** Path (with base, trailing slash) of a page in a language. e.g. pathFor('pt','about') → /brskt-space/pt/sobre/ */
export function pathFor(lang: Lang, page: PageKey): string {
  return joinBase(lang, segments[page][lang]);
}

/** Path of a publication. e.g. publicationUrl('en','product','conta-comigo') → /brskt-space/en/projects/conta-comigo/ */
export function publicationUrl(lang: Lang, type: PublicationType, slug: string): string {
  return joinBase(lang, segments[sectionForType(type)][lang], slug);
}

/** Resolve a PageRef to a path in the given language. */
export function urlFor(lang: Lang, ref: PageRef): string {
  return ref.kind === 'page' ? pathFor(lang, ref.page) : publicationUrl(lang, ref.type, ref.slug);
}

/** The equivalent page in the other language (used by the language switcher + hreflang). */
export function alternateUrl(lang: Lang, ref: PageRef): string {
  return urlFor(otherLang(lang), ref);
}

/** Root language chooser (x-default). */
export const rootUrl = (): string => joinBase();

/* -------------------------------------------------------------------------- */
/* UI strings                                                                 */
/* -------------------------------------------------------------------------- */

const strings = {
  'a11y.skip': { pt: 'Pular para o conteúdo', en: 'Skip to content' },
  'a11y.mainNav': { pt: 'Navegação principal', en: 'Main navigation' },
  'a11y.homeLink': { pt: 'Bruno Anhezini, página inicial', en: 'Bruno Anhezini, home page' },
  'a11y.external': EXTERNAL_HINT,
  'a11y.switchLang': { pt: 'Read in English', en: 'Ler em português' },
  'a11y.switchLangShort': { pt: 'EN', en: 'PT' },
  'a11y.contactLinks': { pt: 'Contato', en: 'Contact' },

  'nav.home': { pt: 'Início', en: 'Home' },
  'nav.projects': { pt: 'Projetos', en: 'Projects' },
  'nav.articles': { pt: 'Artigos', en: 'Articles' },
  'nav.about': { pt: 'Sobre', en: 'About' },

  'footer.contact': { pt: 'contato:', en: 'contact:' },
  'footer.linkedin': { pt: 'LinkedIn', en: 'LinkedIn' },
  'footer.github': { pt: 'GitHub', en: 'GitHub' },
  'footer.source': { pt: 'Código do site', en: 'Site source' },

  'home.focus': { pt: 'O que eu faço', en: 'What I work on' },
  'home.projects': { pt: 'Projetos', en: 'Projects' },
  'home.articles': { pt: 'Artigos', en: 'Articles' },
  'home.aboutLink': { pt: 'Mais sobre mim', en: 'More about me' },
  'home.allProjects': { pt: 'Todos os projetos', en: 'All projects' },
  'home.allArticles': { pt: 'Todos os artigos', en: 'All articles' },

  'about.experience': { pt: 'Experiência', en: 'Experience' },
  'about.skills': { pt: 'Competências', en: 'Skills' },
  'about.education': { pt: 'Formação', en: 'Education' },
  'about.languages': { pt: 'Idiomas', en: 'Languages' },
  'about.contact': { pt: 'Contato', en: 'Contact' },
  'about.photoAlt': { pt: 'Foto de Bruno Anhezini', en: 'Photo of Bruno Anhezini' },
  'about.tech': { pt: 'Tecnologias', en: 'Technologies' },
  'about.present': { pt: 'atual', en: 'present' },
  'about.email': { pt: 'E-mail', en: 'Email' },
  'about.phone': { pt: 'Telefone / WhatsApp', en: 'Phone / WhatsApp' },
  'about.linkedin': { pt: 'LinkedIn', en: 'LinkedIn' },
  'about.github': { pt: 'GitHub', en: 'GitHub' },
  'about.location': { pt: 'Localização', en: 'Location' },

  'projects.title': { pt: 'Projetos', en: 'Projects' },
  'projects.description': { pt: 'Projetos em que estou trabalhando.', en: 'Projects I’m working on.' },
  'articles.title': { pt: 'Artigos', en: 'Articles' },
  'articles.description': {
    pt: 'Artigos técnicos.',
    en: 'Technical articles.',
  },
  'pub.back.projects': { pt: 'voltar para projetos', en: 'back to projects' },
  'pub.back.articles': { pt: 'voltar para artigos', en: 'back to articles' },
  'pub.links': { pt: 'Links', en: 'Links' },
  'pub.tags': { pt: 'Tags', en: 'Tags' },
  'meta.type': { pt: 'tipo', en: 'type' },
  'meta.status': { pt: 'status', en: 'status' },
  'meta.date': { pt: 'publicado', en: 'published' },
  'meta.updated': { pt: 'atualizado', en: 'updated' },

  'type.product': { pt: 'produto', en: 'product' },
  'type.article': { pt: 'artigo', en: 'article' },
  'type.experiment': { pt: 'experimento', en: 'experiment' },

  'status.in-development': { pt: 'em desenvolvimento', en: 'in development' },
  'status.live': { pt: 'no ar', en: 'live' },
  'status.paused': { pt: 'pausado', en: 'paused' },
  'status.archived': { pt: 'arquivado', en: 'archived' },
  'status.running': { pt: 'em andamento', en: 'running' },
  'status.concluded': { pt: 'concluído', en: 'concluded' },

  'notfound.title': { pt: 'Página não encontrada', en: 'Page not found' },
  'notfound.text': {
    pt: 'O endereço que você abriu não existe aqui. Talvez tenha mudado de lugar.',
    en: 'There’s no page at this address. It may have moved.',
  },
  'notfound.cta': { pt: 'Ir para o início em português', en: 'Go to the English home page' },

  'chooser.title': { pt: 'Escolha o idioma', en: 'Choose a language' },
} as const satisfies Record<string, Record<Lang, string>>;

export type UiKey = keyof typeof strings;

export function t(lang: Lang, key: UiKey): string {
  return strings[key][lang];
}

export const typeLabel = (lang: Lang, type: PublicationType) => t(lang, `type.${type}` as UiKey);
export const statusLabel = (lang: Lang, status: string) => {
  const key = `status.${status}` as UiKey;
  return key in strings ? t(lang, key) : status;
};

/** Localized "1 out. 2026" / "Oct 1, 2026" (UTC; content dates have no time component). */
export function formatDate(lang: Lang, date: Date): string {
  return new Intl.DateTimeFormat(intlLocale[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** ISO yyyy-mm-dd for <time datetime>. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
