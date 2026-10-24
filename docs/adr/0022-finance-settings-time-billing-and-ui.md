# 0022 - Finance settings, billing approved time, and how the finance screens look

## Finance settings

One row (`finance_settings`, always id 1) holds what a business decides once: whether it is
**VAT-registered**, the VAT rate (12%), the usual **payment terms** (days), the default **payment
instructions** printed on every new invoice, and a **standard hourly rate**. They are edited on the
Finance settings page (`finance:manage`) and audited.

**Quote tax.** A quote now has a tax choice: _No VAT_, or _VAT 12% added_ to the lines marked VAT. A
new quote starts with whichever the settings imply, so a business that is not VAT-registered (the
8% income tax option) never has VAT added by default, and one that is registered starts with its rate.
The choice can be changed while the quote is a draft; a draft saved without a choice keeps its own.
The VAT row is left off the quote, its PDF and the client's page when the rate is zero. (Prices
that already include VAT are not supported; a quote adds VAT to the price.) Invoices made from a
quote copy its tax as quoted and still add up to exactly what the client accepted.

## Billing approved time

Approved, billable time that has not been invoiced (an approved time entry is frozen; only its link
to an invoice line moves) can be turned into an invoice for a project, up to a day the person picks.

- **Which rate.** The most specific one set wins: a person on a project, then a project, then a
  person, then the standard rate. Rates live in `billing_rates` (one per combination, a unique
  index) and are edited in the Finance settings. If anyone's time has no rate to bill at, the
  invoice is refused and names them rather than leaving their time out silently.
- **Hours.** Minutes become hours rounded to the hundredth (100 minutes is 1.67 hours). One line per
  person: their hours at their rate, with the dates they cover. A line's amount is its quantity
  times its price, the same sum an edited draft recalculates.
- **No double billing.** Each time entry links to the line that bills it. The link is set in the
  same transaction that makes the invoice (it refuses if any of it was just taken), and cleared
  when a draft line is taken off, a draft is deleted, or an invoice is voided, so the time becomes
  billable again.
- **Drafts keep what their lines bill.** Saving a draft updates its lines in place by id (the editor
  sends each line's id), so a milestone or batch of time stays with its line; a line taken off
  releases it. (Before this, a saved draft was rebuilt and the links were restored by position,
  which broke when a line above was removed.)

## How the finance screens look

Finance follows the conventions of accounting packages (QuickBooks, Xero), so it is familiar to
anyone who has used one:

- **Overview** (the first item under Finance): cash, what is owed to you and by you, profit this
  month and year, income against expenses for six months, a "needs your attention" list (overdue
  invoices and bills, bills due this week, expenses awaiting approval, bank lines to match, a tax
  return due) and shortcuts. A tax year the business did not trade in is not chased for returns.
- **Menu** in four groups: Finance (overview, reports, bank, income tax), Income, Spending, and
  Books (accounts, journal, periods, tax rates, settings).
- **Lists** (invoices, bills, expenses): a summary strip of amounts that link to their slice, status
  tabs with counts (All, Draft, Awaiting payment, Overdue, Paid), then the table, with the balance
  due right-aligned and "due in 5 days" or "12 days overdue" under a due date.
- **Amounts** go through one component: tabular figures, right-aligned, a negative in parentheses
  and red (`accountingText`), zero muted where a balance is empty.
- **Documents** (invoice, bill, expense) open with a summary band (the amount still owed, how
  pressing, the key facts), show the one main next step as a button, put everything else under
  "More" (a dialog opened from that menu is controlled and lives outside it), and end with a
  History timeline of what happened to it, in order.
