# Cafton Platform Architecture

Status: proposed, 2026-10-21. Decisions marked **[decided]** were confirmed by the product owner; the rest are recommendations to review before Phase 0 starts.

Cafton's public website and its internal operating system (CMS, CRM, sales, delivery, finance, HR) ship as **one Next.js app**. The public site keeps its current design untouched. The internal system is added beside it under `/dashboard`.

## Decisions

| #   | Decision          | Choice                                                                                                                                    | Source                             |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Placement         | Same app, admin under `/dashboard`                                                                                                        | **[decided]**                      |
| 2   | Architecture mode | Monolith (template ADR 0005): Server Components read through repositories, Server Actions write                                           | **[decided]**                      |
| 3   | Data              | Postgres through Prisma 7 (`@prisma/adapter-pg`)                                                                                          | follows from 2, matches artist-app |
| 4   | Auth              | Supabase Auth, Google sign-in, invite-only, DB-backed RBAC; Supabase Storage for files                                                    | **[decided]**                      |
| 5   | UI primitives     | Landing stays on Radix `components/ui`. Dashboard uses shadcn `base-nova` (Base UI) in `components/dashboard/ui`                          | **[decided]**                      |
| 6   | Tenancy           | Single tenant (Cafton). Keep `workspace_id` out of the schema for now; artist-app's MULTI-TENANCY-PLAN shows the later cost is manageable | recommended                        |
| 7   | Money             | Integer minor units + ISO currency code on every amount. Never floats                                                                     | recommended                        |
| 8   | Deletion          | Soft delete (`deletedAt`) on business records; hard delete only for drafts. Finance records are never deleted, only voided/reversed       | recommended                        |

## What we take from each source

| Source                      | We adopt                                                                                                                                                                                                                                                                                              | We do not adopt                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates/nextjs-template` | Feature-slice layout (ADR 0002), monolith wiring (`server/repositories`, `queries.ts`, `actions.ts`), dashboard shell (sidebar, app bar, command palette, breadcrumbs, one `navigation.ts`), URL-driven `DataTable`, CSP helper, env validation, Vitest + Playwright + axe, `verify` script, Prettier | Its landing page, theme tokens, `features/auth` API/OTP flow, the `/api/[...path]` proxy (no external API), pnpm migration (stay on npm unless you ask) |
| `projects/artist-app`       | Proven auth + DAL + RBAC + audit pattern, Prisma + Supabase wiring, `runAction`/`ActionResult`, pure business-rule modules shared by UI and actions, PGlite migration tests, CRM pipeline model                                                                                                       | Painting/scheduling domain                                                                                                                              |
| `templates/api-*`           | Nothing now. Kept as the extraction target if a mobile app or partner API appears later                                                                                                                                                                                                               |                                                                                                                                                         |
| `cafton-landing`            | Everything visual: tokens in `globals.css`, fonts, motion, layout components, copy                                                                                                                                                                                                                    | Hard-coded content files as the source of truth (moves to the database in Phase 2)                                                                      |

The landing already isolates data behind async functions in `src/lib/repositories/*` ("moving content to a backend means changing only the bodies here"). That seam is why the CMS phase can swap data sources without touching public pages.

## Target folder layout

Full rationale and the lint rules that enforce it: [ADR 0004](./adr/0004-folder-structure.md).

```
prisma/                      schema.prisma, migrations/, seed.ts (Phase 2)
src/
  app/
    (marketing)/             PUBLIC site routes (URLs unchanged)
    (auth)/login/            staff sign-in (Phase 1)
    dashboard/               INTERNAL: own layout, noindex
      cms/ crm/ sales/ delivery/ finance/ hr/ admin/
    api/                     public form endpoints + webhooks only
  components/
    ui/                      Radix shadcn primitives (public site, generated)
    shared/                  neutral ground for both surfaces: logo, themed-image, json-ld, turnstile
    marketing/               public-site UI: layout, patterns, decor, motion, three, consent, home, about, blog, ...
    dashboard/               dashboard UI: ui/ (Base UI base-nova), layout/, data-table/, shared/
  features/                  business domains
    <domain>/
      types/                 shapes, safe anywhere
      schemas/               Zod, shared with client forms
      rules/                 pure business rules, used by UI and actions, unit tested
      repository/            reads, server-only, the only code that queries
      services/              server logic that is not a request: transactions, jobs, email, events
      actions/               writes, "use server": requirePermission -> Zod -> service/repository -> audit -> revalidate
      components/            dashboard UI for this domain only
    users/  roles/  audit/   (Phase 1: access and accountability)
    cms/  crm/  sales/  delivery/  finance/  hr/
  config/                    site.ts, navigation.ts, services.ts, values.ts
  providers/                 theme, consent, smooth scroll (app-wide context)
  hooks/                     generic hooks
  lib/                       framework-level only: utils, env, db, fonts, seo, structured-data, consent, security/, auth/ (Phase 1)
  proxy.ts                   session refresh + optimistic /dashboard redirect only
docs/                        ARCHITECTURE.md, ROADMAP.md, adr/
```

Rules (from the template and artist-app, enforced by lint where possible):

1. `app/` routes hold no business logic; pages `await` a repository function.
2. Only `repository.ts` queries the database. Client components never import `server-only` modules.
3. Every mutation: `requirePermission()` -> Zod parse -> transaction -> audit entry -> `revalidatePath`.
4. The proxy is an optimistic redirect. Real authorization is the DAL, on every page and action.
5. Features never import each other's `components/`. Cross-feature needs go through a feature's exported `repository`/`types`. Public-site rendering of a feature's data lives in `components/marketing`, not in the feature.
6. Rules that must hold in both UI and server (e.g. "a paid invoice can't be edited") live once in `rules.ts` and have tests.
7. Marketing and dashboard components never import each other; `components/shared` imports neither (ESLint-enforced).

## Domain map and data model

Shared spine: `Profile` (staff account) -> `Role` -> `RolePermission`; `AuditLog`; `Media`; `Notification`; `Setting`; `Tag`; `Attachment` (polymorphic file link); `Note`/`Activity` (polymorphic timeline).

| Domain       | Core entities                                                                                                                                                                                               | Key relationships                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CMS**      | `BlogPost`, `Author`, `PortfolioProject`, `Service`, `ServiceFaq`, `Event`, `Partner`, `JobOpening`, `LegalPage`, `SeoMeta`                                                                                 | Replaces `src/data/*`. Draft -> review -> published workflow, scheduled publish, revision history                                                      |
| **CRM**      | `Organization`, `Contact`, `Lead`, `Deal`, `PipelineStage`, `Activity`, `Task`                                                                                                                              | Contact form creates a Lead (linked to an existing contact by email); a Lead converts to Contact + Organization + Deal. HubSpot is not used (ADR 0006) |
| **Sales**    | `CatalogItem`, `Quote`, `QuoteLine`, `Contract`, `Subscription` (retainers)                                                                                                                                 | Deal -> Quote -> Contract; accepted quote seeds Project and Invoice schedule                                                                           |
| **Delivery** | `Project`, `Milestone`, `ProjectTask`, `TimeEntry`, `ProjectMember`                                                                                                                                         | Won deal -> Project; time entries feed invoicing and cost reports                                                                                      |
| **Finance**  | `Account` (chart of accounts), `JournalEntry` + `JournalLine` (double entry), `Invoice`, `InvoiceLine`, `Payment`, `Bill`, `Expense`, `Vendor`, `TaxRate`, `BankAccount`, `BankTransaction`, `FiscalPeriod` | Invoice/payment/bill/payroll post balanced journal entries; closed periods are immutable; reports derive from the ledger only                          |
| **HR**       | `Employee`, `Department`, `Position`, `EmploymentContract`, `LeaveType`, `LeaveRequest`, `Attendance`, `PayrollRun`, `Payslip`, `Applicant`, `Application`, `PerformanceReview`, `EmployeeDocument`         | `Employee` links to `Profile`. Careers form creates `Application`. Payroll run posts to the ledger                                                     |
| **Admin**    | `Profile`, `Role`, `StaffInvite`, `AuditLog`, `Setting`                                                                                                                                                     |                                                                                                                                                        |

Sensitive data (payroll, salary, national IDs, bank details): separate permissions (`hr:salary:view`), field-level redaction in repositories, and no inclusion in search, logs or exports unless the permission is held.

## Roles (initial)

Owner (all) - Admin - Content Editor - Sales - Project Manager - Finance - HR - Employee (self-service: own profile, leave, payslips, timesheets) - Viewer. Permission strings are `resource:action` (`deals:close`, `invoices:void`, `payroll:approve`), catalogued in `lib/auth/permissions.ts`. Built-in roles come from code; custom roles are stored. Guard rails copied from artist-app: no privilege escalation, no self-role change, at least one owner.

## Cross-cutting standards

- **Security**: RLS enabled on every table with no policies (Prisma is the only data path); CSP moved from report-only to enforcing for `/dashboard`, with nonces; Turnstile + honeypot + rate limits on public forms (already present); audit log for every mutation; secrets only in env, validated at boot (`lib/env.ts`).
- **Accessibility and UX**: WCAG 2.2 AA in the dashboard; keyboard-first (command palette, table navigation); every list has loading, empty, error and filtered-empty states; destructive actions confirm; forms validate inline with the shared Zod schema; unsaved-change guard; URL holds table state.
- **Testing**: Vitest for rules and repositories (PGlite built from real migrations), Playwright + axe for critical flows per phase, `npm run verify` (lint, typecheck, test, build) required in CI.
- **Observability**: structured logging, error monitoring hook (template `monitoring.ts`), audit log UI.
- **Data**: migrations are forward-only and reviewed; nightly Supabase backups confirmed before Phase 6 (finance); CSV export per list; PII retention policy documented before Phase 7 (HR).
- **Performance**: public pages stay statically rendered/ISR with tag-based revalidation when CMS content changes; dashboard is dynamic, paginated server-side.
- **Docs**: an ADR per significant decision in `docs/adr/`, `CONTEXT.md` glossary per domain (template convention) so terms like Lead, Deal, Invoice, Payslip mean one thing.

## Risks to watch

1. **Blast radius**: HR/finance in the public deployable. Mitigations above; reconsider the monorepo split if the team grows or an audit demands it.
2. **Scope**: finance and payroll carry legal obligations that vary by country. Needs the jurisdiction and tax rules confirmed before Phase 6/7.
3. **Two primitive libraries** add bundle weight only on routes that use them; revisit unification after Phase 8.
4. **CMS migration** must keep every public URL, metadata and structured data identical. Phase 2 has a snapshot-diff acceptance test.
