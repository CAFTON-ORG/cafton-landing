# CMS: the website's content lives in the database

Status: accepted, 2026-10-21 (Phase 2)

The blog, portfolio, events, partners and service FAQs moved from TypeScript files to Postgres so staff can edit them without a deploy. The files stay as the seed source and as a safety net.

## Goal: nothing visitors can see changes

The seed copies `src/features/cms/content/*` into the tables unchanged, and the repositories read them back in the same shapes. This is enforced, not hoped for:

- `src/features/cms/cms.integration.test.ts` seeds a real Postgres (PGlite, built from the real migrations), reads through the real repositories and asserts the result is **deeply equal** to the bundled content.
- The public site was built twice, once from the files only and once from the seeded Supabase database, and `npm run snapshot:check` showed all 23 public pages identical.

## Model

`authors`, `blog_posts`, `portfolio_projects`, `events`, `partners`, `service_faqs`. Anything filtered, sorted or linked is a real column; rich optional parts (gallery, prizes, steps, facts, promo, links, logo) are JSON validated by `features/cms/schemas.ts` on read (a bad value drops that part and logs; it never crashes a page). Authors use their own stable key as id (`cafton`) because content refers to it. Lists that are not date-ordered have an editor-controlled `position`.

Database rules, below the application: slugs are lowercase-hyphen and unique among live rows (partial unique index), publishing a post needs a title, excerpt and body, an event cannot end before it starts, an author with content cannot be deleted, RLS on every table. `updated_at` has a database default so raw SQL (the seed) works.

## Where a read comes from (`repository/source.ts`)

1. No database configured (CI, a fresh clone): the bundled content.
2. Database configured but a content type was **never populated** (migrations run, seed forgotten): the bundled content, so a missed seed cannot blank the site.
3. Once any row exists (even an unpublished or deleted one) the database is authoritative: unpublishing everything on purpose really empties the list.
4. The database errors: log it and serve the bundled content, so an outage cannot break a page or the build.

Only `published`, not deleted, rows are public.

## Seeding

`npm run db:seed-content` adds what is missing and never touches existing rows, so edits made in the dashboard survive a re-run. `npm run db:seed-content -- --overwrite` resets rows from the files (it loses edits). It uses `DIRECT_URL`/`DATABASE_URL` and runs in one transaction.

## Not in this slice

- Media library on Supabase Storage (images are still paths under `public/`).
- Scheduled publishing, revision history, SEO fields per item, live preview.
- Editing legal pages and the cookie table (still in `content/privacy.ts`) and the service pillars (`config/services.ts`).
- Per-request caching: static pages are regenerated on demand by the editors (`revalidatePath`) rather than cached by tag.
