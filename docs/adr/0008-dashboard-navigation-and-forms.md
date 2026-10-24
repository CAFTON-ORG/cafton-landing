# 0008: Dashboard navigation and long forms

Status: accepted.

## Context

The dashboard grows by a module every phase (website, CRM, sales, finance, HR). A flat list of
every page does not survive that: the sidebar scrolls, people stop scanning it, and phones
cannot show it. Long forms (page text, settings) had the same problem: one tall column and a
save button out of reach.

## Decision

**Navigation.** One list, `config/dashboard-navigation.ts`, feeds the sidebar, the drawer, the
breadcrumbs and the command palette.

- A few top-level **groups** (Website, CRM, Administration) that fold. Like a Discord category, **any
  section can be folded, including the one holding the current page, and a folded section still
  shows the page the person is on**, so folding never loses their place. A section they never
  touched follows the page (the current one is open, the rest closed); what they chose is
  remembered in the browser.
- Inside a group, at most **one level of parent** (`{ label, icon, children }`), such as
  Website > Content > Blog posts. Deeper trees are hard to scan and impossible on a phone.
- A **collapsed sidebar** shows a parent as one icon that flies out on hover, focus or tap.
- The **command palette** (Ctrl or Cmd K) reaches every page by name or keyword, so the tree
  never has to hold everything in view.
- Related settings share one page with **link tabs** (Website settings: General, Search and
  sharing), not two sidebar entries. Each area has an **overview page** as its landing place.

Alternatives we looked at: a top module switcher with a separate sidebar per module (good past
about six modules; revisit then), a pinned favourites list, and a hover-only mega menu (fails on
touch and for keyboard users, so it is used only for the collapsed rail, with a click fallback).

**Forms.** Long forms are split with the standard shadcn tab list (wrapping, never a scroll
container) or, for many sections, a select. They share one sticky **save bar** that shows
whether anything is unsaved and offers Discard. Editors warn before leaving with unsaved changes.
Document editors are generated from a plain-data field spec (`features/cms/site/spec.ts`) so every
page of site content looks and behaves the same, and each one is validated on the server by its
own Zod schema.

## Layout and actions of every editing page

One layout, so a person who has used one editor can use all of them (ISO 9241-110, conformity with
user expectations and consistency; WCAG 2.2 3.2.4, consistent identification; Nielsen heuristic 4).

- **Two columns** (`EditorLayout`): the work on the left (about two thirds), and on the right a
  rail for what describes the work: status and readiness, details, a live preview, short help. On a
  phone the rail stacks under the work. Pages no longer stop at a narrow column on a wide screen.
- **One place for actions** (`FormActions`): the first card of the rail, which is **sticky** (it
  stays in view while the work scrolls, and scrolls inside itself only if it is taller than the
  screen, as in the artist app). Top to bottom: status, the primary **Save**, the secondary action
  (Publish or Unpublish), Discard, then links ("View on the site"). Nothing else on a page
  carries Save. A save bar at the bottom of a long page was rejected: it puts the action far from
  the field being edited and from where the eye rests. Below the `lg` breakpoint the rail sits
  under the form, so a small bar with Save is fixed to the bottom of the screen instead.
- **Aligned columns**: both columns start on the same line. Anything that sits above the work
  (the tab list, a page picker) either spans both columns or lives inside the first card.
- **Tabs or a select inside the work column** when a form is long, never a second scroll area.
- ISO 9241-110 asks for consistency and does not fix where a button goes; sticky actions in the
  right rail follow Shopify, WordPress and the artist app. It is a convention we apply
  everywhere, not a requirement we met.
- **Long repeated items** (service areas, roles, sections) fold to one line with a summary and open
  on demand, so a long list is not a long page.
- Controls are at least 24 px with room around them (WCAG 2.2, 2.5.8). Text on tinted panels uses
  `foreground/70`, not `muted-foreground`, which fails AA there.

## CRUD performance

- Lists read only the columns they show, not whole rows with article bodies and JSON.
- The count and the page of rows are read in one round trip; a second read happens only when the
  requested page is past the end.
- A saved page of text refreshes that page only; text that appears in the footer, menu or shared
  call to action refreshes the whole site.
- Reads of site content are cached per request, and writes are one transaction with the audit entry.

## Consequences

Adding a page of site content is one registry entry plus a spec. Adding a module is one group.
The sidebar stays short however many pages exist.
