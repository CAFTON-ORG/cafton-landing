`# 0010 - CRM lists, pipelines and notifications
`
`## Decisions
`
`- **People look the same everywhere.** `Person`shows a photo or initials beside the name for staff, clients and attendees. The data layer carries`avatarUrl`for owners, assignees and authors.`- **Tags are a text array** on leads, contacts, organizations and deals (GIN index), cleaned by `normalizeTags`. Filtering is `tags has`. A separate tags table would only add joins for a feature that needs none.
`- **Saved views** keep a list's address query (`saved_views`), per person or shared with people who can edit that resource. The page number is never saved.
`- **Bulk actions** take at most 200 ids, run the same rules as the single-row actions (a won deal, a converted lead, a contact with deals are kept) and say what was kept and why.
`- **Import and export** are CSV only. Export honours the screen's search and filters, needs the edit permission (personal data), is audited and defuses formula cells. Import previews first and skips existing emails.
`- **Merge** (`contacts:merge`, `organizations:merge`) moves deals, leads, tasks, meetings and timeline to the kept record, fills its gaps, joins tags, soft-deletes the rest, in one transaction.
`- **Several pipelines.** `pipelines`own ordered`pipeline_stages`; every pipeline ends with its own Won and Lost. A deal stays in its pipeline (moves are refused across pipelines) and win, lose and reopen use the deal's pipeline. Editing needs `pipelines:manage`(administration). Stage keys stay globally unique so filters keep working.`- **Notifications** are rows in `notifications`, written by `notify()` (never throws, skips the person who caused it). The bell lists them; the daily job raises due tasks.
`- **No inline script on the public site.** The theme and cookie-notice bootstrap is a same-origin file (`public/theme-init.js`), not `dangerouslySetInnerHTML`.
`
`## Not done
`
`Email logging, custom fields, lead scoring and assignment rules, files on records, merging leads, per-stage required fields, multi-currency totals.
`

## Speed (added later)

The database is in Mumbai and people work from the Philippines, so every query costs hundreds of milliseconds (measured: about 500 ms a query, seconds to open a connection). A page that makes five queries one after another feels broken. What we do about it, in order of effect:

- **Run the app next to the database** in production: `vercel.json` pins functions to `bom1`. Locally, `next dev` against the hosted database stays slow by nature.
- **Fewer round trips per page.** The signed-in person's profile, role and permissions are one SQL query (Prisma's include took three in a row). A list counts and reads its page at the same time (`fetchPage`). Detail pages ask for everything in one `Promise.all`. Sidebar badges and the bell's unread count come from a single query.
- **Do not ask twice** (`lib/ttl-cache.ts`): the staff directory (60 s), pipelines (30 s) and the badge counts (10 s). Nothing security-related is cached across requests: who someone is and what they may do is read on every request and only memoized within it (React `cache`, as the Next.js data-access-layer guide says), so removing or demoting a person takes effect at once.
- **Keep connections warm** (`lib/db.ts`): connections idle for ten minutes instead of ten seconds, so reading a page no longer means paying the connection cost on the next click.
- **Read lazily.** The bell's list is fetched when it is opened, not on every page.
