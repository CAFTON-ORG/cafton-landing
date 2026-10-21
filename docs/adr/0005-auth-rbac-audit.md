# Staff authentication, RBAC and audit

Status: accepted, 2026-10-21 (Phase 1)

## Authentication

- Supabase Auth with Google as the only provider. Supabase is used for Auth and Storage only; all data goes through Prisma.
- **Invite-only.** An `AFTER INSERT` trigger on `auth.users` (`handle_new_user`) rejects any email that is not in `staff_invites` and otherwise creates the `profiles` row with the invited role. For someone whose auth user already existed, `getStaff()` claims the matching invite on their next sign-in. The invite email is read only from the signed token's `email` claim, and only for Google sign-ins; `user_metadata` is never trusted.
- **Bootstrap.** Nobody can invite anyone until one person has access, so the first owner comes from the command line: `npm run staff:invite -- you@gmail.com owner`.
- **Where authorization happens.** `src/proxy.ts` refreshes the session and does an optimistic redirect to `/login`. It is not a security boundary. The real checks are `verifySession()` in the dashboard layout, `requirePageAccess()` in each page and `requirePermission()` at the top of every Server Action (`src/lib/auth/dal.ts`).
- **Sign-out** is a POST with an origin check.
- **Development without Supabase.** Outside production, when Supabase or the database is not configured, `getStaff()` returns a synthetic preview owner (`dev-preview`). In production it returns null.

## Authorization (RBAC)

- A permission is `resource:action` (`users:invite`). The catalogue is `src/lib/auth/permissions.ts`; each phase adds its resources.
- A role is a set of permissions; a person has exactly one role. Built-in roles (`owner`, `admin`, `viewer`) are rows flagged `is_system` whose permissions come from **code**, so new permissions reach them with no data migration. Custom roles store their permissions in `role_permissions`.
- UI checks (hidden menu items, disabled buttons) are cosmetic. The server enforces the same rules from pure functions in each feature's `rules.ts`.
- Safety rules, tested: you can only grant or assign permissions you hold (no privilege escalation); you cannot change your own role or remove yourself; there is always at least one owner; only an owner can change or remove an owner; built-in roles cannot be edited or deleted; a role in use cannot be deleted; granting any permission also grants `view` for that resource.

## Audit

- Every mutation records an `audit_log` row **in the same transaction** as the change (`recordAudit(staff, entry, tx)`), so history and state cannot disagree.
- The table is append-only in the database itself (triggers raise on UPDATE, DELETE and TRUNCATE), not just by convention. The actor name is stored as a snapshot so history still reads correctly after a person is removed.

## Data API lockdown

RLS is enabled on every table with no policies. The public Supabase API (anon and authenticated keys) can read and write nothing; Prisma on the server is the only path. A migration test (`src/db/migrations.test.ts`) asserts this for every table.

## Consequences

- Removing a person deletes their `profiles` row and invite but not their Supabase auth user; without a profile or invite they cannot get in.
- Audit retention and export are not built yet (Phase 8).
- Email delivery of invitations is not built; the owner tells the person to sign in. Resend arrives in Phase 8.
