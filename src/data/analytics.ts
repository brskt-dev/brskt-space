/**
 * GoatCounter: privacy-friendly visit counter (https://www.goatcounter.com).
 * No cookies and no personal data, so the site needs no consent banner.
 *
 * The script only ships when `code` is filled in, so the site never loads a
 * half-configured counter. `code` is the subdomain chosen at sign-up: for
 * https://brskt.goatcounter.com the code is 'brskt'. The dashboard lives at that URL.
 *
 * Besides page views, clicks on external links (LinkedIn, GitHub, demos) are counted
 * as events named `ext-<host>` (see ExternalLink.astro and the Markdown plugin).
 * count.js ignores localhost, so `npm run dev` / `preview` never count.
 */
export const goatcounter = {
  /** Empty = analytics disabled. */
  code: '',
} as const;

export const analyticsEnabled = (goatcounter.code as string).length > 0;
export const goatcounterEndpoint = `https://${goatcounter.code}.goatcounter.com/count`;
