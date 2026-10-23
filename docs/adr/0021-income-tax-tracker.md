# 0021 - The income tax tracker (8% option)

The business is registered with the BIR on the **8% income tax option** and is not VAT-registered
(ADR 0015). Instead of income tax on profit and a percentage tax, it pays 8% of its gross receipts
above 250,000 pesos a year. The tracker keeps the deadlines, works out what each return should come
to, and records what was filed and paid. It does not file anything with the BIR, and its figures are
**estimates for the accountant to confirm**.

## The returns

Four a year: the quarterly return **1701Q** for the first, second and third quarters, due 15 May, 15
August and 15 November, and the annual **1701A**, due 15 April after the year. Each return works on
the **year so far** (from 1 January to the end of its period), not on the quarter alone.

## The estimate

For a return: gross receipts so far, minus the 250,000 allowance (never below zero), times 8% (one
rounding, to the centavo). Take off what earlier returns of the year settled; that leaves what this
one must settle. Tax clients withheld (creditable withholding tax, form 2307) is credited first, up to
what is owed, and the rest is the cash to pay. If earlier returns paid more than the year so far
comes to, it says so (and doesn't go negative): whether to carry it over is the accountant's call.

**Gross receipts** are the income accounts in the books, so they follow what has been invoiced or
otherwise recognised, not only what has been paid. Creditable withholding tax available is what
clients withheld (debits to the account) by the end of the period, less what recorded filings have
already used, whatever date those were filed on (filings are made after the period they cover, so
counting by date would miss them).

## Recording a filing

Once a return's period has ended, someone with `finance:post` records the filing: the date, the
BIR's reference number, the cash paid and the withheld tax used (both start at the estimate), and
the account paid from. It is booked as **income tax expense** (the total settled) against the cash
paid from and the creditable withholding tax account, so the ledger, the tracker and the reports all
agree; a return with nothing to pay is a nil return with nothing posted. The estimate at the time is
kept beside what was declared.

Returns are recorded in order (each builds on what the earlier ones settled). A recorded filing is
fixed by the database and only changes by being **voided** with a reason, which reverses its
posting; a return that builds on it must be voided first, and a voided return can be recorded again.
Only one live filing exists per return per year (a partial unique index).

## Reminders

The daily cron notifies the people who can record filings when a return is due within 14 days and
once for each week it stays late, each claimed through the reminder log so it is sent once.

## Not built

Filing electronically, the BIR forms themselves, and percentage or VAT returns (not applicable
under the option). The 250,000 allowance and the 8% rate are constants in `tax.ts`; if the law or the
business's registration changes, that is the one place to change them.
