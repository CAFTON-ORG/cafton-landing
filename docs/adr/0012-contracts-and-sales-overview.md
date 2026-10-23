# 0012 - Contracts, statements of work and the sales overview

## Decisions

- **A contract is drafted from a template, then frozen.** Templates are plain text with `{{merge_fields}}` (client, company, deal, and the accepted quote's total, deposit, balance, scope and payment terms). Drafting fills the fields in and stores the finished wording on the contract, so editing or deleting a template never changes a contract already made. Unknown fields are refused when a template is saved (`features/contracts/merge.ts`).
- **Same trust model as quotes.** Sending makes a 256-bit link of which only the SHA-256 hash is stored, fingerprints the wording (`sent_hash`), and emails the link and a PDF. Signing recomputes the fingerprint and refuses if the stored text no longer matches, then records the typed name, time, address, browser and `accepted_hash`. A database trigger freezes the wording once sent, and an accepted contract can never be deleted. The shared pieces (`generateToken`, `hashToken`) live in `features/sales/integrity.ts`.
- **Rules live in one pure file** (`features/contracts/rules.ts`), like quotes:

| Rule            | Detail                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lost deals      | No new contracts; contracts still out with the client are withdrawn when the deal is lost                                                            |
| One in progress | One draft or sent contract per deal and type (agreement or statement of work)                                                                        |
| Price first     | A statement of work, or any template that uses price fields, needs an accepted quote on the deal; a contract can only be linked to an accepted quote |
| Sign-by date    | Required, not in the past, at most 180 days out; a sent contract past its date is expired by the daily job                                           |
| Sending         | Draft only, with wording, a recipient email and a valid date, on a deal that is not lost                                                             |
| Withdrawing     | Only a sent contract, with a reason; a draft is deleted instead                                                                                      |
| Deleting        | Only a never-sent draft; a deal with a sent, signed or withdrawn contract cannot be deleted                                                          |

- **Permissions.** `contracts:view/create/update/send/delete` follow the quote pattern; `contracts:templates` and `targets:manage` are administrator powers (the Sales role does not hold them).
- **Starter templates** (a service agreement and a statement of work) are inserted by the migration so a new team can draft on day one. They are general wording and should be reviewed by the company's own counsel.
- **Event.** Signing emits `contract.accepted`. Delivery (Phase 5) will subscribe to start a project, as it will for `quote.accepted`.
- **The sales overview** (`/dashboard/sales`) is computed by one pure function (`features/sales/dashboard.ts`, unit tested): open pipeline value and its stage-weighted forecast, win rate (won / won + lost over the last 90 days, by count), average sales cycle (days from a deal's creation to won), and per person: open deals, pipeline, won in the month and progress against a goal. Months are calendar months in Manila time.
- **Targets** are one row per person per month (`sales_targets`, amount in centavos, unique on person + month). Setting or clearing one needs `targets:manage` and is audited. Unassigned deals are shown but have no goal.

## Not done

The project and invoice handlers for `quote.accepted` and `contract.accepted` (they belong to Delivery and Finance), per-pipeline or per-service breakdowns on the overview, and recurring (copy-forward) targets.
