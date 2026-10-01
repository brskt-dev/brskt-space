// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { externalLinks } from './src/lib/markdown-external-links.mjs';

// Deployed as a GitHub Pages project site: https://brskt-dev.github.io/brskt-space/
export default defineConfig({
  site: 'https://brskt-dev.github.io',
  base: '/brskt-space',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    // Astro 7 default processor (Sätteri) + one hast plugin for external links.
    processor: satteri({ hastPlugins: [externalLinks] }),
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
});
