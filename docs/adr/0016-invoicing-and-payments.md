# 0016 - Invoicing, payments and receivables

Invoices turn delivered work into money owed; payments turn it into money received. Both post to the
ledger of ADR 0015 through its one door (`postJournal`), so they face the same balance, period and
audit rules as everything else.

## Lifecycle

- A **draft** has no number, nothing posted, and can be edited or deleted. It starts from an
  accepted quote (the invoice equals the quote exactly, tax as quoted), from finished billable
  milestones of one project, or blank.
- **Issuing** takes the next number from `document_counters` inside the same transaction as the
  posting, so a refused or rolled-back issue never leaves a hole (numbers are gapless, as the tax
  authority expects). It posts Dr Accounts receivable (total), Cr Service revenue (subtotal), Cr
  Output VAT payable (tax, only when there is any). The business is on the 8% option, so tax is
  normally zero.
- An **issued** invoice is frozen in the database (wording, amounts, dates, client); only the
  bookkeeping around it moves (when it was sent, reminders, being voided). **Void** reverses the
  posting, keeps the record and releases the milestones it billed. It is refused while a payment or
  credit note still stands, and a reason is required.

## Payments

A payment records the money in (`amount`), tax the client withheld (`cwt`, creditable withholding
tax, form 2307) and allocations to invoices. It posts Dr the cash or bank account chosen + Dr CWT
receivable, Cr Accounts receivable (what was applied) and Cr Customer deposits (any remainder). The
amount plus the withheld tax is what settles invoices, so a client who pays 9,500 and withholds 500
settles a 10,000 invoice. The database refuses (deferred triggers) a payment that allocates more
than it brought in and an invoice that is settled or credited for more than it is worth. Voiding a
payment reverses its posting and the invoices owe the money again.

## Credit notes and receivables

A credit note reduces what is owed (never below zero) and posts Dr revenue (+ output VAT), Cr
receivable. Where an invoice stands is derived, never stored: draft, void, open, partly paid,
overdue or paid, from its total, payments and credits. Receivables aging buckets open balances by
days past due (current, 1-30, 31-60, 61-90, over 90).

## Sending and reminders

An issued invoice is emailed with its PDF (amounts as "PHP 1,234.00": the built-in PDF fonts have no
peso sign). The daily cron sends a polite reminder three days after the due date, then weekly,
three at most; a reminder can also be sent by hand.

## Permissions

`invoices:view`, `invoices:create` (drafts), `invoices:issue` (issue, send, void), `invoices:settle`
(payments, credit notes). Issue and settle are administration, so the Sales role drafts invoices
but cannot issue them or touch money; Viewer sees no invoices.

## Not yet

Invoicing approved time (needs a billing rate on the project), a client-facing payment link, and
recurring invoices.
