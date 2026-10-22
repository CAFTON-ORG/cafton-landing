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

## Editing

A built-in **Content Editor** role (`content:view/create/update/publish`, no delete) writes and publishes; Sales and Viewer can read but not change content. The blog post editor takes a title, excerpt, body (paragraphs separated by a blank line), author, category, date, web address and cover images (a path on this site or an https address, never `javascript:` or `data:`). Publishing needs a title, an excerpt, a body and alt text for any cover image, checked in the editor, in the action and (the first three) by a database constraint. Published content has to be unpublished before it can be deleted. Every change writes an audit entry in the same transaction, and the public pages that show the content are revalidated. Photo galleries inside an article are kept untouched on save until the media library exists. Projects (with gallery), events (prizes, steps, facts, promo, poster, dates in Philippine time), partners and service FAQs have the same kind of editor. A unit test per editor proves that opening an item and saving it unchanged leaves the public content identical for everything the site shipped with.

## Site documents

Text that is not a list of items (company settings now; SEO, About, Home, Careers, Privacy and Legal next) lives in one table, `site_content`: one row per key, the value a JSON object whose shape is a Zod schema in code. It follows the same rules as the lists: the bundled value is the fallback before the first seed, when the database fails, and when a stored document no longer matches its schema (logged, never a crash). Saving needs the `settings:update` permission, is audited, and refreshes the whole site. The database only guarantees that the key is a short lower-case name and the value an object; the application owns the rest.

Editable pages are registered in `features/cms/site/registry.ts` (bundled content, Zod schema, form spec). One generic editor and one server action serve them all, so a new page of text needs no new editor code; see ADR 0008 for how the forms look. Policy pages use a small text format (paragraphs, bullets, bold, links, a few tokens) rendered as React elements, never as HTML.

## Authors

Only people with a staff account can be credited. Choosing one creates (or refreshes) an author row from their profile: name and Google photo, with the byline subtitle "Software development". The id is `staff-<profile id>`, so no second list of people is kept. Bundled content keeps one internal author as its fallback; it is never offered in the editors.

## Image library

Images live in the public Supabase Storage bucket `media` (raster only, 5 MB). Uploads go through a Server Action, never straight from the browser: the file is identified by its bytes (not its name or declared type), decoded, re-encoded without metadata (no EXIF or GPS), capped at 2400 px, and stored under a random `content/<uuid>.<ext>` path. Storage policies require a staff profile as a second lock. Each image has a default description (alt text) offered when it is picked; publishing content with an image requires alt text. An image can't be deleted while any content (including drafts, galleries and posters) still mentions it. Uploads are limited to 4 MB because hosts cap request bodies.

## Not in this slice

- Scheduled publishing, revision history, SEO fields per item and live preview (Phase 8). Existing images under `public/` keep working: any address is accepted; only new uploads use the library.
- Editing photo galleries inside a blog article (the editor keeps them untouched).
- Editing legal pages and the cookie table (still in `content/privacy.ts`) and the service pillars (`config/services.ts`).
- Per-request caching: static pages are regenerated on demand by the editors (`revalidatePath`) rather than cached by tag.
