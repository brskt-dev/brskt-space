// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { externalLinks } from './src/lib/markdown-external-links.mjs';

// Deployed as a GitHub Pages project site: https://brskt-dev.github.io/brskt-space/
// Custom domain: change SITE (and BASE to '/') here and in scripts/verify-dist.mjs.
const SITE = 'https://brskt-dev.github.io';
const BASE = '/brskt-space';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  output: 'static',
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
