# 0019 - Bank accounts, statement import and reconciliation

The books say what should be in the bank; the bank statement says what is. Reconciling is checking
the two agree, line by line, so a missing payment, a bank charge or a typing mistake shows up.

## Model

- A **bank account** is tied (once) to an asset account in the chart. Only the last few digits of the
  real number are kept, to tell two accounts apart.
- A **statement line** is what the bank says happened: a date, a description, an amount (positive in,
  negative out) and sometimes a balance. After import it is never rewritten or deleted (a trigger);
  only the decision about it changes.
- Each line is **matched** to a posting on the bank's ledger account (the same amount in the same
  direction; the database refuses any other, and a posting can be matched to one line only),
  **booked** (a new entry is posted between the bank and an account chosen, then matched, for a
  bank charge, interest or a deposit the books lacked), or **set aside** with a reason (something
  that cancels itself out).

## Import

A CSV with a date, a description and an amount, or separate debit and credit columns. Banks write
dates in different orders, so the person says which, and a **preview** shows the first lines as read,
the range, what is already imported, and any rows that couldn't be read (by line number). Nothing is
written until they confirm. Each line has a fingerprint (date, amount, description, reference and its
number among identical lines in the file), so overlapping statements never double a line while two
genuine identical lines (two ₱50 fees on a day) both stay.

## Matching

"Match what is certain" pairs a line with a posting only when it is the only candidate (same amount
and direction, within a week) and that posting has no other candidate line. Anything less certain is
chosen by a person from suggestions, nearest date first. A posting that was reversed, and its
reversal, are left out of the candidates.

## Signing off

A period (say a month) is signed off when its statement lines add up (opening balance plus lines
equals closing balance, both printed on the statement) and every line in it is matched, booked or
set aside. It is a record that is never changed, and inside it no line can change or arrive (a
trigger): a later import skips lines dated in a signed-off period.

## Permissions

`bank:view`, `bank:manage` (add accounts, import) and `bank:reconcile` (match, book, set aside, sign
off). All three are administration.
