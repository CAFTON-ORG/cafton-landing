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

## Lead capture (CRM)

**Inquiry**:
A submission of the public contact form. Becomes a Lead in Phase 3.
_Avoid_: ticket, message.

## Money (from Phase 4)

**Amount**:
An integer in minor units (centavos) plus an ISO currency code. Never a float.
