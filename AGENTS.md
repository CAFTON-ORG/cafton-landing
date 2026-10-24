# Agent guide

Cafton's public website and its internal operating system (CMS, CRM, later sales, delivery,
finance, HR) are **one Next.js 16 app** (App Router, Server Components, Server Actions,
Prisma 7 on Supabase Postgres, Supabase Auth and Storage). Read `CONTEXT.md` for the
vocabulary, `docs/ARCHITECTURE.md` for the whole picture, `docs/ROADMAP.md` for what is done
and next, and the ADRs in `docs/adr/` before changing structure.

## Layout

```
prisma/                     schema.prisma and migrations (never edit an applied one)
src/
├── app/
│   ├── (marketing)/        the public site (URLs and look must not change by accident)
│   ├── (auth)/login/       staff sign-in
│   ├── dashboard/          the internal system: noindex, its own layout
│   └── api/                public form endpoints only
├── components/
│   ├── ui/                 Radix shadcn primitives: public site only
│   ├── marketing/          public-site UI
│   ├── dashboard/          dashboard UI: ui/ (Base UI base-nova), layout/, data-table/, shared/
│   └── shared/             neutral ground: imports neither surface
├── features/<domain>/      types, schemas, rules, repository/, services/, actions/, components/ (ADR 0024; copy features/_template)
├── config/                 site.ts, navigation, dashboard-navigation.ts, services.ts, values.ts
└── lib/                    framework-level helpers: env, db, auth/, security/, seo
```

## Rules that matter

- **Public site first.** Do not change how the public site looks unless the task says so.
  Prove it with `npm run snapshot:save` / `snapshot:check` (CONTRIBUTING step 4).
- **Content comes from the database** with the bundled content as fallback (`features/cms`).
  New editable content follows ADR 0007: seed, repository with fallback, round-trip test.
- **Every mutation:** `requirePermission()` → Zod parse → transaction → audit entry →
  `revalidatePath`. The proxy is only an optimistic redirect; authorisation lives in
  `lib/auth/dal.ts` and runs on every page and action.
- **Business rules** live once in a feature's `rules.ts` (or `rules/`), used by UI and server, unit tested.
- **Components never touch the database** and never import across surfaces (ESLint enforces
  it). No `dangerouslySetInnerHTML` (ESLint error); user-supplied links and images go through
  the safe validators in `lib/security`.
- **Money** is integer minor units plus a currency code, never a float. **Deletion** is soft
  for business records. Finance records are voided, not deleted.
- **Dashboard UI:** status colours only through `StatusBadge`; list pages use `ResourceTable`
  with URL-driven params; people use `UserAvatar` (circle), things use `Thumbnail` (rounded
  square); long forms use tabs, and every tab bar is the one pill style (`Tabs` or `SegmentedNav`, with `TabCount` badges), never an underline style; the shell is one screen tall and `MainScroll` is the only
  scroll area (never give the dashboard `<main>` a global `min-height`).
- **Dashboard layout of a card:** a card's buttons go in `CardAction` inside `CardHeader` (title and
  optional description on the left, buttons top right; `stackOnPhone` for a wide group). Never
  `flex-row` on `CardHeader`: it is a grid, so that class does nothing and the buttons drop under
  the title. A **management page** (templates, catalog, pipelines) puts its one primary "New ..."
  button right-aligned above the list card (`flex justify-end`), the list inside one `Card` with
  `CardContent className="p-0"` and `divide-y` rows of `px-4 py-3`, and the empty state inside
  the card carrying the same button. A **panel on a record** (quotes, team, tasks) is a card whose
  header holds the title and its small outline "Add ..." button.

- **Finance screens** read like an accounting package. A list opens with a summary strip (what is owed,
  late, paid), then status tabs with counts, then the table. Amounts always go through `Money` in a
  right-aligned column (a negative in parentheses and red), and a due date carries a `DueHint` ("12
  days overdue"). A document page (invoice, bill, expense) opens with `DocumentSummary` (the amount
  owed, how late, the key facts), shows the one main next step as a button, puts everything else under
  `MoreActions` (a dialog opened from that menu is controlled and rendered outside it, because the menu
  takes its children away when it closes), and ends with a `History` timeline. Finance records are
  voided with a reason, never deleted.

## Commands

`npm run dev` · `npm run verify` (format, lint, typecheck, unit and integration tests, build)
· `npm run e2e` after a build · `npm run design:review` for dashboard UI changes (see the
header of `scripts/design-review.mjs`) · `npm run db:local` for an in-memory Postgres.

## Git

Branch per feature or phase step. Commit only when asked. Never push. Never add AI
attribution lines to commits or pull requests.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
