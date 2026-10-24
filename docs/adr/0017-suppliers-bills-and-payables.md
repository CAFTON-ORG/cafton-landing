# 0017 - Suppliers, bills and payables

The mirror of ADR 0016: bills turn what suppliers charge into money owed, and payments turn it into
money paid. Both post to the ledger through its one door (`postJournal`).

## Lifecycle

- A **supplier** (vendor) has a name (unique, ignoring case), contact details, a TIN, payment terms
  and a usual account. One with bills is archived, never deleted.
- A **bill draft** has no number, nothing posted, and can be edited or deleted. Its lines say what it
  was for and which account each is booked to (an expense, or an asset such as prepaid expenses;
  the application refuses any other type).
- **Approving** takes the next number (`BILL-2026-0001`, gapless, from `document_counters`) inside
  the transaction that posts it: Dr each line's account, Cr Accounts payable. An approved bill is
  fixed in the database (supplier, amounts, dates, lines, journal link); only voiding moves it. Its
  lines must add up to its total (a deferred constraint).
- **Void** reverses the posting and keeps the record. It is refused while a payment stands, and a
  reason is required.

## Paying

A payment (`BPAY-2026-0001`) records cash paid and any **withholding tax held back from the
supplier** (EWT). Together they settle the bill, so paying 9,800 and withholding 200 settles a 10,000
bill. It posts Dr Accounts payable (both), Cr the cash or bank account (cash), Cr Withholding tax
payable (the tax held back, to remit to the BIR). The database refuses a bill paid more than it is
worth and a payment against a bill that is not approved. Voiding a payment reverses it.

Where a bill stands (to pay, partly paid, overdue, paid) is derived from payments, never stored.
Payables aging buckets the open balances by supplier and days past due, like receivables.

## Permissions

`payables:view`, `create` (suppliers and drafts), `approve` (approve, void) and `pay`. All four are
administration permissions: Sales and Viewer see no payables.

## Not yet

Receipt and attachment upload, expenses paid out of pocket with approval, recurring bills, and
input VAT (the business is not VAT-registered). Expenses and recurring entries are the next slice.
