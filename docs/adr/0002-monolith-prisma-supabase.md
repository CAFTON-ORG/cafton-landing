# Monolith on Prisma/Postgres, Supabase for Auth and Storage

Status: accepted, 2026-10-21

Follows the nextjs-template's monolith mode (its ADR 0005) and the pattern proven in `artist-app`.

- Reads: Server Component -> `features/<domain>/repository.ts` (`server-only`, the only code that queries).
- Writes: Server Action -> `requirePermission` -> Zod -> transaction -> audit -> `revalidatePath`/tag.
- Database: Supabase Postgres via Prisma 7 with `@prisma/adapter-pg`. RLS on every table with no policies; Prisma is the only data path. Supabase is used for Auth and Storage only.
- Auth: Google sign-in, invite-only, DB-backed RBAC.
- Not adopted: the template's Express API, email-OTP auth, `/api/[...path]` proxy and TanStack Query data layer. `api-postgresql-template` stays the extraction target if a mobile app or partner API is built; because modules own their repository and rules, moving a `repository.ts` + `actions.ts` pair behind HTTP is mechanical.

## Conventions

- Money: integer minor units plus an ISO currency code on every amount. Never floats.
- Deletion: soft delete (`deletedAt`) on business records; finance records are voided or reversed, never deleted.
- Cross-module effects (won deal -> project, invoice) go through domain events, not direct imports of another module's internals.
- Features do not import each other's `components/`.
