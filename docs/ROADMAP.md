# Cafton Platform Roadmap

Track progress by ticking boxes. Each phase ends with `npm run verify` green, a migration (if any), docs updated, and a demo against seeded data. Architecture and decisions: [ARCHITECTURE.md](./ARCHITECTURE.md).

Order is chosen so each phase delivers value alone and unlocks the next: content first (replaces today's hard-coded data), then the revenue chain (lead -> deal -> quote -> project -> invoice), then people and money.

## Phase 0 - Foundation and tooling
Goal: a safe base to build on, with no visible change to the public site.
- [x] Create feature branch; confirm CI (`.github/workflows/ci.yml`) runs lint + typecheck + build
- [x] Add Prettier (+ tailwind plugin), Vitest, Testing Library, Playwright + axe, `verify` script, env validation (`lib/env.ts`)
- [x] Add Prisma 7 + Supabase clients; `.env.example`; local PGlite DB script (`db:local`) from artist-app
- [x] Move public pages into `app/(site)/` route group (URLs unchanged); prove with sitemap + route snapshot diff
- [x] Set up base-nova: second shadcn config for `components/dashboard-ui` without touching `components/ui`; scope dashboard tokens so landing theme is unaffected
- [x] ADRs: placement, monolith, auth, UI coexistence, money/soft-delete conventions
- Done when: landing renders pixel-identical, all existing routes 200, CI green.

## Phase 1 - Auth, RBAC and dashboard shell
- [ ] Supabase Auth (Google), invite-only trigger, `proxy.ts`, DAL (`getStaff`, `requirePermission`)
- [ ] `Profile`, `Role`, `RolePermission`, `StaffInvite`, `AuditLog`, `Setting` models + migration
- [ ] Permission catalogue + built-in roles; `/dashboard/users`, `/dashboard/roles` with escalation guard rails
- [ ] Shell: sidebar (collapsible), mobile drawer, app bar, breadcrumbs, command palette, theme toggle, `config/navigation.ts` filtered by permission
- [ ] Shared `DataTable`, form patterns, `ActionResult`/`runAction`, toast, confirm dialog, empty/error/loading states
- [ ] Audit log viewer; notifications (in-app) skeleton
- [ ] Tests: permission rules, invite flow, access-denied pages, a11y pass on shell
- Done when: only invited staff can sign in; each role sees only its menu; every mutation writes an audit row.

## Phase 2 - CMS (replace hard-coded content)
- [ ] Models: `BlogPost`, `Author`, `PortfolioProject`, `Service`, `ServiceFaq`, `Event`, `Partner`, `JobOpening`, `LegalPage`, `Media`
- [ ] Media library on Supabase Storage (upload, alt text required, usage tracking, safe delete)
- [ ] Editors per content type with draft / review / publish, scheduled publish, revision history, SEO fields, live preview
- [ ] Seed script imports every item in `src/data/*`; swap bodies of `src/lib/repositories/*` to Prisma; keep return types
- [ ] On-demand revalidation by tag when content is published; sitemap/robots/structured data driven from DB
- [ ] Contact + careers forms persist submissions (inbox in dashboard) before the CRM phase links them
- Done when: snapshot diff of rendered public HTML (before vs after) shows no change; an editor can publish a blog post that appears on the site without a deploy.

## Phase 3 - CRM
- [ ] Models: `Organization`, `Contact`, `Lead`, `Deal`, `PipelineStage`, `Activity`, `Task`, `Tag`
- [ ] Contact form -> Lead (dedup, spam checks kept); keep HubSpot as optional outbound sync behind a flag
- [ ] Lead qualification and conversion to Contact + Organization + Deal
- [ ] Kanban pipeline + table view, stage exit criteria and probabilities, weighted forecast, win/loss reasons
- [ ] Timeline per record (notes, calls, emails, stage changes), tasks with due dates and reminders, assignment and ownership
- [ ] Rules module + tests (what can move, close, reopen, delete); CSV import/export; duplicate detection
- Done when: a website enquiry can be followed to a won deal without leaving the dashboard.

## Phase 4 - Sales
- [ ] Service/product catalog with pricing models (fixed, hourly, retainer), tax category
- [ ] Quotes: builder, numbering, versions, approval rule, PDF (react-pdf), email send, public accept link
- [ ] Contracts/SOW templates and e-acceptance record
- [ ] Won quote creates Project (Phase 5) and invoice schedule (Phase 6) via domain events, not direct imports
- [ ] Sales dashboard: pipeline value, win rate, cycle time, per-owner targets
- Done when: a deal produces a sent, accepted, auditable quote.

## Phase 5 - Delivery (projects and time)
- [ ] `Project`, `Milestone`, `ProjectTask`, `ProjectMember`, `TimeEntry`
- [ ] Board + list task views, milestones with billing triggers, timesheets with weekly submit/approve
- [ ] Budget vs actual (hours and cost), utilisation by person
- [ ] Link portfolio CMS entries to delivered projects (optional publish as case study)
- Done when: approved hours and milestones can be selected for invoicing.

## Phase 6 - Finance and accounting
Prerequisite: confirm base currency, tax regime and fiscal year; confirm backups.
- [ ] Chart of accounts, fiscal periods, tax rates; double-entry ledger with balanced-entry DB check
- [ ] Invoices (from quote/milestone/time), credit notes, payments, allocations, aging, PDF + email, payment reminders
- [ ] Vendors, bills, expenses with receipt upload and approval, recurring entries
- [ ] Bank accounts, statement import (CSV), reconciliation
- [ ] Period close/lock; voids by reversal only; every posting audited
- [ ] Reports from ledger: P&L, balance sheet, cash flow, trial balance, AR/AP aging, tax summary; CSV/PDF export
- [ ] Tests: ledger always balances, closed periods immutable, rounding rules
- Done when: books balance and reports reconcile to the ledger for seeded scenarios.

## Phase 7 - HR and payroll
Prerequisite: confirm jurisdiction (statutory deductions, leave law) and data-retention policy.
- [ ] Employees, departments, positions, contracts, documents; org chart; link to `Profile`
- [ ] Leave types, balances/accrual, requests and approvals, calendar; attendance
- [ ] Recruitment: openings (from CMS), applicants and applications from the careers form, interview stages, offers
- [ ] Payroll runs, payslips, deductions, approval, posting to ledger; salary-field redaction by permission
- [ ] Onboarding/offboarding checklists; performance reviews; employee self-service portal
- Done when: an applicant becomes an employee, takes leave, and is paid with a posted journal entry.

## Phase 8 - Reporting, integrations, hardening
- [ ] Executive dashboard across modules; saved views; scheduled email reports
- [ ] Global search across entities (permission-aware); in-app + email notifications and digests
- [ ] Integrations: email provider (Resend), calendar, accounting export, webhooks; HubSpot sync finalised or retired
- [ ] Security review, enforcing CSP for `/dashboard`, rate limits, backup/restore drill, load test, pen-test checklist
- [ ] Staff documentation and training; runbooks; changelog

## Cross-phase definition of done
- [ ] Permission strings added and granted to roles; sidebar/search/actions all respect them
- [ ] Audit entry on every mutation
- [ ] Rules in `rules.ts` with unit tests; migration tested via PGlite
- [ ] Loading / empty / error states; keyboard and screen-reader pass (axe clean)
- [ ] Mobile layout checked at 375px
- [ ] ADR and `CONTEXT.md` glossary updated
