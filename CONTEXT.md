# Cafton platform: vocabulary

Terms used across code, docs and conversations. Add a term here before using it in a second place. Domain sections grow with each roadmap phase.

## Application structure

**Surface**:
One of the two faces of the app: the public website (`app/(marketing)`, `components/marketing`) or the internal system (`app/dashboard`, `components/dashboard`).
_Avoid_: site/admin (ambiguous), frontend/backend.

**Marketing site**:
The public website: home, services, portfolio, blog, events, about, careers, contact, legal pages.
_Avoid_: landing (it is more than one page), website (when the dashboard is also in scope).

**Dashboard**:
The authenticated internal system for Cafton staff, under `/dashboard`.
_Avoid_: admin panel, backoffice, CMS (the CMS is one module of it).

**Feature (module)**:
A business domain folder under `src/features/<domain>/` owning its types, rules, repository, actions and schemas. Dashboard UI for the domain may sit in its `components/`.

**Repository**:
The only code that queries the database (`features/<domain>/repository`). Public pages read through it too.
_Avoid_: DAO, model, service.

**Server Action**:
A `"use server"` function in a feature's `actions.ts`. Every one runs `requirePermission`, validates with Zod, writes inside a transaction and records an audit entry.

**Shared**:
Code usable by both surfaces that imports neither surface's primitives (`components/shared`).

## Access

**Staff**:
A person with a dashboard account. Created only by invitation.
_Avoid_: user, admin, employee (an Employee is an HR record; not every staff member has one and vice versa).

**Permission**:
A `resource:action` string such as `deals:close`.

**Role**:
A named set of permissions assigned to staff.

**Audit entry**:
An append-only record of who changed what and when.

## Content (CMS)

**Content item**:
A blog post, portfolio project, event, partner, service or legal page managed in the CMS.

**Published**:
Visible on the marketing site. Only content with the required fields can be published; published content must be unpublished before deletion.

## CRM

**Lead**:
A website enquiry: one submission of the contact form, kept whole. Status: new, qualified, disqualified or converted. Not yet a relationship.
_Avoid_: inquiry, ticket, prospect.

**Contact**:
A person we deal with. Email addresses are unique among live contacts. Created by converting a lead, or by hand.
_Avoid_: customer, client (a Contact may never buy).

**Organization**:
A company, school or group that contacts belong to.
_Avoid_: account, company.

**Deal**:
One opportunity to sell, tied to a contact (and usually an organization), moving through the pipeline. Has an estimated value until it is won, then a final, locked one.
_Avoid_: opportunity, project (a Project exists only after a deal is won, from Phase 5).

**Pipeline stage**:
A step a deal moves through. Each has a win probability. Open stages: New, Discovery, Proposal, Negotiation. Closing stages: Won and Lost.
_Avoid_: status.

**Convert**:
Turn a lead into a contact, an organization and a deal in one step.

**Timeline**:
The history of a lead, contact or deal: notes, calls, emails, meetings and automatic stage changes.
_Avoid_: activity log (that is the Audit log).

**Task**:
A dated follow-up, optionally attached to a lead, contact or deal and assigned to a person.

**Weighted forecast**:
The sum of each open deal's value times its stage's win probability.

**Pipeline**:
An ordered set of stages a deal moves through. There can be several; every one ends with its own Won and Lost stages, and a deal never changes pipeline. Edited under CRM > Pipelines by an administrator.

**Tag**:
A short label on a lead, contact, organization or deal, used to filter and to act on many records at once. Stored as a list on the record, not as a separate table.

**Saved view**:
A list's search and filters kept under a name, personal or shared with the people who can edit that list. The page number is never saved.

**Merge**:
Combining duplicate contacts or organizations into one kept record. Deals, tasks, meetings and timeline move to it, gaps in its details are filled, and the others are removed, all in one audited step.

**Notification**:
An in-app message for one staff member (new enquiry, meeting request, something assigned, a task due), shown in the bell. It never tells you about your own action.

**Meeting**:
A booked time with a contact, asked for on the contact form or scheduled by staff. The database refuses overlapping meetings.

**Lead score**:
A number from 0 to 100 showing how ready an enquiry looks, worked out from what the contact form asked (budget, timeline, business size, role, how they found us, contact details). Hot is 60 or more, Warm 35 or more, Cold below. A hint for who to call first, with every reason shown; it never qualifies a lead.

**Turn order**:
The staff switched on under Users to take new website enquiries. Each new enquiry goes to whoever was given one least recently; with nobody switched on, enquiries stay unassigned.

**Custom field**:
An extra fact an administrator adds to leads, contacts, organizations or deals (text, number, date, a choice from a list, or yes or no). Its values are kept on the record. Archiving a field hides it but keeps its values.

**Record file**:
A document or image attached to a lead, contact, organization or deal, kept privately and opened through a link that expires after a minute.

## Sales

**Catalog item**:
Something we sell, with a pricing model (fixed, hourly or retainer), what one unit is (project, hour, month, and so on), a price per unit in minor units, and whether VAT is added.

**Quote**:
A priced offer for a deal, numbered like QT-2026-0001. A deal has at most one live quote. Only a draft can be edited; once sent, its wording and figures are frozen.
_Avoid_: proposal, estimate (Proposal is also a pipeline stage).

**Quote version**:
A revision of a sent quote. It is a new row with the next version number and the same reference; the old one becomes "replaced by a newer version".

**Approval**:
A second person's sign-off before a quote can be sent: required at a total of P250,000 or more, or when any line has a discount above 15%. You cannot approve a quote you wrote, unless you are an Owner.

**Public link**:
The secret address a client uses to read, accept or decline a quote or contract. Only a hash of it is stored; the link is shown once, when sent or renewed.

**E-acceptance record**:
What is kept when a client accepts: the name they typed, when, their address and browser, the exact total, and a fingerprint of the wording that proves nothing changed since it was sent.

**Deposit**:
The share of a quote's total due when it is accepted; the rest is due on completion, or as the payment terms say.

**Contract**:
A service agreement or statement of work (SOW) drafted for a deal from an accepted quote and a template, signed online with the same kind of record as a quote.

**Contract template**:
Reusable contract wording with merge fields such as the quote reference, filled in when a contract is drafted.

## Website content (CMS)

**Draft / Published**:
A piece of content is a draft until it is published. Only published content is on the website. Published content must be unpublished before it can be deleted.

**Content Editor**:
The built-in role that writes and publishes the website's content but cannot delete it or touch anything else.

**Page content**:
The wording of a fixed page of the website (About, Home, Services, Careers, Contact, Privacy, Legal), edited under Website > Content > Pages.

**Site settings**:
The company facts shown across the public site: description, slogan, contact email, location, booking link, badges and social links. Edited under Website settings.

**Author**:
The person credited on a post, project or event: always a staff member, shown with their name and photo.

**Image library**:
The images uploaded for the website, each with a description (alt text). An image in use can't be deleted.

**Bundled content**:
The content the site shipped with, kept in `features/cms/content`. It is the seed for the database and the fallback if the database is unavailable or has never been seeded.

## Money (from Phase 4)

**Amount**:
An integer in minor units (centavos) plus an ISO currency code. Never a float.
