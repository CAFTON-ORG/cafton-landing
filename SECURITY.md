# Security

## Reporting a vulnerability

Please do not open a public issue. Email **security@cafton.com** with a description and steps to reproduce. We aim to acknowledge within 3 business days.

## Current controls

- Public site: security headers and a report-only CSP in `next.config.ts`; Cloudflare Turnstile and per-IP rate limiting on the contact form.
- Secrets only in environment variables, validated in `src/lib/env.ts`; `.env*` files are git-ignored.
- Components cannot import the database client (ESLint boundary).

## Required before the dashboard goes live (Phase 1)

- Invite-only staff accounts; authorization checked in the data access layer on every page and Server Action, not only in `proxy.ts`.
- RLS enabled on every table with no policies, so the Supabase public API can read and write nothing.
- Enforcing CSP for `/dashboard`, audit entry for every mutation.
- Finance and HR data: field-level permissions, backups confirmed, retention policy written.
