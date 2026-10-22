# 0010 - CRM lists, pipelines and notifications

## Decisions

- **People look the same everywhere.** `Person` shows a photo or initials beside the name for staff, clients and attendees. The data layer carries `avatarUrl` for owners, assignees and authors.
- **Tags are a text array** on leads, contacts, organizations and deals (GIN index), cleaned by `normalizeTags`. Filtering is `tags has`. A separate tags table would only add joins for a feature that needs none.
- **Saved views** keep a list's address query (`saved_views`), per person or shared with people who can edit that resource. The page number is never saved.
- **Bulk actions** take at most 200 ids, run the same rules as the single-row actions (a won deal, a converted lead, a contact with deals are kept) and say what was kept and why.
- **Import and export** are CSV only. Export honours the screen's search and filters, needs the edit permission (personal data), is audited and defuses formula cells. Import previews first and skips existing emails.
- **Merge** (`contacts:merge`, `organizations:merge`) moves deals, leads, tasks, meetings and timeline to the kept record, fills its gaps, joins tags, soft-deletes the rest, in one transaction.
- **Several pipelines.** `pipelines` own ordered `pipeline_stages`; every pipeline ends with its own Won and Lost. A deal stays in its pipeline (moves are refused across pipelines) and win, lose and reopen use the deal's pipeline. Editing needs `pipelines:manage` (administration). Stage keys stay globally unique so filters keep working.
- **Notifications** are rows in `notifications`, written by `notify()` (never throws, skips the person who caused it). The bell lists them; the daily job raises due tasks.
- **No inline script on the public site.** The theme and cookie-notice bootstrap is a same-origin file (`public/theme-init.js`), not `dangerouslySetInnerHTML`.

## Not done

Email logging, custom fields, lead scoring and assignment rules, files on records, merging leads, per-stage required fields, multi-currency totals.
