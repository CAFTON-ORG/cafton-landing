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

## Money (from Phase 4)

**Amount**:
An integer in minor units (centavos) plus an ISO currency code. Never a float.
