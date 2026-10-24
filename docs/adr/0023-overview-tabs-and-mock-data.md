# 0023 - The home overview, one tab style, and mock data

## The home overview

`/dashboard` is a role-aware home, not a welcome note. It greets by Manila time of day, shows up to
four headline figures (open pipeline, cash and bank, owed to you, active projects), a "Needs your
attention" list ordered most pressing first, the sales pipeline by stage, income and expenses for
six months, and recent activity. Each section is fetched and shown only if the person's role may
open it (`features/overview/repository.ts`), so a viewer or an editor sees a smaller, still complete
page rather than a wall of access-denied cards. Every tile and row links to the list behind it.
The ordering, greeting and number wording are pure rules with unit tests (`features/overview/rules.ts`).

`StatCard` takes an optional `href` and `tone`, and `AttentionList` is the shared list used for
"what to do next". The sidebar header shows the workspace under the name ("Operations") in the
standard product-header pattern.

## One tab style

Every tab bar is the existing pill style: a muted track with the selected tab raised on it and a count badge after the label (`Tabs`, and `SegmentedNav` for tabs that are links). The finance status tabs and the website settings tabs, which had their own underline style, now use `SegmentedNav` (which gained an optional `count`), so there is one look to learn and one place to change it.

## Mock data

`npm run db:seed-mock` fills a database with fictional but realistic data for everything except the
website content (which is real): staff, clients, deals, leads, quotes, projects with eight weeks of
time, meetings, and finance with a balanced ledger (invoices, receipts with withholding, bills,
expenses, payroll, a bank statement). Dates are relative to today. It refuses non-local databases
unless `--allow-remote` and `MOCK_SEED_CONFIRM=add-fake-data` are both given, uses `example.com`
addresses so no email can reach a real person, and does nothing if it already ran. The ledger is
append-only by design, so mock finance entries on a shared database cannot be deleted: run it on a
local database (`npm run db:local`).
