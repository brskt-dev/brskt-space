---
type: product
title: "Conta Comigo"
summary: "A guided checklist for marketing agencies to collect access from their clients. The agency builds it, sends a link and tracks it item by item; the client fills it in without creating an account."
date: 2026-10-01
status: demo
tags: ["B2B SaaS", "Client onboarding", "Multi-agent", "Public demo"]
cover: ./media/request-detail-en.webp
links:
  - { label: "Open the demo", url: "https://contacomigo-demo.vercel.app/en" }
stats:
  - { value: "R$ 0", label: "a month to keep the demo running" }
  - { value: "57", label: "documented product decisions" }
  - { value: "7", label: "areas in the multi-agent run" }
  - { value: "489", label: "unit tests" }
  - { value: "147", label: "integration tests" }
  - { value: "46/46", label: "Playwright E2E tests" }
gallery:
  - src: ./media/request-detail-en.webp
    alt: "Request detail in the agency area: progress completed by the client and confirmed by the agency, items with their status and the client link."
    caption: "Request detail: completed by the client and confirmed by the agency are tracked separately."
  - src: ./media/portal-en.webp
    alt: "Client portal on a phone: agency branding, request title, a warning never to share passwords and the checklist progress."
    caption: "The client portal on a phone, no account needed."
    orientation: portrait
  - src: ./media/builder-en.webp
    alt: "Builder: publishing status, autosave, a Publish changes button and the request structure with sections and items."
    caption: "The builder: sections, items and changes published to the same link."
  - src: ./media/templates-en.webp
    alt: "Gallery of official templates, each showing its number of items and sections."
    caption: "Official templates to start from."
stack:
  - "pnpm 10 + Turborepo"
  - "TypeScript 6"
  - "Next.js 16 (App Router)"
  - "React 19"
  - "NestJS 11"
  - "Prisma 7"
  - "PostgreSQL 16"
  - "Zod 4"
  - "Clerk"
  - "TanStack Query 5"
  - "React Hook Form"
  - "dnd-kit"
  - "Tailwind 4 + shadcn/ui"
  - "next-intl 4"
  - "Sentry 10"
  - "Resend"
  - "S3 (B2/MinIO)"
  - "Jest 30"
  - "Vitest 4"
  - "Playwright 1.56"
---

## The pain

Before a marketing agency can start working with a client, it needs a whole bunch of access: ad accounts, Analytics, the domain, social media. Without a central place, the instructions and the tracking of what's already been granted end up scattered.

## The idea

A guided checklist, in four steps:

1. **The agency builds the checklist**, from an official template or from scratch.
2. **It sends a link.** Each request has a secret link, and the client only sees that request.
3. **The client fills it in at their own pace.** Answers save automatically, screenshots can be attached when they help, and the client submits for review when done.
4. **The agency checks and records it.** It confirms the item or sends it back with a reason. "Completed by the client" and "confirmed by the agency" are different statuses.

## What's in V1

### For the agency

- Checklist builder with sections, items, 7 field types, conditions and drag and drop (keyboard included).
- Its own templates, official templates and a library of blocks.
- Requests per client, with changes published to the same link.
- Item-by-item review, comments, internal notes and history.
- Analytics, members, invites and the agency's branding on the portal.

### For the client

- A portal behind a secure link, no account needed.
- Autosave and progress that's always visible.
- Image uploads as evidence and a help request on each item.
- Everything in PT-BR and EN.

## What it doesn't do, on purpose

It's a checklist, not automation:

- It doesn't grant, detect or verify access. The agency checks on the platform and records it in Conta Comigo.
- It never asks for passwords: the steps follow each platform's official invites.
- It doesn't connect to Google, Meta or any other marketing platform accounts.

## How it was built

The spec has **57 decisions and 10 product rules** documented. V1 came out of a multi-agent run: a lead integrating seven areas, Foundation, Builder, Content, Client Portal, Ops, Public and QA.

## Architecture

```text
Browser ──pages──▶ Vercel (Next.js 16)
   │                  │ rewrite /api/v1 (same origin, secure cookies)
   │                  ▼
   │           Render (1 Free service)
   │           ├─ NestJS 11 API ──SQL──────────▶ Neon (PostgreSQL 16)
   │           └─ worker ──email queue─────────▶ Neon
   │                └──emails (allowlist)──────▶ Resend
   ├──login──▶ Clerk ◀──validates the session── API
   └──upload/download (signed URL)──▶ Backblaze B2 (S3) ◀──signs URLs── API
Web and API ──errors──▶ Sentry
GitHub Actions ──CI · migrations · demo reset──▶ Neon
```

- The browser only talks to Vercel. `/api/v1` calls are forwarded to the API.
- Files go straight from the browser to B2, through signed URLs.
- The worker runs in the same service as the API.
- Deploys ship from the `main` branch.

## All on free tiers

| Piece | Service | Note |
|---|---|---|
| Web | Vercel Hobby | built with the demo flag |
| API + worker | Render Free | two processes in one service; sleeps when idle |
| Database | Neon Free | suspends itself when idle |
| Files | Backblaze B2 | 10 GB free, private bucket |
| Login | Clerk (development) | open sign-up |
| Email | Resend Free | only delivers to the founder |
| Errors | Sentry Developer | no user data |
| CI and data | GitHub Actions | manual workflows with confirmation |

## Built to be a demo

- **Explicit environments.** The `DEPLOY_ENV` variable separates local, staging and production. Staging requires development Clerk and an email allowlist, production rejects test keys, and a startup error names the variable and the reason, never the value.
- **Email only to the right people.** The worker drops any recipient outside the allowlist before it reaches the provider.
- **Invisible to search engines.** `robots.txt` blocking everything, an empty sitemap and a `noindex` header on every response.
- **API and worker on one free service.** A launcher starts both processes; if one dies, the service restarts.
- **Demo data through the real API routes.** A fictional agency with 6 clients, 5 templates, 2 blocks and 8 requests in every state, with history spread over weeks to feed the analytics. The portal link stays the same across resets and the email queue is muted.
- **Reset with safety locks.** A typed confirmation, only from `main` and only on a database with "demo" in its name. The daily reset is optional.
- **Open sign-up, view-only agency.** On staging, non-members can read any agency and get a `403 (DEMO_READ_ONLY)` on any write, and nobody can create an agency. In the UI: a banner at the top, hidden actions and locked editors with no autosave. Outside staging, nothing changes.
- **Slip-proof configuration.** URLs must start with `https://` and the error message shows the expected format. The web build fails if the storage address is invalid; before that, uploads and images would break in the browser with no warning.
- **CI back to green.** The MinIO image stopped being public and was replaced by Chainguard's, in CI and in the local environment.

## Security and privacy

- Rules and authorization live only in the API. The web app never touches the database.
- **Portal link:** the token is stored only as a hash and an encrypted copy (AES-256-GCM). It becomes a session in an `HttpOnly` cookie, scoped to the portal path. Changes require a valid origin and an anti-CSRF header.
- Logs carry no request bodies, tokens, cookies, login headers or signed URLs.
- Sentry with data collection off, URLs without parameters, no session replay and no performance tracing.
- Staging-only secrets, kept only in the dashboards. Outside staging, non-members get a generic 404.

## Quality

- **489 unit tests:** shared 121, content 126, API 75 and web 167.
- **147 integration tests** in 20 suites, with real Postgres, MinIO and Mailpit.
- **46 of 46 E2E tests** with Playwright, in two full runs, including a WCAG A/AA accessibility audit in light and dark themes.
- Green CI on GitHub Actions: lint, typecheck, unit, integration, E2E and build.
- Visual check of the visitor experience: 15 screens, with no write attempt leaving the page.

## Behind the deploy: 6 real stumbles

1. **The seed failed with `S3_ENDPOINT: Invalid URL`.** The B2 dashboard shows the endpoint without `https://`. The value was fixed and the validation got a clear message.
2. **The API didn't start on Render.** The service had been created with no environment variables at all.
3. **Vercel wasn't deploying anything.** On the Hobby plan with a private repo, it blocks commits whose author isn't the account owner, and the commits came from automation. One commit by the owner unblocked it.
4. **The Vercel build failed, on purpose.** The new guard caught the same endpoint without `https://`.
5. **Login stuck on "Loading your space…".** Vercel gave the project a different domain, and the API only accepts sessions from the configured one. Attaching the expected domain to the project fixed it.
6. **Sentry rejected events (`403 ProjectId`).** The DSN mixed one project's key with another project's number. Copying it again fixed it.

## Cost and limits

- **R$ 0 a month.**
- Render sleeps after 15 min without traffic and wakes up in about 1 min, with a 750 h/month limit.
- Neon sleeps after 5 min idle and wakes up in seconds, with a 100 CU-hour/month limit. That's why the API doesn't stay awake all day.
- Other limits: B2 with 10 GB, development Clerk with 100 users, Resend with 100 emails a day and Vercel Hobby for personal use only.

> If the demo takes a moment to respond, that's the API waking up on Render. Give it about a minute.

## Mission status

Public demo live, with fictional data: create an account and explore an agency in read-only mode.
