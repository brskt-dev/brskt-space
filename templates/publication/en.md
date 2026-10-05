---
# Publication template: ENGLISH version. Its Portuguese pair is pt.md, in this same folder.
#
# How to use:
#   1. Copy pt.md and en.md to src/content/publications/<slug>/
#      The folder name is the slug: it goes into the URL in both languages, e.g.
#      /pt/projetos/<slug>/ and /en/projects/<slug>/. Lowercase letters, digits and hyphens only.
#   2. Fill in both files. type, date, updated, status and draft must be IDENTICAL in pt.md and en.md.
#   3. When both languages are ready, set draft to false in both.
#
# Type (same in both languages):
#   product    → product; listed under Projects (/en/projects/)
#   experiment → experiment; listed under Projects (/en/projects/)
#   article    → technical article; listed under Articles (/en/articles/)
type: product

# Title of the page, the cards and the browser tab.
title: "TODO: publication name"

# One or two sentences. Shown on cards and used as the meta description (search and link previews).
summary: "TODO: one or two sentences on what it is and who it is for."

# Day the publication goes live on the site, as YYYY-MM-DD (same in both languages).
date: 2026-10-01

# Optional: day of the last meaningful update (YYYY-MM-DD). Remove the # to use it (same in both languages).
# updated: 2026-10-15

# Current state (same in both languages). Required for product and experiment.
# For an article, delete this line.
#   product:    in-development | demo | live | paused | archived
#   experiment: in-development | demo | live | paused | archived | running | concluded
status: in-development

# Optional: short keywords, written in this file's language. E.g. ["B2B SaaS", "Onboarding"]
tags: []

# Optional: only links that really exist (live site, repository, demo). Never a provisional link.
# Format: one item per link, for example
#   links:
#     - { label: "Website", url: "https://real-address.com" }
links: []

# Optional: cover image saved in this same folder. Only if the image exists.
# cover: ./cover.png
# Optional: card image (home and listings). Without it, the card uses the cover.
# thumbnail: ./thumb.png

# Optional: highlight numbers (tiles under the title). Real numbers only.
#   stats:
#     - { value: "489", label: "unit tests" }
stats: []

# Optional: tech stack, shown as chips at the end of the page.
#   stack: ["Next.js 16", "NestJS 11", "PostgreSQL 16"]
stack: []

# Optional: screenshot gallery (files in this folder). orientation: landscape (default) or portrait.
#   gallery:
#     - { src: ./screen.webp, alt: "What the screen shows", caption: "Short caption" }
gallery: []

# true  → draft: the publication is left out of the site (in both languages).
# false → published. Must be the same in pt.md and en.md.
draft: true
---

<!--
  Body in Markdown. First person, short sentences, real facts only
  (no metrics, clients or results that do not exist).

  Below is an outline for each type. Keep only the block for your type
  (product, experiment or article), delete the other blocks and delete these comments.

  - Use ## for sections and ### for subsections (the page title is already the h1).
  - Image: save it in the same folder and write ![image description](./image-name.png)
  - Diagram: rename to .mdx and import a component from src/components/diagrams/. Reading time is automatic.
  - Code: a block with three backticks and the language, e.g. ```csharp
-->

<!-- ===== product ===== -->

## The problem

<!-- What situation the product solves, and for whom. -->

## How it works

<!-- The main flow, in a few steps. -->

## Where it stands

<!-- Current phase and next steps. -->

<!-- ===== experiment ===== -->

## The question

<!-- What I wanted to find out. -->

## How I tested it

<!-- Setup, tools and comparison criteria. -->

## What I observed

<!-- Measured results only. If there are none yet, say the experiment is still running. -->

## Conclusions

<!-- What changes in practice because of this. -->

<!-- ===== article ===== -->

## Context

<!-- The scenario and why the topic matters. -->

## What I did

<!-- The solution, with code snippets where they help. -->

## What I learned

<!-- Trade-offs and what I would do differently. -->
