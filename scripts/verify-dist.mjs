#!/usr/bin/env node
// verify-dist.mjs: checks the built site in dist/ before it is deployed.
// Zero dependencies, Node >= 22. `npm run verify` runs `astro check`, `astro build` and then this script.
//
//   node scripts/verify-dist.mjs                 check ../dist (relative to this file)
//   node scripts/verify-dist.mjs --dist <path>   check another folder
//   node scripts/verify-dist.mjs --external      also request every external http(s) link (warnings only)
//   node scripts/verify-dist.mjs --site <origin> --base <path>   override SITE / BASE below
//
// ERRORS (exit code 1, nothing gets deployed):
//   - internal href / src / srcset / url() that does not resolve to a file in dist
//   - root-absolute URL that does not start with BASE (the classic GitHub Pages project-site bug),
//     relative URL that escapes BASE, relative URL inside 404.html, localhost URL
//   - page without <html lang>, <title>, exactly one <h1>, meta description, self canonical
//     (404.html and the root language chooser only need lang + title; h1/description are warnings there)
//   - pt/ page without <link rel="alternate" hreflang="en"> to an existing en/ page, and the reverse
//     (alternates must be reciprocal, and the language switch must go to the same page)
//   - placeholder / debug text: STUB, TODO, FIXME, lorem, ipsum, undefined, NaN, Invalid Date,
//     [object Object] in visible text or attribute values (<pre>/<code> blocks are skipped)
//   - #fragment link to an id that does not exist on the target page
//   - tel: / WhatsApp link outside the About pages; required file missing
// WARNINGS (printed, never fail): page link without trailing slash, external <a> without
//   rel="noopener", duplicate ids, missing x-default alternate, external link failures (--external).

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// ------------------------------------------------------------------ configuration
// Keep SITE and BASE in sync with `site` and `base` in astro.config.mjs.
const SITE = 'https://brskt-dev.github.io';
const BASE = '/brskt-space/';

const ROOT_PAGE = 'index.html'; // language chooser
const NOT_FOUND_PAGE = '404.html';
const REQUIRED_FILES = ['index.html', '404.html', 'pt/index.html', 'en/index.html', 'sitemap.xml', 'robots.txt', 'favicon.svg'];
const SECTIONS = [
  { dir: 'pt/', lang: 'pt-BR', counterpart: 'en' },
  { dir: 'en/', lang: 'en', counterpart: 'pt-BR' },
];
const PHONE_ALLOWED_PAGES = new Set(['pt/sobre/index.html', 'en/about/index.html']);
const MARKERS = [
  [/\bSTUB\b/, 'STUB'],
  [/\bTODO\b/, 'TODO'],
  [/\bFIXME\b/i, 'FIXME'],
  [/\blorem\b/i, 'lorem'],
  [/\bipsum\b/i, 'ipsum'],
  [/\bundefined\b/, 'undefined'],
  [/\bNaN\b/, 'NaN'],
  [/\bInvalid Date\b/, 'Invalid Date'],
  [/\[object Object\]/, '[object Object]'],
];
// Attributes whose values are CSS or hashes, not text (data: URIs are skipped too).
const MARKER_SKIP_ATTRS = new Set(['style', 'integrity', 'nonce', 'd', 'viewbox', 'points', 'transform']);
const EXTERNAL_TIMEOUT_MS = 10_000;
const EXTERNAL_CONCURRENCY = 6;

const CATEGORY_TITLES = {
  required: 'Required files',
  'outside-base': 'URLs outside the base path',
  'broken-link': 'Broken internal links',
  fragment: 'Broken #fragment links',
  head: 'Page metadata (lang, title, h1, description, canonical)',
  hreflang: 'Language alternates (hreflang / language switch)',
  marker: 'Placeholder or debug text in the output',
  phone: 'Phone / WhatsApp outside the About page',
  url: 'Suspicious URLs',
  ids: 'Duplicate ids',
  external: 'External links (--external)',
};

// ------------------------------------------------------------------ CLI
let args;
try {
  ({ values: args } = parseArgs({
    options: {
      dist: { type: 'string' },
      site: { type: 'string' },
      base: { type: 'string' },
      external: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }));
} catch (e) {
  console.error(`verify-dist: ${e.message}\nRun with --help for usage.`);
  process.exit(2);
}
if (args.help) {
  console.log('Usage: node scripts/verify-dist.mjs [--dist <path>] [--external] [--site <origin>] [--base <path>]');
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(args.dist ?? path.join(scriptDir, '..', 'dist'));
const cfg = {
  site: (args.site ?? SITE).replace(/\/+$/, ''),
  base: `/${(args.base ?? BASE).replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/'),
};
cfg.origin = new URL(cfg.site).origin;
const FAKE_ORIGIN = 'http://verify-dist.invalid';
const LOCAL_HOST_RE = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
const WHATSAPP_RE = /^(?:https?:)?\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)(?:\/|$)/i;

// ------------------------------------------------------------------ reporting
const problems = [];
const report = (level) => (cat, file, msg) => problems.push({ level, cat, file, msg });
const error = report('error');
const warn = report('warn');
const stats = { pages: 0, otherFiles: 0, refs: 0, internal: 0, fragments: 0, externalRefs: 0 };
const internalTargets = new Set();
const externals = new Map(); // url -> first file that links to it

// ------------------------------------------------------------------ parsing helpers
// A start tag, with quoted attribute values allowed to contain '>'.
const TAG_RE = /<([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const CSS_REF_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi;
const URL_ATTRS = new Set(['href', 'src', 'poster', 'action', 'formaction', 'cite', 'xlink:href', 'data']);
const META_URL_KEYS = new Set(['og:url', 'og:image', 'og:image:url', 'og:image:secure_url', 'og:video', 'og:audio', 'twitter:image', 'twitter:url']);
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseAttrs(src) {
  const attrs = new Map();
  for (const m of src.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    if (!attrs.has(name)) attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''));
  }
  return attrs;
}

function splitSrcset(value) {
  return value.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
}

function cssRefs(css) {
  const out = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(CSS_REF_RE)) {
    const v = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    if (v.trim()) out.push(v.trim());
  }
  return out;
}

// Removes comments and the bodies of <script>/<style> so their contents are never read as markup.
function splitRawText(html) {
  const scripts = [];
  const styles = [];
  let markup = html.replace(/<!--[\s\S]*?-->/g, ' ');
  markup = markup.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_, attrs, body) => {
    scripts.push({ attrs: parseAttrs(attrs), body });
    return `<script${attrs}></script>`;
  });
  markup = markup.replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi, (_, attrs, body) => {
    styles.push(body);
    return `<style${attrs}></style>`;
  });
  return { markup, scripts, styles };
}

function urlPathFor(rel) {
  if (rel === 'index.html') return cfg.base;
  if (rel.endsWith('/index.html')) return cfg.base + rel.slice(0, -'index.html'.length);
  return cfg.base + rel;
}

function snippet(text, index, length) {
  const s = text.slice(Math.max(0, index - 40), index + length + 40).replace(/\s+/g, ' ').trim();
  return s.length > 110 ? `${s.slice(0, 110)}...` : s;
}

function describe(ref) {
  if (ref.tag === 'css') return `url(${ref.value})`;
  if (ref.tag === 'sitemap') return `<loc>${ref.value}</loc>`;
  if (ref.tag === 'robots') return `Sitemap: ${ref.value}`;
  const v = ref.value.length > 120 ? `${ref.value.slice(0, 117)}...` : ref.value;
  const ctx = ref.tag === 'link' ? ['rel', 'hreflang'].filter((a) => ref.attrs?.has(a)).map((a) => `${a}="${ref.attrs.get(a)}" `).join('') : '';
  return `<${ref.tag} ${ctx}${ref.attr}="${v}">`;
}

// ------------------------------------------------------------------ file system
async function walk(dir, prefix = '') {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    // Dotfiles are not deployed (actions/upload-pages-artifact excludes them), so they do not count.
    if (ent.name.startsWith('.')) continue;
    const rel = prefix + ent.name;
    const full = path.join(dir, ent.name);
    let isDir = ent.isDirectory();
    let isFile = ent.isFile();
    if (ent.isSymbolicLink()) {
      const s = await stat(full).catch(() => null);
      isDir = !!s?.isDirectory();
      isFile = !!s?.isFile();
    }
    if (isDir) out.push(...(await walk(full, `${rel}/`)));
    else if (isFile) out.push(rel);
  }
  return out;
}

let files;
try {
  files = new Set(await walk(DIST));
} catch {
  console.error(`verify-dist: cannot read ${DIST}. Run \`npm run build\` first (or pass --dist <path>).`);
  process.exit(1);
}

// ------------------------------------------------------------------ URL resolution
const inBase = (p) => p.startsWith(cfg.base) || p === cfg.base.slice(0, -1);

// Classifies a URL found in `src` without reporting anything.
function resolveRef(src, raw) {
  const v = raw.trim();
  if (!v) return { kind: 'empty' };
  if (v.startsWith('#')) return { kind: 'internal', style: 'fragment', file: src.rel, hash: safeDecode(v.slice(1)) };
  const scheme = SCHEME_RE.exec(v)?.[1].toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return { kind: 'scheme', scheme };
  let u;
  try {
    u = new URL(v.startsWith('//') ? `https:${v}` : v, src.baseUrl);
  } catch {
    return { kind: 'invalid' };
  }
  if (LOCAL_HOST_RE.test(u.hostname)) return { kind: 'localhost' };
  const style = scheme || v.startsWith('//') ? 'absolute' : v.startsWith('/') ? 'root' : 'relative';
  if (u.origin !== FAKE_ORIGIN && u.origin !== cfg.origin) return { kind: 'external', url: u.href };
  if (!inBase(u.pathname)) {
    if (style === 'absolute') return { kind: 'site-outside-base', pathname: u.pathname };
    return { kind: style === 'root' ? 'outside-base' : 'escapes-base', pathname: u.pathname };
  }
  const bare = u.pathname === cfg.base.slice(0, -1);
  const rel = bare ? '' : safeDecode(u.pathname.slice(cfg.base.length));
  const candidates = rel === '' || rel.endsWith('/') ? [`${rel}index.html`] : [rel, `${rel}/index.html`];
  const file = candidates.find((c) => files.has(c)) ?? null;
  return {
    kind: 'internal',
    style,
    file,
    candidates,
    hash: u.hash ? safeDecode(u.hash.slice(1)) : '',
    noSlash: file !== null && (bare || file !== candidates[0]),
    pathname: u.pathname,
  };
}

const fragmentChecks = [];

function checkRefs(src, refs) {
  for (const ref of refs) {
    stats.refs++;
    const where = describe(ref);
    const r = resolveRef(src, ref.value);
    const phoneLink = r.kind === 'scheme' ? ['tel', 'sms', 'whatsapp'].includes(r.scheme) : WHATSAPP_RE.test(ref.value.trim());
    if (phoneLink && src.isHtml && !PHONE_ALLOWED_PAGES.has(src.rel)) {
      error('phone', src.rel, `${where}: phone/WhatsApp links belong only on ${[...PHONE_ALLOWED_PAGES].join(' and ')}`);
    }
    switch (r.kind) {
      case 'empty':
        if (ref.tag === 'a' || ref.attr === 'src') warn('url', src.rel, `${where} is empty`);
        break;
      case 'scheme':
        if (r.scheme === 'javascript') warn('url', src.rel, `${where}: javascript: URL (the site should not need client JS)`);
        break;
      case 'invalid':
        error('url', src.rel, `${where} is not a valid URL`);
        break;
      case 'localhost':
        error('url', src.rel, `${where} points to localhost; check \`site\` in astro.config.mjs`);
        break;
      case 'external':
        stats.externalRefs++;
        if (!externals.has(r.url)) externals.set(r.url, src.rel);
        if (ref.tag === 'a' && !/\bnoopener\b|\bnoreferrer\b/i.test(ref.attrs?.get('rel') ?? '')) {
          warn('url', src.rel, `${where}: external link without rel="noopener"`);
        }
        break;
      case 'site-outside-base':
        warn('url', src.rel, `${where} is on ${cfg.origin} but outside ${cfg.base} (fine only if it is another Pages project)`);
        break;
      case 'outside-base':
        error('outside-base', src.rel, `${where} does not start with ${cfg.base}. Build URLs with the helpers in src/i18n/ui.ts and src/lib/url.ts (they prepend the base). If you changed \`base\` in astro.config.mjs, update BASE in scripts/verify-dist.mjs too.`);
        break;
      case 'escapes-base':
        error('outside-base', src.rel, `${where} resolves to ${r.pathname}, outside ${cfg.base}`);
        break;
      case 'internal': {
        stats.internal++;
        if (src.rel === NOT_FOUND_PAGE && r.style === 'relative') {
          error('outside-base', src.rel, `${where} is relative. 404.html is served for any missing URL, so relative links break there; use a URL starting with ${cfg.base}`);
        }
        if (!r.file) {
          error(ref.cat ?? 'broken-link', src.rel, `${where}: not found in dist (looked for ${r.candidates.join(' or ')})`);
          break;
        }
        internalTargets.add(r.file);
        if (r.noSlash && ref.tag === 'a') warn('url', src.rel, `${where}: page link without trailing slash (trailingSlash is 'always')`);
        if (r.hash && r.hash !== 'top' && !r.hash.startsWith(':~:') && r.file.endsWith('.html')) {
          fragmentChecks.push({ src: src.rel, where, file: r.file, id: r.hash });
        }
        break;
      }
    }
  }
}

// ------------------------------------------------------------------ HTML pages
function parsePage(rel, html) {
  const { markup, scripts, styles } = splitRawText(html);
  const page = {
    rel,
    isHtml: true,
    urlPath: urlPathFor(rel),
    lang: null,
    title: null,
    h1: 0,
    description: null,
    canonicals: [],
    alternates: [],
    switchers: [],
    baseHref: null,
    refs: [],
    ids: new Map(),
  };
  let sawHtml = false;
  for (const m of markup.matchAll(TAG_RE)) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2] ?? '');
    if (attrs.has('id')) page.ids.set(attrs.get('id'), (page.ids.get(attrs.get('id')) ?? 0) + 1);
    if (tag === 'a' && attrs.has('name')) page.ids.set(attrs.get('name'), (page.ids.get(attrs.get('name')) ?? 0) + 1);
    if (tag === 'html' && !sawHtml) { sawHtml = true; page.lang = attrs.get('lang') ?? null; }
    if (tag === 'h1') page.h1++;
    if (tag === 'base' && attrs.has('href') && page.baseHref === null) page.baseHref = attrs.get('href');

    let hrefCat = null;
    if (tag === 'link') {
      const relTokens = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
      if (relTokens.includes('canonical')) { page.canonicals.push(attrs.get('href') ?? ''); hrefCat = 'head'; }
      if (relTokens.includes('alternate') && attrs.has('hreflang')) {
        page.alternates.push({ hreflang: attrs.get('hreflang'), href: attrs.get('href') ?? '' });
        hrefCat = 'hreflang';
      }
    }
    if (tag === 'a' && attrs.has('hreflang') && attrs.has('href')) page.switchers.push({ hreflang: attrs.get('hreflang'), href: attrs.get('href') });
    if (tag === 'meta') {
      const key = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
      if ((attrs.get('name') ?? '').toLowerCase() === 'description' && page.description === null) page.description = attrs.get('content') ?? '';
      if (META_URL_KEYS.has(key) && attrs.has('content')) page.refs.push({ tag, attr: `content (${key})`, value: attrs.get('content'), attrs });
      if ((attrs.get('http-equiv') ?? '').toLowerCase() === 'refresh') {
        const target = /url\s*=\s*['"]?([^'"]+)/i.exec(attrs.get('content') ?? '');
        if (target) page.refs.push({ tag, attr: 'content (refresh)', value: target[1], attrs });
      }
    }
    for (const [attr, value] of attrs) {
      if (URL_ATTRS.has(attr) && (attr !== 'data' || tag === 'object')) {
        page.refs.push({ tag, attr, value, attrs, cat: attr === 'href' ? hrefCat : null });
      } else if (attr === 'srcset' || attr === 'imagesrcset') {
        for (const u of splitSrcset(value)) page.refs.push({ tag, attr, value: u, attrs });
      } else if (attr === 'style') {
        for (const u of cssRefs(value)) page.refs.push({ tag: 'css', attr, value: u });
      }
    }
  }
  for (const css of styles) for (const u of cssRefs(css)) page.refs.push({ tag: 'css', attr: 'style', value: u });

  const head = markup.split(/<\/head\s*>/i)[0];
  const title = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head);
  page.title = title ? decodeEntities(title[1]).trim() : null;

  const pageUrl = FAKE_ORIGIN + encodeURI(page.urlPath);
  page.baseUrl = pageUrl;
  if (page.baseHref) {
    try {
      const b = new URL(page.baseHref, pageUrl);
      page.baseUrl = b.origin === cfg.origin ? FAKE_ORIGIN + b.pathname : b.href;
    } catch { /* keep the page URL */ }
  }

  // Placeholder / debug text: visible text and attribute values, code blocks excluded.
  const scan = markup.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const text = decodeEntities(scan.replace(/<[^>]*>/g, ' '));
  const attrText = [...scan.matchAll(TAG_RE)]
    .map((m) => {
      const kept = [...parseAttrs(m[2] ?? '')].filter(([n, v]) => !MARKER_SKIP_ATTRS.has(n) && !/^\s*data:/i.test(v));
      return kept.length ? `<${m[1]} ${kept.map(([n, v]) => `${n}="${v}"`).join(' ')}>` : '';
    })
    .filter(Boolean)
    .join('\n');
  scanMarkers(rel, text, 'text');
  scanMarkers(rel, attrText, 'an attribute');
  for (const s of scripts) {
    const type = (s.attrs.get('type') ?? '').toLowerCase();
    if (type.includes('json')) scanMarkers(rel, s.body, 'JSON-LD/JSON script');
    else scanMarkers(rel, s.body, 'an inline script', ['[object Object]']);
  }
  return page;
}

function scanMarkers(rel, text, origin, only = null) {
  for (const [re, label] of MARKERS) {
    if (only && !only.includes(label)) continue;
    const m = re.exec(text);
    if (m) error('marker', rel, `"${label}" in ${origin}: ${snippet(text, m.index, m[0].length)}`);
  }
}

function checkHead(page) {
  const special = page.rel === ROOT_PAGE || page.rel === NOT_FOUND_PAGE;
  const soft = special ? warn : error;
  if (!page.lang?.trim()) error('head', page.rel, 'missing <html lang>');
  if (!page.title) error('head', page.rel, 'missing or empty <title>');
  if (page.h1 !== 1) soft('head', page.rel, page.h1 === 0 ? 'no <h1>' : `${page.h1} <h1> elements (expected exactly one)`);
  if (page.rel !== NOT_FOUND_PAGE && !page.description?.trim()) soft('head', page.rel, 'missing or empty <meta name="description">');
  if (!special) {
    const expected = cfg.site + page.urlPath;
    if (page.canonicals.length === 0) error('head', page.rel, `missing <link rel="canonical" href="${expected}">`);
    else if (page.canonicals.length > 1) error('head', page.rel, `${page.canonicals.length} canonical links (expected one)`);
    else {
      const href = page.canonicals[0].trim();
      let u = null;
      try { u = new URL(href); } catch { /* not absolute */ }
      if (!u || !/^https?:$/.test(u.protocol)) error('head', page.rel, `canonical "${href}" must be an absolute URL (${expected})`);
      else if (u.origin !== cfg.origin || safeDecode(u.pathname) !== page.urlPath) error('head', page.rel, `canonical "${href}" is not this page's own URL (${expected})`);
    }
  }
  for (const [id, n] of page.ids) if (n > 1) warn('ids', page.rel, `id="${id}" appears ${n} times`);

  const section = SECTIONS.find((s) => page.rel.startsWith(s.dir));
  if (!section) return;
  if (page.lang && page.lang.toLowerCase() !== section.lang.toLowerCase()) {
    error('head', page.rel, `<html lang="${page.lang}">, but pages under ${section.dir} must use lang="${section.lang}"`);
  }
  const other = SECTIONS.find((s) => s.lang.toLowerCase() === section.counterpart.toLowerCase());
  const alt = page.alternates.find((a) => a.hreflang.toLowerCase() === section.counterpart.toLowerCase());
  if (!alt) {
    error('hreflang', page.rel, `missing <link rel="alternate" hreflang="${section.counterpart}"> (the equivalent page under ${other.dir})`);
  } else {
    const r = resolveRef(page, alt.href);
    if (r.kind === 'internal' && r.file) {
      if (!r.file.startsWith(other.dir)) error('hreflang', page.rel, `hreflang="${alt.hreflang}" points to ${r.file}; expected a page under ${other.dir}`);
      else page.altFile = r.file;
    } else if (['external', 'site-outside-base', 'scheme', 'empty'].includes(r.kind)) {
      error('hreflang', page.rel, `hreflang="${alt.hreflang}" href "${alt.href}" is not a page of this site`);
    } // missing targets and base-path problems are reported by checkRefs
  }
  if (!page.alternates.some((a) => a.hreflang.toLowerCase() === 'x-default')) {
    warn('hreflang', page.rel, 'missing <link rel="alternate" hreflang="x-default"> (the root language chooser)');
  }
}

function checkLanguagePairs(pages) {
  const byRel = new Map(pages.map((p) => [p.rel, p]));
  for (const page of pages) {
    if (!page.altFile) continue;
    const target = byRel.get(page.altFile);
    if (target?.altFile && target.altFile !== page.rel) {
      error('hreflang', page.rel, `alternate points to ${page.altFile}, but that page's alternate points to ${target.altFile} instead of back here`);
    }
    const section = SECTIONS.find((s) => page.rel.startsWith(s.dir));
    for (const sw of page.switchers) {
      if (sw.hreflang.toLowerCase() !== section.counterpart.toLowerCase()) continue;
      const r = resolveRef(page, sw.href);
      if (r.kind === 'internal' && r.file && r.file !== page.altFile) {
        error('hreflang', page.rel, `language switch <a hreflang="${sw.hreflang}" href="${sw.href}"> goes to ${r.file}, but the equivalent page is ${page.altFile}`);
      }
    }
  }
}

// ------------------------------------------------------------------ run
const htmlFiles = [...files].filter((f) => f.endsWith('.html')).sort();
if (htmlFiles.length === 0) error('required', '(dist)', `no .html files in ${DIST}`);
for (const f of REQUIRED_FILES) if (!files.has(f)) error('required', f, 'missing from dist');

const pages = [];
for (const rel of htmlFiles) {
  const page = parsePage(rel, await readFile(path.join(DIST, rel), 'utf8'));
  pages.push(page);
  stats.pages++;
}
const idsByFile = new Map(pages.map((p) => [p.rel, p.ids]));
for (const page of pages) {
  checkRefs(page, page.refs);
  checkHead(page);
}
checkLanguagePairs(pages);

for (const rel of [...files].filter((f) => /\.(css|xml|txt)$/i.test(f)).sort()) {
  stats.otherFiles++;
  const content = await readFile(path.join(DIST, rel), 'utf8');
  const src = { rel, isHtml: false, baseUrl: FAKE_ORIGIN + encodeURI(cfg.base + rel) };
  if (rel.endsWith('.css')) {
    checkRefs(src, cssRefs(content).map((value) => ({ tag: 'css', attr: 'url', value })));
    continue;
  }
  scanMarkers(rel, content, 'the file');
  const listed = rel.endsWith('.xml')
    ? [...content.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/gi)].map((m) => ({ tag: 'sitemap', attr: 'loc', value: decodeEntities(m[1]) }))
    : [...content.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => ({ tag: 'robots', attr: 'sitemap', value: m[1] }));
  for (const ref of listed) {
    const r = resolveRef(src, ref.value);
    if (r.kind !== 'internal' || r.style !== 'absolute') {
      error('broken-link', rel, `${describe(ref)} must be an absolute URL under ${cfg.site}${cfg.base}`);
    } else {
      checkRefs(src, [ref]);
    }
  }
}

for (const f of fragmentChecks) {
  stats.fragments++;
  const ids = idsByFile.get(f.file);
  if (ids && !ids.has(f.id)) {
    error('fragment', f.src, `${f.where}: no element with id="${f.id}" ${f.file === f.src ? 'on this page' : `in ${f.file}`}`);
  }
}

if (args.external && externals.size > 0) await checkExternals();

async function checkExternals() {
  const queue = [...externals.keys()];
  const headers = { 'user-agent': 'Mozilla/5.0 (compatible; brskt-space-verify-dist)', accept: '*/*' };
  async function probe(url) {
    let last = '';
    for (const method of ['HEAD', 'GET']) {
      try {
        const res = await fetch(url, { method, headers, redirect: 'follow', signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS) });
        await res.body?.cancel().catch(() => {});
        if (res.ok) return null;
        last = `HTTP ${res.status}`;
      } catch (e) {
        last = e.name === 'TimeoutError' ? `timeout after ${EXTERNAL_TIMEOUT_MS / 1000}s` : (e.cause?.code ?? e.message);
      }
    }
    return last;
  }
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      const failure = await probe(url);
      if (failure) warn('external', externals.get(url), `${url}: ${failure}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(EXTERNAL_CONCURRENCY, queue.length) }, worker));
}

// ------------------------------------------------------------------ output
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const errors = problems.filter((p) => p.level === 'error');
const warnings = problems.filter((p) => p.level === 'warn');

function printGroup(list, label, code) {
  if (list.length === 0) return;
  console.log(`\n${paint(code, `${label} (${list.length})`)}`);
  for (const cat of Object.keys(CATEGORY_TITLES)) {
    const inCat = list.filter((p) => p.cat === cat);
    if (inCat.length === 0) continue;
    console.log(`\n  ${paint('1', CATEGORY_TITLES[cat])} (${inCat.length})`);
    const byFile = Map.groupBy(inCat, (p) => p.file);
    for (const [file, items] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`    ${file}`);
      for (const p of items) console.log(`      - ${p.msg}`);
    }
  }
}

console.log(`verify-dist  dist: ${DIST}  site: ${cfg.site}  base: ${cfg.base}`);
printGroup(errors, 'ERRORS', '31;1');
printGroup(warnings, 'WARNINGS', '33;1');

if (process.env.GITHUB_ACTIONS === 'true') {
  const esc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  for (const p of errors.slice(0, 20)) console.log(`::error title=${esc(`verify-dist: ${CATEGORY_TITLES[p.cat]}`)}::${esc(`${p.file}: ${p.msg}`)}`);
}

const ext = args.external ? `${externals.size} external links checked` : `${externals.size} external links (not fetched; pass --external to check them)`;
console.log(
  `\nSummary: ${stats.pages} pages + ${stats.otherFiles} css/xml/txt files checked, ` +
    `${stats.refs} links checked (${stats.internal} internal to ${internalTargets.size} files, ${stats.fragments} #fragments), ${ext}.`,
);
const verdict = `${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;
console.log(errors.length ? paint('31;1', `FAILED: ${verdict}`) : paint('32;1', `OK: ${verdict}`));
process.exit(errors.length ? 1 : 0);
