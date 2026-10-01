/**
 * Sätteri hast plugin (Astro 7's default Markdown processor): external links in
 * markdown bodies get rel="noopener" plus the same arrow icon and screen-reader
 * hint as <ExternalLink>. The hint language comes from the file name (pt.md / en.md).
 */
const SITE = 'https://brskt-dev.github.io/brskt-space/';
const HINT = { pt: '(link externo)', en: '(external link)' };

const isExternal = (href) => typeof href === 'string' && /^https?:\/\//i.test(href) && !href.startsWith(SITE);

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
        d: 'M4 2h6v6M10 2 2.5 9.5',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
      children: [],
    },
  ],
});

export const externalLinks = {
  name: 'brskt-external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties && node.properties.href;
      if (!isExternal(href)) return;
      const rel = new Set([].concat(node.properties.rel || []));
      rel.add('noopener');
      ctx.setProperty(node, 'rel', [...rel]);
      ctx.appendChild(node, [
        icon(),
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['sr-only'] },
          children: [{ type: 'text', value: ` ${HINT[langOf(ctx.fileURL)]}` }],
        },
      ]);
    },
  },
};
