# 0011 - Quotes and the catalog

## Decisions

- **Money is exact.** Prices are integer centavos and quantities are integer thousandths; line totals are computed in BigInt and rounded half up line by line, and VAT is rounded once on the taxable total, so the page always adds up (`features/sales/pricing.ts`, unit tested). The database also checks `total = subtotal + tax`.
- **One quote, many versions.** A quote has a number (`QT-2026-0001`, from a sequence) shared by its versions. Only a draft can be edited; to change anything after that you make a new version, and the old one becomes "replaced" (its link then says so). Only the newest version can be sent.
- **Approval is a second pair of eyes.** A quote at or above the limit (P250,000) goes to someone with `quotes:approve` before it can be sent. You cannot approve what you wrote unless you are an Owner, so a one-person team is never stuck. Under the limit it is approved when submitted. Both are audited.
- **The public link is a secret, not a login.** Sending makes a 256-bit random token; `/q/<token>` and its PDF show only what a client may see (no internal names or the contact's email), are never indexed or cached, and are rate limited.
- **E-acceptance is a record.** Accepting needs the client's typed full name and a ticked statement of the quote and total. We keep the time, the address, the browser and the exact total, so it stands as an electronic signature under the E-Commerce Act (RA 8792). Two answers at once cannot both win (a conditional update), and the first one is final.
- **An accepted quote is frozen in the database**, not only in the app: triggers refuse changes to its figures, wording and lines. The deal's value follows the accepted total; winning the deal stays a person's decision.
- **Domain events** (`lib/events.ts`): accepting emits `quote.accepted`. Delivery (projects) and Finance (invoice schedule) will subscribe in their own phases, so Sales never imports them.
- **Notifications run after the transaction,** never inside it, so a slow notification cannot hold a database transaction open.
- **PDF** is rendered with react-pdf. Its built-in fonts have no peso sign, so the PDF shows "PHP 12,500.00".

## Not done

Contracts and statements of work with e-acceptance, the sales dashboard, per-owner targets, and the project and invoice handlers for `quote.accepted`.
