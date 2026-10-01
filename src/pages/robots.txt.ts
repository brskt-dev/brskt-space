import type { APIRoute } from 'astro';
import { absoluteUrl, assetPath } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const sitemap = absoluteUrl(assetPath('sitemap.xml'), site ?? 'https://brskt-dev.github.io');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
