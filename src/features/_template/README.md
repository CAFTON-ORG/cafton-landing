# `features/_template/`: copy me to start a feature

```
cp -r src/features/_template src/features/<name>
```

Then work down the list, deleting each README as the real file replaces it. The layout is the same
for every feature (ADR 0024) and `src/features/structure.test.ts` fails when a feature drifts.

```
<name>/
├── types/              shapes the feature passes around (`core.ts`, then one file per area)
├── schemas/            Zod: shared by the form and the action
├── rules/              pure business rules: no database, no `server-only`, unit tested (`core.ts` + areas)
├── repository/         data access: the only code that touches the database. `server-only`.
├── services/           server logic that is not a request: transactions, jobs, email, event handlers. `server-only`.
├── actions/            "use server" mutations: thin. guard, parse, call a service or repository, audit, revalidate
├── components/         UI. Never imports repository or services
├── pdf/               named extras when needed (a PDF layout). List state (search, sort, filters from the URL) is `rules/table.ts`
```

## Data flow

Read: page (Server Component) → `repository/` → database.
Write: `<form action>` → `actions/` → `schemas` parse → `services/` or `repository/` → audit → `revalidatePath`.

Each layer only calls the one below it. That is also what makes a later move to a separate API
mechanical: `actions/` become controllers, `services/` and `repository/` move across unchanged
(the same three layers as `api-postgresql-template`), and the pages call the API instead.

## Checklist

1. `types/core.ts`, then `schemas/core.ts`.
2. `rules/core.ts` for anything with a decision in it, with a `core.test.ts` beside it.
3. `repository/<area>.ts` (`import "server-only"`): reads and writes, owner or permission scoped.
4. `services/<area>.ts` only when an action needs more than one repository call in a transaction, or a job or email needs the same logic.
5. `actions/<area>.ts`: `"use server"`, `requirePermission()` first, then parse, write, audit, revalidate.
6. `components/`, then the route under `src/app/dashboard/<name>/` and the nav entry in `src/config/dashboard-navigation.ts`.
7. Permissions in `src/lib/auth/permissions.ts`; a `<name>.integration.test.ts` against the real migrations.
