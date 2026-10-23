# 0020 - Financial reports

Every report is built from the ledger and nothing else, so they cannot disagree with each other or
with the books, and a posting made anywhere (an invoice, a bill, a bank line) shows up everywhere.

## One description, three outputs

A report is built as a plain **description** (`ReportSpec`: a title, a subtitle, columns, and
sections of rows with a label, an account code, figures and a kind: line, subtotal, total or note).
The screen, the CSV and the PDF are all drawn from that one description, so a downloaded file always
matches what was on screen. The builders (`reports.ts`) are pure: account totals in, description out.

## The reports

- **Profit and loss** over a period: income, expenses, profit before income tax, income tax, net income.
- **Balance sheet** as of a day: assets, liabilities, equity. Year-end closing is not built yet, so
  income and expense accounts are not zeroed at year end; the sheet therefore shows _earnings from
  earlier years_ and _earnings this year_ (the calendar year) as separate equity lines, worked out
  from the ledger, and always balances. If it ever did not, it says so in a note.
- **Trial balance** as of a day: each account's net balance in the debit or credit column.
- **Cash flow** over a period, by what was on the other side of each cash movement. Every entry that
  touched a cash account (the cash and bank roles, and any bank account's ledger account) credits its
  other lines with the cash they brought in (credit minus debit), which adds up exactly to the cash
  the entry moved; moves between two cash accounts cancel. Rows are grouped: received from
  customers, tax withheld by clients, paid to suppliers and for expenses, paid back to people who
  covered costs, taxes paid over, other, and the owner's put in and taken out. It starts from the
  cash on the first day and ends at the cash on the last, and says so if that doesn't match the
  accounts.
- **Tax summary** over a period: gross receipts and sales, tax withheld by clients, tax withheld from
  suppliers to pay over, and output VAT (zero while not VAT-registered). The 8% estimate itself is the
  tax tracker (next).
- **Receivables and payables aging** are their own pages (ADR 0016 and 0017), linked from the hub.

## Dates and files

Periods and as-of days come from the link (`?from=&to=` or `?asOf=`), with ready-made choices (this
month, quarter, year, last year; today, end of last month, end of last year). Anything missing or not
a real date falls back to this year so far. `/api/finance/reports/<report>?...&format=csv|pdf`
returns the file; amounts in the PDF read "PHP 12,500.00" because the built-in PDF fonts have no
peso sign. All of it needs `finance:view`.
