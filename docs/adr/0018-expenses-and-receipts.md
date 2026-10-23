# 0018 - Expenses and receipts

Not everything the business spends comes as a supplier bill. Someone buys fuel, a domain or
printing, from the till or out of their own pocket. An expense is the lightweight record of that,
with a receipt and an approval step, posted to the same ledger as everything else.

## Lifecycle

- Anyone who can submit (`expenses:submit`, everyone except Viewer) **submits** an expense: date,
  who was paid, what for, the category (an expense account, or an asset such as prepaid expenses),
  the amount and where the money came from. It waits for approval, and approvers are notified.
- **Paid from** is cash, a bank account, or **Reimbursements payable** (a liability): choosing that
  means the person paid personally and the business now owes them. Paying them back is a journal
  entry (Dr Reimbursements payable, Cr bank) until a payments flow exists for it.
- An approver **approves**: it takes the next number (`EXP-2026-0001`, gapless) in the same
  transaction that posts it (Dr the category, Cr where the money came from) and is then fixed in the
  database, receipts included. Or **sends it back** with a reason; the submitter edits it and it
  goes up for approval again. A mistake in an approved one is a **void**, which reverses the posting.
- The submitter can edit or withdraw while it waits; an approver can withdraw anyone's. Someone who
  can only submit sees only their own expenses; `expenses:view` (administration) sees everyone's.

## Receipts

A photo or PDF, up to 4 MB, at most 5 per expense, checked by its bytes (the CRM's file rules),
photos re-encoded without metadata, stored under a random name in a private bucket
(`finance-receipts`) that no storage policy opens: only the server reads it, after checking the
person may see the expense, and hands out a 60 second signed link. An expense over ₱1,000 needs a
receipt before it can be approved. Receipts can't change once it is approved (a trigger).

## Permissions

`expenses:submit` (submit, edit and withdraw your own, add receipts), `expenses:view` (see everyone's)
and `expenses:approve` (approve, send back, void). View and approve are administration.

## Recurring bills and expenses

Rent, hosting and subscriptions come round again. A **recurring item** is a bill (for a supplier) or
an expense, with a frequency (weekly, monthly, every 3 months, yearly), a first date and an optional
last date. A daily job (the existing cron, or "Make the ones that are due" on the page) makes a
**draft bill**, or an **expense waiting for approval**, for each date that has arrived. It never
posts to the books: a person still approves what it made, and approvers are notified.

- Months keep to the day they started on, clamped to the month's length, without drifting:
  31 January, 28 February, 31 March.
- Each date is made once: the bill or expense records the item and the date it was made for, under a
  unique key, so running the job twice, or after a failure, never doubles anything. A long-missed
  item catches up at most 12 dates per run.
- A paused item makes nothing; one past its last date switches itself off; one whose supplier was
  archived is left alone for a person to sort out. Removing one keeps what it already made.
- It needs `payables:create` to set up (administration).
