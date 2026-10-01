import type { APIRoute } from 'astro';
import { htmlLang, LANGS, rootUrl } from '../i18n/ui';
import { getSitemapEntries } from '../lib/routes';
import { absoluteUrl } from '../lib/url';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? 'https://brskt-dev.github.io';
  const abs = (p: string) => esc(absoluteUrl(p, origin));
  const entries = await getSitemapEntries();

  const alternates = (urls: Record<string, string>) =>
    [
      ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${htmlLang[l]}" href="${abs(urls[l])}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(rootUrl())}"/>`,
    ].join('\n');

  const urlNodes = entries.flatMap(({ urls, lastmod }) =>
    LANGS.map(
      (l) =>
        `  <url>\n    <loc>${abs(urls[l])}</loc>\n${lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` : ''}${alternates(urls)}\n  </url>`,
    ),
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${abs(rootUrl())}</loc>
  </url>
${urlNodes.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
