# Two UI primitive sets: Radix for the site, Base UI for the dashboard

Status: accepted, 2026-10-21

The public site's look must not change. Its primitives (`components/ui`, shadcn `new-york`, Radix) stay as they are. The dashboard uses the nextjs-template's shadcn `base-nova` set (Base UI), kept in `components/dashboard/ui`.

## Rules

- ESLint (`no-restricted-imports`) forbids the public site importing `components/dashboard`, and the dashboard importing `components/ui` or `components/marketing` (see ADR 0004). Components never import `@/lib/db`.
- Design tokens are shared: the dashboard reads the same `--background`, `--primary`, ... from `globals.css`, so it follows Cafton's palette and the existing light/dark switch. Sidebar tokens (`--sidebar*`) were added; the public site does not use them.
- `shadcn/tailwind.css` is imported in `globals.css` for the `data-open`, `data-checked`, ... variants Base UI primitives rely on. The landing uses none of these variant names (checked), so its output is unaffected.
- Adding a primitive: copy it from `templates/nextjs-template/src/components/ui` (or generate it with the shadcn CLI in a scratch project using `base-nova`), then rewrite imports to `@/components/dashboard/ui/*`. `sonner.tsx` uses the landing's `useTheme`, not `next-themes`.
- Base UI differs from Radix: `render={<Button />}` instead of `asChild`, `data-*` state attributes. Adapt snippets found online.

## Revisit

After Phase 8, consider moving the site to one set if it can be done without visual change.
