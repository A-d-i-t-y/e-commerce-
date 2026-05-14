# EverShop Core — Project Instructions for Claude

This is the **EverShop core repository** — the codebase for the modular monolith eCommerce platform built on Express + React (SSR) + PostgreSQL + GraphQL. The package source lives at `packages/evershop/src/` and is published as `@evershop/evershop`.

The author and maintainer is The Nguyen (`support@evershop.io`). Assume deep familiarity with the codebase.

## Read the wiki first

A curated wiki for this codebase lives in `wiki/`. **Before answering architectural questions or making non-trivial changes, read the relevant wiki page(s)**, not just the docs in `../docs/` or the source code. The wiki is hand-curated to be the fastest source of truth for "how does this actually work" questions.

- `wiki/index.md` — catalog of all pages with one-line summaries. Read this first to find the right page.
- `wiki/log.md` — chronological record of ingests, queries, and audits.
- `wiki/<topic>.md` — the content pages.

If a page doesn't exist for the topic you need, that's a signal to **ingest** (see Operations below).

## Operations

### Query

When the user asks a question that the wiki could answer:

1. Open `wiki/index.md` and find candidate pages.
2. Read those pages.
3. Answer using the wiki content. Cite pages by filename (e.g., "see `wiki/widgets.md`") so the user can jump in.
4. If the wiki content is **outdated relative to the code** (rename, removal, signature change), update the wiki page in the same response and append a note to `wiki/log.md`.

### Ingest

When the user explains something non-obvious about the codebase, or when you investigate an unfamiliar subsystem and the answer is worth keeping:

1. Discuss the takeaways with the user inline (don't go silent for minutes writing files).
2. Decide whether the knowledge belongs on an existing page or warrants a new one. Prefer updating existing pages — a page with five short sections beats five tiny pages.
3. Write/update the page using the conventions below.
4. Update `wiki/index.md` if a new page was added or a description changed.
5. Append a one-line entry to `wiki/log.md` with prefix `## [YYYY-MM-DD] ingest | <topic>`.

### Lint

When asked to audit the wiki, or when you notice drift while answering questions:

- Verify file paths and line references still resolve (they decay as files move).
- Check that named functions/flags/files referenced in the wiki still exist (`grep`, `Read`).
- Reconcile contradictions between pages.
- Flag pages that haven't been touched in a long time *and* describe an area that has clearly evolved (use `git log --oneline -- <path>` to spot churn).
- Append a `## [YYYY-MM-DD] lint | <scope>` entry to `wiki/log.md` summarizing what was checked and what changed.

## Page conventions

Every page follows this shape:

```md
# <Title>

**TL;DR.** One paragraph. The thing the user came here to learn, said directly.

## <Section>

Body. Code snippets go in fenced blocks with the language tag. File references use `relative/path:line` format so the user can click into them.

## See also
- [Other page](other-page.md) — one-line hook
```

Specifics:

- **File paths.** Always relative to the package root (`packages/evershop/src/...`) unless the file lives outside that tree. Add `:line` suffix when pointing at a specific implementation.
- **Code samples.** Prefer real, compilable snippets pulled from the codebase over invented examples. If you must invent, mark it clearly.
- **No marketing.** No "powerful", "robust", "comprehensive". Just what it is and how it works.
- **Be willing to contradict the public docs.** If `../docs/` is wrong, the wiki should say so and explain the actual current behavior.
- **Date format.** ISO `YYYY-MM-DD` everywhere.

## EverShop quick reference

For deep understanding, read the wiki pages. This section is the cheat sheet.

### Stack
- **Runtime:** Node.js ≥ 20, Express, React 18 with SSR + hydration
- **Database:** PostgreSQL 13+ (no other DBs supported; SQL is plain Postgres)
- **GraphQL:** schema assembled at startup from per-module `.graphql` files
- **Bundler:** webpack 5 with SWC for transforms (no Babel)
- **Forms:** react-hook-form (wrapped by `components/common/form/Form.tsx`)
- **Styling:** Tailwind v4 + PostCSS + custom plugins

### Application type
Multi-page application (MPA) — each route gets its own bundle and a full HTML response. Hydrated on the client. Not a SPA — there is no client-side router.

### File / folder conventions
- **Migrations:** `Version-X.Y.Z.ts` (hyphen, not underscore) in `<module>/migration/`
- **Routes:** folder name = route ID, alphabetic only (a-z, A-Z), `route.json` declares the route
- **Middleware:** lowercase first letter, bracket-syntax ordering `[after]name[before].ts`
- **Master components:** uppercase first letter, `.tsx`, optional `export const layout = { areaId, sortOrder }`
- **Shared between routes:** folder named `routeA+routeB/` (e.g. `productEdit+productNew/`)
- **Site-wide middleware:** `pages/admin/all/`, `pages/frontStore/all/`, `pages/global/`, `api/global/`
- **Subscribers:** `subscribers/<event_name>/<handler>.ts`
- **Modules:** core in `packages/evershop/src/modules/`, user extensions in `extensions/` (project root)
- **Module ID:** must be unique across the system

### Bootstrap is a hard wall
The hook system and registry are **locked** after every module's `bootstrap.ts` runs. Calling `addProcessor`, `hookBefore`, `hookAfter`, `registerWidget`, `registerJob`, `registerEmailService`, `registerPaymentMethod`, etc. from inside a middleware or request handler **throws**. Always register from `bootstrap.ts`.

### Public import paths
See `wiki/reference.md` for the full table. The most common ones:

```ts
import { select, insert, update, del, insertOnUpdate } from '@evershop/evershop/lib/postgres/query';
import { pool, getConnection } from '@evershop/evershop/lib/postgres';
import { addProcessor, getValue } from '@evershop/evershop/lib/util/registry';
import { hookBefore, hookAfter, hookable } from '@evershop/evershop/lib/util/hookable';
import { emit } from '@evershop/evershop/lib/event';
import { createSubscriber } from '@evershop/evershop/lib/event/subscriber';
import { buildUrl, buildAbsoluteUrl } from '@evershop/evershop/lib/router';
import { registerWidget } from '@evershop/evershop/lib/widget';
import { setContextValue, getContextValue } from '@evershop/evershop/graphql/services';
```

### Common pitfalls
- `import { Request, Response } from 'express'` — wrong. Use `EvershopRequest`/`EvershopResponse` from `@evershop/evershop/types/request` and `types/response`.
- `module.exports` — wrong. ESM. Use `export default`.
- MySQL syntax — wrong. PostgreSQL. Use `IDENTITY` or `SERIAL`, double-quoted identifiers, `JSONB`, `gen_random_uuid()`.
- `migrations/` (plural) folder — wrong. Singular `migration/`.
- `Version_1.0.0.ts` (underscore) — wrong. Hyphen: `Version-1.0.0.ts`.
- `pages/frontend/` — wrong. `pages/frontStore/`.
- Arrow functions in hookable / processor callbacks when context is needed — `this` is bound via `.call()`, arrow functions can't access it.
- Adding a hook or processor from a middleware — locked after bootstrap, throws.

## Doing work in this repo

- The published package is built from `src/` to `dist/` via SWC (`npm run compile`). Runtime loads `.js` from `dist/`. When editing, edit `.ts` in `src/`.
- Tests run with Jest: `npm test` from the repo root.
- Lint with `npm run lint`.
- Dev server: `npm run dev` (uses `webpack-dev-middleware` + HMR).
- Build for production: `npm run build` then `npm run start`.
- Never bypass `husky` hooks (`--no-verify`) or skip type/lint failures without an explicit go-ahead.
