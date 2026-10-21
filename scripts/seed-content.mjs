// Copies the website's bundled content (src/features/cms/content) into the database, so the
// CMS starts with exactly what the site already shows.
//
//   npm run db:seed-content                 # add what is missing; never touches existing rows
//   npm run db:seed-content -- --overwrite  # reset rows that exist from the files (loses edits!)
//
// Uses DATABASE_URL from .env. Safe to run again: rows are matched by slug (or author id, or
// service + question) and skipped when they exist, so edits made in the dashboard survive.
// Everything is inserted as `published`, in the order the files list it.
//
// The content files are TypeScript; Node strips their (type-only) annotations itself.
import { pathToFileURL } from "node:url";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const json = (value) => (value === undefined || value === null ? null : JSON.stringify(value));

/**
 * @param client a connected `pg` client (or PGlite-compatible `query`)
 * @param content { authors, blogPosts, projects, events, partners, serviceFaqs }
 * @param options { overwrite?: boolean }
 * @returns counts per table: { inserted, updated, skipped }
 */
export async function seedContent(client, content, { overwrite = false } = {}) {
  const counts = {};
  const tally = (table) => (counts[table] ??= { inserted: 0, updated: 0, skipped: 0 });

  // Insert when missing; update when `overwrite`; otherwise leave alone.
  async function upsertBySlug(table, slug, columns, values) {
    const found = await client.query(`SELECT id FROM ${table} WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
    const count = tally(table);
    if (found.rows.length > 0) {
      if (!overwrite) return void count.skipped++;
      const sets = columns.map((column, i) => `${column.name} = $${i + 2}${column.cast ?? ""}`).join(", ");
      await client.query(`UPDATE ${table} SET ${sets}, updated_at = now() WHERE id = $1`, [found.rows[0].id, ...values]);
      return void count.updated++;
    }
    const names = ["slug", ...columns.map((column) => column.name)].join(", ");
    const params = ["$1", ...columns.map((column, i) => `$${i + 2}${column.cast ?? ""}`)].join(", ");
    await client.query(`INSERT INTO ${table} (${names}) VALUES (${params})`, [slug, ...values]);
    count.inserted++;
  }

  for (const author of content.authors) {
    const result = await client.query(
      `INSERT INTO authors (id, kind, name, role, avatar, url, updated_at)
       VALUES ($1, $2::author_kind, $3, $4, $5, $6, now())
       ON CONFLICT (id) DO ${
         overwrite
           ? "UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, role = EXCLUDED.role, avatar = EXCLUDED.avatar, url = EXCLUDED.url, updated_at = now()"
           : "NOTHING"
       }
       RETURNING (xmax = 0) AS inserted`,
      [author.id, author.kind, author.name, author.role ?? null, author.avatar ?? null, author.url ?? null],
    );
    const count = tally("authors");
    if (result.rows.length === 0) count.skipped++;
    else if (result.rows[0].inserted) count.inserted++;
    else count.updated++;
  }

  for (const [position, post] of content.blogPosts.entries()) {
    await upsertBySlug(
      "blog_posts",
      post.slug,
      [
        { name: "author_id" },
        { name: "title" },
        { name: "excerpt" },
        { name: "content", cast: "::text[]" },
        { name: "media", cast: "::jsonb" },
        { name: "date", cast: "::date" },
        { name: "category" },
        { name: "image_light" },
        { name: "image_dark" },
        { name: "image_alt" },
        { name: "status", cast: "::publish_status" },
        { name: "position" },
      ],
      [post.authorId, post.title, post.excerpt, post.content, json(post.media), post.date, post.category, post.imageLight ?? null, post.imageDark ?? null, post.imageAlt ?? null, "published", position],
    );
  }

  for (const [position, project] of content.projects.entries()) {
    await upsertBySlug(
      "portfolio_projects",
      project.slug,
      [
        { name: "author_id" },
        { name: "client" },
        { name: "title" },
        { name: "category" },
        { name: "services", cast: "::text[]" },
        { name: "summary" },
        { name: "description" },
        { name: "problem" },
        { name: "solution" },
        { name: "recognition" },
        { name: "image_light" },
        { name: "image_dark" },
        { name: "image_alt" },
        { name: "image_fit" },
        { name: "media", cast: "::jsonb" },
        { name: "live_url" },
        { name: "status", cast: "::publish_status" },
        { name: "position" },
      ],
      [project.authorId, project.client, project.title, project.category, project.services, project.summary, project.description, project.problem ?? null, project.solution ?? null, project.recognition ?? null, project.imageLight ?? null, project.imageDark ?? null, project.imageAlt ?? null, project.imageFit ?? null, json(project.media), project.liveUrl ?? null, "published", position],
    );
  }

  for (const [position, event] of content.events.entries()) {
    await upsertBySlug(
      "events",
      event.slug,
      [
        { name: "author_id" },
        { name: "title" },
        { name: "type" },
        { name: "tagline" },
        { name: "summary" },
        { name: "campaign_url" },
        { name: "starts_at", cast: "::timestamptz" },
        { name: "ends_at", cast: "::timestamptz" },
        { name: "closed" },
        { name: "poster", cast: "::jsonb" },
        { name: "about", cast: "::text[]" },
        { name: "prizes_heading" },
        { name: "prizes", cast: "::jsonb" },
        { name: "steps", cast: "::jsonb" },
        { name: "facts", cast: "::jsonb" },
        { name: "closed_title" },
        { name: "closed_note" },
        { name: "promo", cast: "::jsonb" },
        { name: "status", cast: "::publish_status" },
        { name: "position" },
      ],
      [event.authorId, event.title, event.type, event.tagline, event.summary, event.campaignUrl ?? null, event.startsAt ?? null, event.endsAt ?? null, event.closed ?? false, json(event.poster), event.about ?? [], event.prizesHeading ?? null, json(event.prizes), json(event.steps), json(event.facts), event.closedTitle ?? null, event.closedNote ?? null, json(event.promo), "published", position],
    );
  }

  for (const [position, partner] of content.partners.entries()) {
    await upsertBySlug(
      "partners",
      slugify(partner.shortName),
      [
        { name: "name" },
        { name: "short_name" },
        { name: "logo", cast: "::jsonb" },
        { name: "roles", cast: "::text[]" },
        { name: "featured" },
        { name: "description" },
        { name: "links", cast: "::jsonb" },
        { name: "status", cast: "::publish_status" },
        { name: "position" },
      ],
      [partner.name, partner.shortName, json(partner.logo), partner.roles ?? [], partner.featured ?? false, partner.description ?? null, json(partner.links), "published", position],
    );
  }

  for (const [serviceSlug, items] of Object.entries(content.serviceFaqs)) {
    for (const [position, item] of items.entries()) {
      const found = await client.query("SELECT id FROM service_faqs WHERE service_slug = $1 AND question = $2", [serviceSlug, item.question]);
      const count = tally("service_faqs");
      if (found.rows.length > 0) {
        if (!overwrite) {
          count.skipped++;
          continue;
        }
        await client.query("UPDATE service_faqs SET answer = $2, position = $3, updated_at = now() WHERE id = $1", [found.rows[0].id, item.answer, position]);
        count.updated++;
      } else {
        await client.query("INSERT INTO service_faqs (service_slug, question, answer, position) VALUES ($1, $2, $3, $4)", [serviceSlug, item.question, item.answer, position]);
        count.inserted++;
      }
    }
  }

  return counts;
}

async function main() {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
  const { default: pg } = await import("pg");

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DIRECT_URL or DATABASE_URL in .env first.");
    process.exit(1);
  }
  const overwrite = process.argv.includes("--overwrite");

  const dir = new URL("../src/features/cms/content/", import.meta.url);
  const load = async (file) => await import(new URL(file, dir).href);
  const content = {
    authors: (await load("authors.ts")).authors,
    blogPosts: (await load("blog-posts.ts")).blogPosts,
    projects: (await load("projects.ts")).projects,
    events: (await load("events.ts")).events,
    partners: (await load("partners.ts")).partners,
    serviceFaqs: (await load("service-faqs.ts")).serviceFaqs,
  };

  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    const counts = await seedContent(client, content, { overwrite });
    await client.query("COMMIT");
    console.log(overwrite ? "Reset content from the files:" : "Seeded content (existing rows were left alone):");
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table.padEnd(20)} inserted ${count.inserted}, updated ${count.updated}, skipped ${count.skipped}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
