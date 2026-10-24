# Security

## Reporting a vulnerability

Please do not open a public issue. Email **security@cafton.com** with a description and steps to reproduce. We aim to acknowledge within 3 business days.

## Current controls

- Public site: security headers and a report-only CSP in `next.config.ts`; Cloudflare Turnstile and per-IP rate limiting on the contact form.
- Secrets only in environment variables, validated in `src/lib/env.ts`; `.env*` files are git-ignored.
- Components cannot import the database client (ESLint boundary).

- CRM files live in a private storage bucket that no signed-in user can reach directly (there are no storage policies for it). Only the server touches it, through the service-role key in `lib/supabase/admin.ts` (`server-only`, never a `NEXT_PUBLIC_` name), after checking the person's permission on the record; downloads use a link that expires after a minute. A test fails if a policy for the bucket appears or the key is read anywhere else.

## Required before the dashboard goes live (Phase 1)

- Invite-only staff accounts; authorization checked in the data access layer on every page and Server Action, not only in `proxy.ts`.
- RLS enabled on every table with no policies, so the Supabase public API can read and write nothing.
- Enforcing CSP for `/dashboard`, audit entry for every mutation.
- Finance and HR data: field-level permissions, backups confirmed, retention policy written.

## Dependencies

CI fails on any high or critical known vulnerability in what ships (`npm audit --omit=dev --audit-level=high`), and Dependabot opens weekly update pull requests. Keep `next` current: it has had critical advisories (remote code execution, denial of service in Server Actions) fixed in minor releases.

### Known advisories (reviewed, accepted)

- **GHSA-vfj7-8cjw-p6xm** (`braces`, stack exhaustion on deeply nested glob patterns), reached only through development tools: the `shadcn` package (its stylesheet is imported at build time) and `eslint-config-next`, via `fast-glob` and `micromatch`. No patched `braces` has been released (3.0.3 is the newest and is affected), so it can't be fixed from here, and npm's suggested "fixes" are downgrades. It is not in the production dependency tree, and these tools only expand patterns from this repository's own configuration, never from user input. Revisit when `braces` publishes a fix or `fast-glob` moves to another matcher.
