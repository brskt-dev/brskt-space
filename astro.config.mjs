// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import { externalLinks } from './src/lib/markdown-external-links.mjs';

// Deployed as a GitHub Pages project site with a custom domain: https://brskt.dev/
// (the old https://brskt-dev.github.io/brskt-space/ URLs redirect here).
// Keep SITE and BASE in sync with scripts/verify-dist.mjs.
const SITE = 'https://brskt.dev';
const BASE = '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  output: 'static',
  // MDX: publications may use .mdx to embed components (e.g. animated diagrams).
  // It extends the markdown config, so the external-links plugin applies too.
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
  markdown: {
    // Astro 7 default processor (Sätteri) + one hast plugin for external links.
    processor: satteri({ hastPlugins: [externalLinks(new URL(BASE.replace(/\/?$/, '/'), SITE).href)] }),
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
});
