# brskt-space: notes for AI-assisted edits

Bruno Anhezini's bilingual (PT-BR + EN) portfolio. Astro, fully static, deployed to
https://brskt-dev.github.io/brskt-space/ by `.github/workflows/deploy.yml` on push to `main` (work happens on `dev`, merged via PR).
README.md (Portuguese) is the owner's manual; keep it accurate when structure or commands change.

## Structure
- `src/content/publications/<slug>/{pt,en}.md`: publications (type product | experiment | article | service). Folder name = slug = URL. A `service` (status `available` | `paused`) is listed under Projects; its `landing:` field names the PageKey of its landing, and its page shows the WhatsApp + "see the full proposal" CTAs.
- `src/content/pages/{home,about}/{pt,en}.md`: home and about copy. `src/content/pages/dev-partner/{pt,en}.md`: all the copy of the Dev parceiro landing (`/pt/servicos/dev-parceiro/`, `/en/services/dev-partner/`, `DevPartnerView.astro`); price and term are numbers in `offer` (price box, hero price line, share-image alt, JSON-LD), but they are also written in the copy (description, conditions, FAQ, the dev-parceiro publication) and drawn in `src/assets/og/dev-partner-*.jpg` and the publication's `media/` images: a price change touches all of them (README lists them). `status: paused` on the publication hides the home callout. Commercial facts there are only the ones the owner confirmed: R$ 3.000/month, 6-month contract, one fee for everything, priorities agreed with the client, estimates per demand, remote, companies in Brazil, code and access belong to the client, tool costs paid by the client, few clients at a time (no number), renewal possible. `src/data/profile.ts`: CV facts as `{ pt, en }`.
- Frontmatter strings (title/summary/headline/tagline/availability/story) are not smart-quoted: type ’ directly instead of '.
- `src/i18n/ui.ts`: UI strings, route segments, URL helpers. `src/lib/url.ts`: base-aware URL building.
- Routing: every /pt and /en page comes from `src/pages/[lang]/[...path].astro`, which takes its paths from `getSiteRoutes()` in `src/lib/routes.ts`. The same table feeds `sitemap.xml`. Page bodies live in `src/components/views/*View.astro`. To add a page: add a `PageKey` + `segments` entry in `src/i18n/ui.ts`, a `RouteView` variant + `routes.push` in `getSiteRoutes()`, a view component, and a branch in `[...path].astro`. The nav item in `SiteHeader.astro` is optional. Never create files under `src/pages/pt/` or `src/pages/en/`: they build and pass `npm run verify`, but they are missing from sitemap.xml and the nav.
- `src/lib/publications.ts`: build-time integrity check (throws = build fails). `src/content.config.ts`: zod schemas (dates must be `YYYY-MM-DD`).
- `templates/publication/{pt,en}.md`: templates for new publications (outside `src/`, never built).
- `demos/<name>/`: demo code for articles (e.g. `demos/agent-ready-api`, .NET 10), outside the site build; each has its own README and tests (`dotnet test`). Synthetic data only.
- Articles: reading time is computed from the body (`src/lib/reading-time.ts`), never a frontmatter field.
- Diagrams are real components, never ASCII art: write the publication as `.mdx` and import from `src/components/diagrams/` (`DiagramFrame` = screenshot-ready card with status chip; `DNode` = node, `proposed` = dashed; `Wire` = animated connector). Article-specific diagrams live there too and take a `lang` prop with both languages inside. Code blocks get a terminal frame from `global.css`.
- `BaseLayout` takes optional `ogImage` (page share image, 1200×630; default is the profile photo) and `jsonLd` (schema.org data, rendered as `application/ld+json`, no script runs). The Dev parceiro landing uses both (`src/assets/og/dev-partner-{pt,en}.jpg`, a `Service` with its `Offer`).
- `scripts/verify-dist.mjs`: post-build checks on `dist/` (links, base path, head tags, hreflang, placeholder text).

## Commands
- `npm ci`, `npm run dev` (http://localhost:4321/brskt-space/), `npm run build`.
- `npm run verify` = astro check (types: catches a missing pt/en in `src/i18n/ui.ts` and `src/data/profile.ts`) + build + `scripts/verify-dist.mjs`. Run it before declaring any change done; CI runs the same.
- Never `git push` or change remotes/config unless the owner asks.

## Rules
- **Bilingual, always.** Every page and publication exists in both languages with the same facts and tone
  (natural English, not literal). A publication ships only when both files exist; `type`, `date`, `updated`,
  `status` and `draft` must match. The language switch links to the equivalent page, never to home.
  Sections with no content (e.g. Articles today) have no route and no nav link. On the home (and section
  pages) empty slots are filled with `SkeletonCard` placeholders, which the owner asked for: they carry no
  invented title or text, are `aria-hidden`, and the section says in words that more is coming.
- **No invented facts.** Only facts the owner provided (CV, profile.ts, existing copy). No invented metrics,
  results, clients, stack, testimonials or links; no placeholder links. No seniority labels, emoji, hype,
  or cliches ("apaixonado por tecnologia", "soluções inovadoras", "entregar valor"). First person, short
  sentences. Phone/WhatsApp only on the About page and the Dev parceiro pages (landing + its Projects entry, via `WhatsAppLink.astro`, which counts each CTA as a `whatsapp-<place>-<lang>` GoatCounter event), never in the footer; `verify-dist.mjs` enforces the list. Conta Comigo: content comes from the owner's
  demo overview and the demo's own landing page; screenshots in its `media/` folder are the product's official
  ones (fictional data).
- **Base path.** The site lives under `/brskt-space/`. Never hand-write `/pt/...`, `/en/...` or `/favicon.svg`;
  build every href/src with the helpers (`pathFor`, `publicationUrl`, `alternateUrl`, `urlFor` in
  `src/i18n/ui.ts`; `joinBase`, `assetPath`, `absoluteUrl` in `src/lib/url.ts`). Routes end with `/`.
- **Look & feel (owner's brief).** "Fun dev", community, space theme ("Brskt Space"): Bricolage Grotesque
  (display), Geist (text), JetBrains Mono (code/tags); Lucide icons via `src/components/ui/Icon.astro`;
  generated covers via `Cover.astro`; CSS-only motion (hover/press, slow loops, scroll reveal). Every animation
  must be disabled under `prefers-reduced-motion` (handled globally in `global.css`).
- **Dark only.** No light mode or toggle. Use the CSS tokens in `src/styles/global.css` (`--bg`, `--surface`,
  `--text`, `--muted`, `--accent`, ...); no new hard-coded colors. `--brand` (#4900C7) is decorative only, never
  text on dark (1.97:1). Text must keep WCAG AA contrast; links/focus use `--accent`.
- **Accessibility.** One `h1` per page, semantic landmarks, visible `:focus-visible`, alt text, tap targets
  >= 44px, no horizontal scroll at 360px, external links open in a new tab (`target="_blank" rel="noopener noreferrer"`, via `ExternalLink.astro` or the Markdown plugin).
- Client JS: only the tiny language redirect on the root chooser, the giscus embed (reactions + comments
  on publication pages, `src/components/Reactions.astro`, config in `src/data/giscus.ts`, theme in
  `public/giscus-theme.css`) and GoatCounter analytics (cookieless; script in `BaseHead.astro`, config in
  `src/data/analytics.ts`, external-link clicks counted as `ext-<host>` events via `data-goatcounter-click`).
  The owner chose giscus (GitHub Discussions) because the site has no backend, and GoatCounter for visits.
  Nothing else ships JS.
