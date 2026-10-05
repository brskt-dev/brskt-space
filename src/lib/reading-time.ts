/**
 * Estimated reading time of a markdown body, in whole minutes (min 1).
 * Computed from the text, so it never goes stale. ~200 words/minute; code blocks
 * count too (technical readers do read them).
 */
const WORDS_PER_MINUTE = 200;

export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\]\([^)]*\)/g, ']') // link targets are not read
    .replace(/[#>*_`|~\-]+/g, ' ');
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
