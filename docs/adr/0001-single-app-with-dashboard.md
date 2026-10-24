# Public site and internal system in one Next.js app

Status: accepted, 2026-10-21

The public website and the internal system (CMS, CRM, sales, delivery, finance, HR) ship as one Next.js app. The public pages live in the `(marketing)` route group, the internal system under `/dashboard`.

## Considered options

- **Separate internal app.** Stronger isolation for HR and finance data; costs a second deploy and a contract (or shared DB) between the two.
- **Monorepo with `apps/web` and `apps/admin`.** Best long-term separation; needs the repo restructured first.
- **Same app (chosen).** One deploy, CMS edits go live without a sync step, one set of types.

## Consequences

- HR and finance code ships in the same deployable as the public site. Isolation depends on the DAL (`requirePermission` on every page and action), not on a network boundary.
- The root layout is bare (`<html>`, fonts, theme init script, metadata). Public chrome is `SiteChrome`, mounted by `(marketing)/layout.tsx` and the root 404. The dashboard has its own layout.
- Revisit a monorepo split if a mobile app or external API appears (planned) or an audit asks for isolation. Features keep to the folder rules in ARCHITECTURE.md so extraction stays mechanical.
