# 0013 - Record tools (scoring, assignment, email, files, custom fields) and deal-close rules

## Deal-close rules

These were checked against common sales-operations practice (offers are not left open once a deal
closes; a signed agreement is a record that a plain reopen should not override).

- **Winning a deal is refused while a quote is waiting for approval, approved but not sent, or out
  with the client.** A client could answer after the deal closed, and winning at a different value
  would contradict the offer. Withdraw it (or wait for the answer), then win. A draft is only a
  working copy and does not block; a sent quote past its date already reads as expired and does not
  block either. Losing a deal still withdraws open quotes and contracts for you, because nothing is
  being agreed any more.
- **A won deal with a signed contract can't be reopened.** Reopening unlocks the value and scope the
  client signed. A change is a new quote on the deal.
- **A deal can still be won with no accepted quote**, at any value above zero. Repeat business and
  deals agreed by phone or purchase order are normal. With an accepted quote the deal is won at its
  total, as before.

The screens show the reason beside the disabled button; the actions enforce it either way.

## Decisions

- **Lead score** is rules-based and explainable: points from the contact form's own answers (budget,
  timeline, business size, role, how they found us, phone, business name, work email), 0 to 100, in
  bands Hot (60+), Warm (35+) and Cold. It is stored on the lead so lists can sort and filter by it;
  new enquiries are scored as they arrive and the daily job scores any that have none. The lead page
  shows every reason. It is a hint for who to call first, never a gate: qualifying stays a person's
  decision. A test fails if the form gains an option the score tables don't know.
- **Round-robin assignment** gives each new website enquiry to the person who was given a lead least
  recently (nobody-yet first), among staff who are switched on under Users and whose role can work on
  leads. There is no counter to keep in step, so people joining, leaving or being switched off just
  work. A database lock held for the transaction makes two simultaneous enquiries take turns. With
  nobody switched on, enquiries stay unassigned, as before. The assignee gets one "assigned to you"
  notice instead of the general one.
- **Lead merge** works like contact and organization merge (one transaction, audited): the timeline,
  tasks and meetings move to the kept lead, gaps are filled, tags and custom values are combined. A
  converted lead is part of a deal's history and is never offered.
- **Email from a record** sends through the mail service with replies going to the sender, and is
  logged on the timeline and audit log only after the service accepted it. A subject can't contain a
  line break. Staff are limited to 30 sent emails an hour. Received email is still logged by hand.
- **Files on records** go in a private bucket under a random name. The bucket has no storage policies at all, so no signed-in user can list, read, upload or delete in it through the storage API (the first version let every staff account do that, which skipped the per-record permission checks). Only the server reaches it, with the service-role key, after checking the permission. Type is decided by the file's
  bytes, never its name or the browser's claim: PDF, PNG, JPG, WebP, Word, Excel, PowerPoint, CSV and
  text. Anything that could run in a browser or on a computer (HTML, SVG, scripts, executables,
  archives, macro documents) is refused. Images are re-encoded without metadata. Files are limited
  to 4 MB and 50 per record, open through a link that expires after a minute and is issued only after
  checking the person may see the record, and are removed by whoever added them or an administrator.
  Merging records moves their files with them.
- **Custom fields** (text, number, date, choice from a list, yes or no) are added per kind of record
  by an administrator. Values are a small JSON object on the record keyed by the field's key, which
  never changes, so renaming can't orphan values. A field's type can't change; archiving hides a
  field but keeps its values, and restoring brings them back. Up to 25 active fields per kind.
  A field can be marked required: saving a record's custom fields is refused while it is empty (a
  yes or no field can't be required, as it has no empty state). Choice and yes or no fields get a
  filter on the list (`?cf_region=North`, checked against the field's own choices, so a stale or
  made-up value narrows nothing), the first three active fields show as columns, and every active
  field is a column of the CSV export.
- **Required fields per stage.** An open stage can ask for the deal's value, expected close date,
  organization or any active custom field. Moving a deal into the stage is refused, with the missing
  fields named, until they are filled in (the same on the board and the deal page). Won and Lost
  keep their own rules, and a new deal is not held to its first stage's list.

## Not done

Capturing received email automatically (needs inbound mail set up with the provider), custom fields
in CSV import and as sortable columns, custom field ordering by drag and drop, and files in the
client-facing quote and contract pages.
