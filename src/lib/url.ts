/**
 * Low-level URL building. Everything that ends up in an href/src goes through here
 * so the base path (astro.config `base`, "/" with the custom domain) is never forgotten.
 */

/** Site origin (astro.config `site`). */
export const SITE_ORIGIN = 'https://brskt.dev';

/** Base path, always with leading and trailing slash: "/" (or "/<base>/" under a project path). */
export const BASE: string = (() => {
  const raw = import.meta.env.BASE_URL || '/';
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
})();

const clean = (part: string) => part.replace(/^\/+|\/+$/g, '');

/**
 * Join path segments under the base and end with a trailing slash (directory route).
 * joinBase() → "/"; joinBase('pt','sobre') → "/pt/sobre/".
 * Empty segments are ignored.
 */
export function joinBase(...parts: string[]): string {
  const path = parts.map(clean).filter(Boolean).join('/');
  return path ? `${BASE}${path}/` : BASE;
}

/** URL of a file in public/ (no trailing slash). assetPath('favicon.svg') → "/favicon.svg". */
export function assetPath(file: string): string {
  return `${BASE}${clean(file)}`;
}

/** Absolute URL (canonical, og:url, sitemap). Accepts a path that already includes the base. */
export function absoluteUrl(path: string, site: URL | string = SITE_ORIGIN): string {
  return new URL(path, site).href;
}

/** True for http(s) links that leave the site. */
export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) && !href.startsWith(`${SITE_ORIGIN}${BASE}`);
}
