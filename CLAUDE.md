# brskt-space: notes for AI-assisted edits

Bruno Anhezini's bilingual (PT-BR + EN) portfolio. Astro, fully static, deployed to
https://brskt-dev.github.io/brskt-space/ by `.github/workflows/deploy.yml` on push to `dev`.
README.md (Portuguese) is the owner's manual; keep it accurate when structure or commands change.

## Structure
- `src/content/publications/<slug>/{pt,en}.md`: publications (type product | experiment | article). Folder name = slug = URL.
- `src/content/pages/{home,about}/{pt,en}.md`: home and about copy. `src/data/profile.ts`: CV facts as `{ pt, en }`.
- Frontmatter strings (title/summary/tagline/availability/focus) are not smart-quoted: type ’ directly instead of '.
- `src/i18n/ui.ts`: UI strings, route segments, URL helpers. `src/lib/url.ts`: base-aware URL building.
- Routing: every /pt and /en page comes from `src/pages/[lang]/[...path].astro`, which takes its paths from `getSiteRoutes()` in `src/lib/routes.ts`. The same table feeds `sitemap.xml`. Page bodies live in `src/components/views/*View.astro`. To add a page: add a `PageKey` + `segments` entry in `src/i18n/ui.ts`, a `RouteView` variant + `routes.push` in `getSiteRoutes()`, a view component, and a branch in `[...path].astro`. The nav item in `SiteHeader.astro` is optional. Never create files under `src/pages/pt/` or `src/pages/en/`: they build and pass `npm run verify`, but they are missing from sitemap.xml and the nav.
- `src/lib/publications.ts`: build-time integrity check (throws = build fails). `src/content.config.ts`: zod schemas (dates must be `YYYY-MM-DD`).
- `templates/publication/{pt,en}.md`: templates for new publications (outside `src/`, never built).
- `scripts/verify-dist.mjs`: post-build checks on `dist/` (links, base path, head tags, hreflang, placeholder text).

## Commands
- `npm ci`, `npm run dev` (http://localhost:4321/brskt-space/), `npm run build`.
- `npm run verify` = astro check (types: catches a missing pt/en in `src/i18n/ui.ts` and `src/data/profile.ts`) + build + `scripts/verify-dist.mjs`. Run it before declaring any change done; CI runs the same.
- Never `git push` or change remotes/config unless the owner asks.

## Rules
- **Bilingual, always.** Every page and publication exists in both languages with the same facts and tone
  (natural English, not literal). A publication ships only when both files exist; `type`, `date`, `updated`,
  `status` and `draft` must match. The language switch links to the equivalent page, never to home.
  Sections with no content (e.g. Articles today) have no route and no nav link; no "coming soon".
- **No invented facts.** Only facts the owner provided (CV, profile.ts, existing copy). No invented metrics,
  results, clients, stack, testimonials or links; no placeholder links. No seniority labels, emoji, hype,
  or cliches ("apaixonado por tecnologia", "soluções inovadoras", "entregar valor"). First person, short
  sentences. Phone/WhatsApp only on the About page, never in the footer. Conta Comigo: no stack, no links.
- **Base path.** The site lives under `/brskt-space/`. Never hand-write `/pt/...`, `/en/...` or `/favicon.svg`;
  build every href/src with the helpers (`pathFor`, `publicationUrl`, `alternateUrl`, `urlFor` in
  `src/i18n/ui.ts`; `joinBase`, `assetPath`, `absoluteUrl` in `src/lib/url.ts`). Routes end with `/`.
- **Dark only.** No light mode or toggle. Use the CSS tokens in `src/styles/global.css` (`--bg`, `--surface`,
  `--text`, `--muted`, `--accent`, ...); no new hard-coded colors. `--brand` (#4900C7) is decorative only, never
  text on dark (1.97:1). Text must keep WCAG AA contrast; links/focus use `--accent`.
- **Accessibility.** One `h1` per page, semantic landmarks, visible `:focus-visible`, alt text, tap targets
  >= 44px, no horizontal scroll at 360px, external links with `rel="noopener"`.
- Zero client JS except the tiny language redirect on the root chooser.
