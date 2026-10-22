# Cafton Platform Roadmap

Track progress by ticking boxes. Each phase ends with `npm run verify` green, a migration (if any), docs updated, and a demo against seeded data. Architecture and decisions: [ARCHITECTURE.md](./ARCHITECTURE.md).

Order is chosen so each phase delivers value alone and unlocks the next: content first (replaces today's hard-coded data), then the revenue chain (lead -> deal -> quote -> project -> invoice), then people and money.

## Phase 0 - Foundation and tooling

Goal: a safe base to build on, with no visible change to the public site.

- [x] Create feature branch; confirm CI (`.github/workflows/ci.yml`) runs lint + typecheck + build
- [x] Add Prettier (+ tailwind plugin), Vitest, Testing Library, Playwright + axe, `verify` script, env validation (`lib/env.ts`)
- [x] Add Prisma 7 + Supabase clients; `.env.example`; local PGlite DB script (`db:local`) from artist-app
- [x] Move public pages into `app/(marketing)/` route group (URLs unchanged); prove with sitemap + route snapshot diff
- [x] Set up base-nova: second shadcn config for `components/dashboard` without touching `components/ui`; scope dashboard tokens so landing theme is unaffected
- [x] ADRs: placement, monolith, auth, UI coexistence, money/soft-delete conventions
- [x] Folder structure standardised against the template (ADR 0004): `(marketing)`, `components/{ui,shared,marketing,dashboard}`, `features/{cms,crm}`, `config/`, `providers/`
- [ ] Playwright smoke + axe test for the public routes (needs `npx playwright install chromium`)
- Done when: landing renders pixel-identical, all existing routes 200, CI green.

## Phase 1 - Auth, RBAC and dashboard shell

- [x] Supabase Auth (Google), invite-only trigger, `proxy.ts`, DAL (`getStaff`, `requirePermission`, `requirePageAccess`) - ADR 0005
- [x] `Profile`, `Role`, `RolePermission`, `StaffInvite`, `AuditLog` models + migration (`Setting` moved to the first phase that needs it)
- [x] Permission catalogue + built-in roles (owner, admin, viewer; more arrive with their phase); `/dashboard/users`, `/dashboard/roles` with escalation guard rails
- [x] Shell: sidebar (collapsible), mobile drawer, app bar, breadcrumbs, command palette, theme toggle, `config/dashboard-navigation.ts` filtered by permission
- [x] Shared `DataTable` (URL-driven), `ActionResult`/`runAction`, toast, confirm dialog, empty/error/loading/access-denied states
- [x] Audit log viewer and an append-only audit table; overview page
- [x] Tests: permission rules, users/roles rules, invite claims, migration + trigger + append-only + RLS via PGlite
- [x] `npm run staff:invite` to bootstrap the first owner
- [ ] Apply the migration to the Supabase project, enable the Google provider, invite the first owner (see README), then sign in end to end
- [ ] Playwright + axe pass on the shell (needs `npx playwright install chromium`)
- [ ] In-app notifications skeleton (moved to Phase 8 with email digests)
- Done when: only invited staff can sign in; each role sees only its menu; every mutation writes an audit row.

## Phase 2 - CMS (replace hard-coded content) [complete]

- [x] Models: `Author`, `BlogPost`, `PortfolioProject`, `Event`, `Partner`, `ServiceFaq`, `Media` with DB-level rules (ADR 0007)
- [x] Seed script copies every bundled item into the database unchanged; idempotent, never overwrites edits (`npm run db:seed-content`); seeded into Supabase
- [x] Repositories read the database (bundled content before the first seed or if the database fails)
- [x] Proof: DB round-trip test deep-equals the bundled content; the public site built from files and from the database is identical (23 pages)
- [x] Full editors for blog posts, projects (with gallery), events (prizes, steps, facts, promo, poster, Manila-time dates), partners (logo, links) and service FAQs; draft / publish / unpublish, delete only when unpublished, unsaved-changes guard
- [x] Proof: opening and saving every shipped item unchanged leaves the public content identical
- [x] Image library on Supabase Storage: server-side upload that checks the bytes, strips EXIF/GPS, re-encodes and caps size; random paths; alt text; usage tracking; delete blocked while content uses an image; picker in every editor
- [x] Content Editor role; audit entry for every change; on-demand revalidation of the public pages
- [x] Dashboard polish: image drop zone with preview and direct upload, tabs for long editors, staff as authors (name and photo), thumbnails in lists, one-screen app shell with a single scroll area, foldable sidebar groups
- Moved on purpose (nothing in the site depends on them): scheduled publish, revision history and live preview to Phase 8 (per-item SEO moved to Phase 2b); careers applications to Phase 7 (HR recruitment).
- Website navigation and forms were reorganised: Website > Content (Pages, Blog, Portfolio, Events, Partners, Service questions), Media, Site settings (General and Search and sharing tabs); one-level tree in the sidebar with a hover flyout when collapsed; a sticky save bar on every document form; a Website overview page.
- Done when: an editor can publish a blog post that appears on the site without a deploy. Met.

## Phase 2b - Website content and SEO management

Everything else visitors read comes from the database too, so staff never need a developer to change wording, contact details, social links or search-engine text. Same method as Phase 2: bundled defaults stay as the fallback, and every step is proven by building the public site both ways and comparing the HTML.

- [x] Site settings: description, slogan, contact email, location, booking link, badges and social links; the footer, menu, event pages, home and About badges, contact, careers, privacy and legal pages, the web manifest and the search-engine data all read them (migration `site_content`; not yet applied to Supabase)
- [x] SEO management: title, description, share image and "hide from search" for each fixed page (with a search preview); the sitemap follows the hide flag; careers hides itself until it lists a role
- [ ] Per-item SEO fields on blog posts, projects and events (needs a migration and editor fields; not started)
- [x] Services: the four service areas (wording, order and systems; addresses and icons stay fixed) and the services page text
- [x] Core values editable (About page and the home page "Why Cafton"): wording and order of exactly six, since the home scroll is built for six
- [x] About page sections editable (headline, photo, what we do, story, vision, mission, approach, where we can help)
- [x] Home page section text editable (headings, intros, buttons, call to action); the animated headline stays in code
- [x] Careers: text and a list of open roles; the page indexes itself when there are roles
- [x] Privacy policy and Legal documents editable (sections in a small safe text format, cookie table and registration cards as blocks, "last updated" date)
- [x] Contact page text (the form's own questions stay in code)
- [ ] Proof for each step: public HTML built from files equals HTML built from the database (done for settings; the policy pages now render through the text format, so their markup differs slightly in whitespace)

## Phase 3 - CRM

HubSpot is dropped: the contact form writes to our database and the dashboard is the system of record (ADR 0006).

- [x] Models: `Organization`, `Contact`, `Lead`, `Deal`, `PipelineStage`, `Activity`, `Task` (tags deferred)
- [x] Contact form -> Lead (links an existing contact by email; first timeline entry; reply-by task); spam checks kept; HubSpot code, env vars and privacy wording removed
- [x] Lead qualification, disqualification (reason), reopen, and conversion to Contact + Organization + Deal in one transaction
- [x] Pipeline board and table views, stage exit criteria and probabilities, weighted forecast, win (value required) and loss (reason required), reopen
- [x] Timeline per lead, contact and deal (notes, calls, emails, meetings, automatic stage changes); tasks with due dates, assignment and urgency; owner assignment
- [x] Rules module + tests; a real-database integration test of the whole flow; built-in Sales role
- [ ] CSV import/export, duplicate detection beyond email, tags, saved views
- [ ] Email to staff on a new lead and email to contacts (needs Resend, Phase 8)
- [ ] Edit pipeline stages in the UI
- Done when: a website enquiry can be followed to a won deal without leaving the dashboard. (Verified against PGlite; verify once more against Supabase after `db:deploy`.)

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
