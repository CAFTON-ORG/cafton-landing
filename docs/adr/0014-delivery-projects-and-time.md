# 0014 - Delivery: projects, tasks and time

Phase 5. Projects are where a won deal becomes work; time is what later becomes an invoice (Phase 6)
and a payslip input (Phase 7). The decisions below are the ones a later phase depends on.

## A project starts from an accepted quote, through an event

When a client accepts a quote, Sales announces `quote.accepted` on the event bus (`lib/events.ts`).
Delivery listens (`features/delivery/handlers.ts`) and starts a project named after the deal, for
the same client, priced at the quote's total, managed by the deal's owner. Sales never imports
Delivery, and Finance will react to the same event the same way in Phase 6.

- The handlers are connected in `src/lib/event-handlers.ts`, the one place that knows both sides.
  `emit` loads it the first time anything is announced, inside the emitter's own bundle. (An
  `instrumentation.ts` startup hook was tried first and does not work: Next bundles it apart from the
  pages, so it registers on a bus that nobody emits to. Found by accepting a quote in a real server;
  unit tests share one module graph and could not see it.)
- A project is started **once per quote** (a unique index on `quote_id`), and a deal that already has
  a project does not get a second one when another version of the quote is accepted. Running the
  handler twice changes nothing.
- A handler that fails is logged and never undoes the acceptance (the bus's existing promise); the
  project can then be started by hand from a won deal.
- Projects can also be started by hand, from a won deal or for internal work with no deal. A project
  never starts from a deal that is still being worked.

## Status and what holds a project open

`planned -> active -> on hold / completed / cancelled`, with reopening. Completing needs the loose
ends tied up: no task left open, every billable milestone done, and no hours waiting for approval.
Cancelling is never held up. A closed project can't have milestones or tasks changed until it is
reopened. A project is deleted (softly) only if it never started, or was cancelled, and has no hours.

## Milestones and billing triggers

A milestone can be **billable**: finishing it is what Finance will invoice (Phase 6). It then needs
an amount, and the billable milestones together can't exceed the project's price (checked when a
milestone is saved and when the price is lowered; the database refuses a billable milestone with no
amount). Once a billable milestone is done, what it bills can't change and it can't be deleted. A
milestone is done only when its tasks are.

## Tasks

Four columns (to do, in progress, in review, done), a priority, an optional assignee, due date and
estimate. A task can only be given to someone on the project's team. `completed_at` follows the
status. The board uses drag and drop (mouse, touch, keyboard) with a status menu on each card for
phones. Column order is a `position` that is renumbered inside the move's transaction. A task with
hours logged is kept (mark it done instead of deleting).

## Time

- **Logging.** A person logs hours only on projects they are on the team of, that are in progress.
  Durations are written like `1.5`, `1:30` or `90m`; a bare number is hours. A day can't pass 24
  hours (per person, across projects), the future is refused, and the past only 31 days back.
- **Weeks.** Entries are grouped by the Monday of their week (a database check keeps that true).
  A person submits a whole week; a manager (`time:approve`) approves or sends it back with a reason.
- **Separation of duties.** Nobody approves their own hours; sending time back needs a reason the
  person can act on. A sent-back entry becomes a draft again when it is fixed.
- **Approved time is a record.** A database trigger refuses to change or delete an approved entry,
  because invoices and payroll will rely on it. Only approved time counts as actual.
- Permissions: `time:log` (your own), `time:approve`, `time:view` (everyone's hours and the
  utilisation report). Viewers do not get `time:view`, because hours are about people.

## Budget against actual, utilisation, case studies

- **Hours:** approved plus pending hours against the hours the price assumed.
- **Cost:** approved hours valued at each member's hourly cost (`cost_rate_minor`). Hours worked by a
  person with no rate are named on the screen rather than guessed, so the cost is never silently low.
  Margin is the price less that cost. Only people who can see everyone's hours see these figures.
- **Utilisation:** billable approved hours as a share of a 40-hour week, over the last 1, 4, 8 or 13
  weeks; hours not yet approved are shown beside it and not counted.
- **Case studies:** a completed project can be linked to one portfolio entry (an entry tells one
  project's story); the link is optional and clearing it frees the entry.

## Comments, templates and the client's progress page

- **Comments** on a task: a short conversation (2,000 characters each), the author's name is kept as
  written so it still reads after the person is removed. You remove your own; people who can delete
  projects remove anyone's. Deleting a task takes its comments (the database cascades).
- **Project templates** (`projects:templates`, administrators): milestones with the _share of the
  price_ each invoices, and tasks that sit under them. Applying one to a project that has nothing
  planned, or choosing one when starting a project, creates them; amounts are shares of the price
  rounded down so they never exceed it, and with no price nothing bills. Projects keep what they
  were given: editing or deleting a template changes nothing already created.
- **Client progress page** (`/p/<secret>`): a private link like quote and contract links, with only
  its SHA-256 hash stored, so the secret is shown once and renewing is how you get it again (it
  stops the old one). The page shows the status, due date, overall progress, how many pieces of
  work are done and the milestones, and nothing about money, hours, people or notes; a test checks
  that. Stopping sharing, deleting the project or cancelling it ends the link. Not indexed.

## Not done

Attachments on tasks (they need their own private storage and the same byte checks as CRM files),
recurring tasks, per-task time budgets, and invoicing from approved hours and billable milestones
(Phase 6, which consumes `time_entries` and `milestones`).
