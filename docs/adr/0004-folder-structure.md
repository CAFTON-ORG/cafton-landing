# Folder structure and naming

Status: accepted, 2026-10-21

Compared against `templates/nextjs-template` (ADR 0002, 0006) and `projects/artist-app`. The template is the starting point, not a law: where Cafton has two surfaces (public site and dashboard) on two primitive libraries, the structure below is deliberately different, and the reasons are recorded here.

## The problem this fixes

The landing grew 17 sibling folders under `components/` (one per page, plus `layout`, `shared`, `theme`, `providers`, `sections`, `motion`, `three`, `consent`). Domain content lived in `data/`, `types/` and `lib/repositories/`, `lib/` mixed infrastructure with domain logic and copy, and the template's `marketing` name was `(site)`. Nothing said which code belonged to the public site, which to the dashboard, and which was truly shared.

## Layout

```
src/
  app/
    (marketing)/          public website routes (template name; URLs unchanged)
    dashboard/            internal system (Phase 1+)
    api/                  public form endpoints and webhooks only
  components/
    ui/                   shadcn primitives, Radix (public site). Generated; do not hand-edit.
    shared/               neutral ground: usable by BOTH surfaces, imports neither
    marketing/            everything specific to the public site
      layout/ patterns/ decor/ motion/ three/ consent/
      home/ about/ blog/ contact/ events/ partners/ portfolio/ privacy/ services/
    dashboard/            everything specific to the dashboard
      ui/                 shadcn primitives, Base UI (base-nova)
      (layout/ data-table/ shared/ arrive in Phase 1)
  features/               business domains
    <domain>/ types.ts, repository.ts, actions.ts, rules.ts, schemas.ts, lib/, components/ (dashboard UI only)
    cms/  crm/            (sales, delivery, finance, hr follow the roadmap)
  config/                 site.ts (name, URL, description, share image, theme key), navigation.ts, services.ts, values.ts
  providers/              app-wide React context: theme, consent, smooth scroll
  hooks/                  generic hooks used by more than one area
  lib/                    framework-level helpers, no domain: utils, env, db, fonts, seo, structured-data, consent, security/
  generated/              Prisma client (git-ignored)
```

## Decisions

1. **`(marketing)`, not `(site)`.** Same name as the template, and it says what the group is. `components/marketing/` mirrors it.
2. **One folder per surface.** `components/marketing` and `components/dashboard` each own their primitives, layout and composed pieces. The top level of `components/` is four folders: `ui`, `shared`, `marketing`, `dashboard`.
3. **`shared` is small on purpose.** Only code both surfaces may use and that imports neither's primitives: `logo`, `themed-image`, `json-ld`, `turnstile`. The old `shared/` held 19 files; 13 were site design-language pieces and now live in `marketing/patterns` (domain-free layout, list and pager pieces), `marketing/decor` (brand graphics) and `marketing/blog` (Author-aware). The theme toggle used the Radix `Button`, so it is a marketing component, not shared.
4. **Domain logic leaves `lib/`.** `lib/` stays framework-level (the template's own `lib/README.md` rule). Blog/event helpers and the content types, data and repositories moved to `features/cms`; the contact schema, options and (later) the lead intake to `features/crm`; rate-limit and Turnstile verification to `lib/security`; copy-like constants (services, values, navigation, site identity) to `config/`.
5. **Features own data and rules; surfaces own presentation.** The template puts domain-aware components in `features/<domain>/components`. We keep that for dashboard UI only. Public rendering of CMS content (`marketing/blog`, ...) stays in `components/marketing` and imports only a feature's `types` and `repository`. Putting both in a feature would mix two primitive libraries in one folder and defeat the lint boundary.
6. **Providers are not components.** Theme, consent and smooth-scroll providers and the theme context moved to `providers/` (template convention).
7. **Single-use helpers sit beside their only user.** The 3D hooks and mark geometry are in `marketing/three`, `hero-ready` in `marketing/motion`.
8. **`public/` root holds only files with external URLs** (favicons, app icons, the default share image, the logo). Page imagery is in `public/images`, `projects/`, `events/`, `partners/`.

## Enforced by ESLint (`no-restricted-imports`)

| Code in | May not import |
| --- | --- |
| everything except dashboard UI | `components/dashboard` |
| `components/dashboard`, `app/dashboard`, `features/*/components` | `components/ui`, `components/marketing` |
| `components/shared` | `components/dashboard`, `components/ui`, `components/marketing` |
| any `components/**` | `lib/db`, `generated/*` |

## Deliberately not adopted from the template

- `components/layout` meaning the dashboard shell (ours will be `components/dashboard/layout`).
- `config/marketing.ts` as one copy file: Cafton's page copy is rich and per-page, and moves into the CMS in Phase 2.
- `lib/hooks`: we keep `src/hooks` (the shadcn alias) for generic hooks.
- Feature-to-feature imports of `components/` (see ARCHITECTURE.md rule 5).

## Still to do (tracked in ROADMAP)

- Phase 2 replaces `features/cms/content` with the database; `repository/` keeps its signatures.
- Phase 3 grows `features/crm` (leads, deals) around the existing contact schema.
