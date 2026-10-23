# 0015 - The books: chart of accounts, ledger, periods and tax

Phase 6 starts here. Everything that touches money (invoices, payments, bills, bank, payroll later)
posts to one ledger, so reports come from one place and can be reconciled to it.

## What the business told us

- **Currency:** Philippine peso. The books are in pesos only; a document in another currency is not
  posted until multi-currency is designed on purpose.
- **Fiscal year:** the calendar year, January to December.
- **Tax regime:** registered with the BIR on the **8% income tax option**. That means the business is
  **not VAT-registered**: it charges no VAT and pays no percentage tax, and instead pays 8% income
  tax on gross sales and receipts above the ₱250,000 yearly allowance, filed quarterly and
  annually. So "No VAT" is the default tax rate, VAT 12% exists but is switched off, and tax
  obligations are tracked on their own (a later slice) rather than folded into invoices. These are
  the business's stated facts, not tax advice: the figures are estimates for the accountant to
  confirm.

## One ledger, double entry, append-only

- A **journal entry** has two or more **lines**; each line is a debit or a credit of whole centavos
  (never both, never zero, never a float). The database enforces, whatever the application does:
  - an entry's debits equal its credits (a deferred constraint trigger, checked when the transaction
    commits, so lines can be added one at a time) and it has at least two lines;
  - nothing posted is ever updated or deleted;
  - no entry lands in a closed month;
  - no posting to an archived account, and an account that has postings keeps its type;
  - an entry is reversed once (a unique key on `reverses_id`).
- **Mistakes are undone by reversal**, never edited: a new entry with every debit and credit swapped,
  linked to the original, dated today (so it lands in an open month). Both stay in the books, so the
  history is what happened. A reversal is not itself reversed.
- **One door.** Every posting goes through `features/finance/ledger.ts` (`postJournal`), so an
  invoice and a hand-typed entry face the same checks, the same numbering (`JE-2026-0001`) and the
  same audit entry. The application's checks say what is wrong in plain words; the database's are
  the last line of defence.

## Chart of accounts

A small starting chart for a Philippine service business (1xxx assets, 2xxx liabilities, 3xxx
equity, 4xxx revenue, 5xxx to 9xxx expenses). Accounts the system posts to carry a **role**
(`system_key`: `ar`, `cash`, `bank`, `revenue_services`, `income_tax_payable`, ...). Finance posts by
role, so renaming or renumbering an account breaks nothing; a role account can't be archived or have
its type changed. Anyone with `finance:manage` can add accounts; the code must fit its type.

## Fiscal periods

Twelve months a year, made the first time a year is looked at or posted into. **Months close in
order**, and **only the latest closed month can be reopened**, so nothing open ever sits before a
closed month. Closing and reopening are audited and need `finance:close`.

## Tax rates and rounding

Rates are basis points (1200 = 12%). All rounding goes through one function (`roundDiv`: halves
away from zero, in BigInt, so nothing is lost to floats); tax is `taxOf`, a tax-inclusive price is
taken apart by `splitGross` so net and tax add up to the gross, and amounts are split across parts
by largest remainder (`splitProportionally`) so the parts always add up to the whole.

## Permissions

`finance:view` (the books and reports), `finance:post` (journal entries and reversals),
`finance:manage` (accounts and tax rates), `finance:close` (periods). All four are administration:
Owner and Admin have them; Sales and Viewer do not. Custom roles can be given any of them.

## Not done in this step

Invoices, credit notes, payments and allocations; vendors, bills and expenses; bank accounts and
reconciliation; the reports; the 8% tax tracker. They post through the door above.
