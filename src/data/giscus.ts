/**
 * Giscus: reactions + comments on each project/article page, stored as GitHub
 * Discussions in this repository (https://giscus.app). One discussion per
 * publication slug, shared by the PT and EN pages.
 *
 * The widget only renders when `categoryId` is filled in, so the site never ships
 * a half-configured embed. To (re)configure: enable Discussions on the repo,
 * install the giscus GitHub App on it, then copy the ids shown at https://giscus.app.
 */
export const giscus = {
  repo: 'brskt-dev/brskt-space',
  repoId: 'R_kgDOU2HOYw',
  category: 'Announcements',
  /** Empty = widget disabled. */
  categoryId: '',
} as const;

export const giscusEnabled = (giscus.categoryId as string).length > 0;
