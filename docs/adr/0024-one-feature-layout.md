# 0024 - One layout for every feature

Supersedes the feature-folder part of ADR 0004.

## The problem

Features had grown different shapes: `actions.ts` in some and an `actions/` folder in others,
`repository.ts` next to `repository/`, and finance kept area files at the root (`bank-repository.ts`,
`bank-schemas.ts`, `bank-types.ts`). Finding where a thing lives meant knowing which feature you were
in, and lifting the server code into an API later would have meant untangling it first.

## The layout

```
features/<domain>/
├── types.ts | types/          shapes (a folder once there are several areas)
├── schemas.ts | schemas/      Zod, shared by the form and the action
├── rules.ts | rules/          pure business rules, no database, unit tested
├── repository/                data access, `server-only`
├── services/                  server logic that is not a request: transactions, jobs, email, event handlers
├── actions/                   "use server" mutations, thin
├── components/                UI, never imports repository or services
└── pdf/  table.ts             named extras
```

`repository/`, `services/` and `actions/` are always folders, with files named by area (`finance/
repository/invoices.ts`). `types`, `schemas` and `rules` are one file until a feature has several
areas, then a folder with `core.ts` plus one file per area. `src/features/structure.test.ts` fails the
build when a feature drifts, and `src/features/_template/` is the copy-me skeleton.

## Why it suits an API later

The layers follow `templates/api-postgresql-template` (routes, controllers, services, repositories).
Each layer calls only the one below: actions (controllers) call services, services call repositories.
To split an API out, `services/` and `repository/` move across unchanged, `actions/` become
controllers, and the pages call the API instead; `rules/` and `schemas/` are shared. The monolith
template's `queries.ts` and `actions.ts` pair maps to `repository/` reads and `actions/` here.

## Known gap

Some actions still hold their own transaction (finance posting, quote acceptance) instead of calling
a service. They follow the order guard, parse, write, audit, revalidate, and are covered by
integration tests, but extracting those transactions into `services/` is a tracked follow-up that
should happen before an API is split out (see the Phase 7 prerequisites in the roadmap).
