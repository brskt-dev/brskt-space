/**
 * Sätteri hast plugin (Astro 7's default Markdown processor): external links in
 * markdown bodies open in a new tab (target="_blank", rel="noopener noreferrer") and get the same arrow icon and screen-reader
 * hint as <ExternalLink>. The hint language comes from the file name (pt.md / en.md).
 */

/** Screen-reader hint for links that leave the site (also used by ui.ts 'a11y.external'). */
export const EXTERNAL_HINT = { pt: '(abre em nova guia)', en: '(opens in a new tab)' };
/** Path of the external-link arrow icon (also used by ExternalLink.astro). */
export const EXT_ICON_PATH = 'M4 2h6v6M10 2 2.5 9.5';

function langOf(fileURL) {
  const m = /\/(pt|en)\.mdx?$/i.exec(fileURL ? fileURL.pathname : '');
  return m ? m[1].toLowerCase() : 'en';
}

const icon = () => ({
  type: 'element',
  tagName: 'svg',
  properties: { className: ['ext-icon'], viewBox: '0 0 12 12', ariaHidden: 'true', focusable: 'false' },
  children: [
    {
      type: 'element',
      tagName: 'path',
      properties: {
        d: EXT_ICON_PATH,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
      children: [],
    },
  ],
});

/** @param {string} siteUrl absolute site URL including the base, ending in '/' */
export const externalLinks = (siteUrl) => ({
  name: 'brskt-external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties && node.properties.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href) || href.startsWith(siteUrl)) return;
      const rel = new Set([].concat(node.properties.rel || []));
      rel.add('noopener');
      rel.add('noreferrer');
      ctx.setProperty(node, 'rel', [...rel]);
      ctx.setProperty(node, 'target', '_blank');
      ctx.appendChild(node, [
        icon(),
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['sr-only'] },
          children: [{ type: 'text', value: ` ${EXTERNAL_HINT[langOf(ctx.fileURL)]}` }],
        },
      ]);
    },
  },
});
