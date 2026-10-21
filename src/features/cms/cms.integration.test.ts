import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { seedContent } from "../../../scripts/seed-content.mjs";
import { authors } from "./content/authors";
import { blogPosts } from "./content/blog-posts";
import { events } from "./content/events";
import { partners } from "./content/partners";
import { projects } from "./content/projects";
import { serviceFaqs } from "./content/service-faqs";

/**
 * The guarantee behind the CMS: seed the bundled content into a real Postgres built from
 * the real migrations, read it back through the real repositories, and get exactly what
 * the files contain. If this passes, switching the site from files to the database changes
 * nothing a visitor can see.
 */

let db: PGlite;
let server: PGLiteSocketServer;
type Repos = {
  authors: typeof import("./repository/authors");
  blog: typeof import("./repository/blog");
  projects: typeof import("./repository/projects");
  events: typeof import("./repository/events");
  partners: typeof import("./repository/partners");
  faqs: typeof import("./repository/service-faqs");
};
let repo: Repos;

const content = { authors, blogPosts, projects, events, partners, serviceFaqs };
type Counts = Record<string, { inserted: number; updated: number; skipped: number }>;
const seed = (options?: { overwrite?: boolean }) =>
  seedContent(db, content, options) as Promise<Counts>;

/** What JSON can represent: drops `undefined`, which is how optional fields compare equal. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";

  repo = {
    authors: await import("./repository/authors"),
    blog: await import("./repository/blog"),
    projects: await import("./repository/projects"),
    events: await import("./repository/events"),
    partners: await import("./repository/partners"),
    faqs: await import("./repository/service-faqs"),
  };
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

describe("before anything is seeded", () => {
  it("serves the bundled content, so a forgotten seed never blanks the site", async () => {
    expect(await repo.blog.listBlogPosts()).toEqual(
      [...blogPosts].sort((a, b) => b.date.localeCompare(a.date)),
    );
    expect(await repo.projects.listProjects()).toEqual(projects);
    expect(await repo.partners.listPartners()).toEqual(partners);
  });
});

describe("after seeding", () => {
  it("inserts every item, and a second run adds nothing", async () => {
    const first = await seed();
    expect(first.authors.inserted).toBe(authors.length);
    expect(first.blog_posts.inserted).toBe(blogPosts.length);
    expect(first.portfolio_projects.inserted).toBe(projects.length);
    expect(first.events.inserted).toBe(events.length);
    expect(first.partners.inserted).toBe(partners.length);
    expect(first.service_faqs.inserted).toBe(Object.values(serviceFaqs).flat().length);

    const second = await seed();
    for (const counts of Object.values(second)) {
      expect(counts.inserted).toBe(0);
      expect(counts.updated).toBe(0);
    }
  });

  it("reads back exactly the bundled content", async () => {
    expect(plain(await repo.authors.listAuthors())).toEqual(plain(authors));
    expect(plain(await repo.blog.listBlogPosts())).toEqual(
      plain([...blogPosts].sort((a, b) => b.date.localeCompare(a.date))),
    );
    expect(plain(await repo.projects.listProjects())).toEqual(plain(projects));
    expect(plain(await repo.events.listEvents())).toEqual(plain(events));
    expect(plain(await repo.partners.listPartners())).toEqual(plain(partners));
    for (const [slug, items] of Object.entries(serviceFaqs)) {
      expect(await repo.faqs.getServiceFaqs(slug)).toEqual(items);
    }
  });

  it("finds one item by slug and filters projects by service", async () => {
    const post = blogPosts[0];
    expect(plain(await repo.blog.getBlogPost(post.slug))).toEqual(plain(post));
    expect(await repo.blog.getBlogPost("does-not-exist")).toBeUndefined();

    const service = projects[0].services[0];
    const expected = projects.filter((p) => p.services.includes(service)).map((p) => p.slug);
    expect((await repo.projects.listProjectsForService(service)).map((p) => p.slug)).toEqual(
      expected,
    );
  });
});

describe("editing content", () => {
  it("serves only published, live content; unpublishing hides it, and edits survive a re-seed", async () => {
    const slug = blogPosts[0].slug;
    await db.query("UPDATE blog_posts SET status = 'draft' WHERE slug = $1", [slug]);
    expect((await repo.blog.listBlogPosts()).map((p) => p.slug)).not.toContain(slug);
    expect(await repo.blog.getBlogPost(slug)).toBeUndefined();

    await db.query(
      "UPDATE blog_posts SET status = 'published', title = 'Edited in the dashboard' WHERE slug = $1",
      [slug],
    );
    await seed(); // must not clobber the edit
    expect((await repo.blog.getBlogPost(slug))?.title).toBe("Edited in the dashboard");

    await seed({ overwrite: true }); // the explicit reset does
    expect((await repo.blog.getBlogPost(slug))?.title).toBe(blogPosts[0].title);
  });

  it("is authoritative once populated: unpublishing everything empties the list instead of falling back", async () => {
    await db.query("UPDATE partners SET status = 'draft'");
    expect(await repo.partners.listPartners()).toEqual([]);
    await db.query("UPDATE partners SET status = 'published'");
    expect(await repo.partners.listPartners()).toHaveLength(partners.length);
  });

  it("survives a malformed JSON column by dropping just that part", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const slug = projects.find((p) => p.media?.length)?.slug ?? projects[0].slug;
    await db.query(
      `UPDATE portfolio_projects SET media = '[{"nonsense": true}]'::jsonb WHERE slug = $1`,
      [slug],
    );

    const project = await repo.projects.getProject(slug);
    expect(project).toBeDefined();
    expect(project?.media).toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("database rules", () => {
  it("rejects a bad slug, a duplicate live slug, and publishing an incomplete post", async () => {
    const fails = async (sql: string, params: unknown[] = []) =>
      db.query(sql, params).then(
        () => null,
        (e: Error) => e.message,
      );
    const insert = (slug: string, status = "draft", excerpt = "x", content = "{a}") =>
      fails(
        `INSERT INTO blog_posts (slug, author_id, title, excerpt, content, date, category, status)
         VALUES ($1, 'cafton', 'T', $2, $3::text[], '2026-01-01', 'News', $4::publish_status)`,
        [slug, excerpt, content, status],
      );

    expect(await insert("Bad Slug")).toMatch(/blog_posts_slug_format/);
    expect(await insert(blogPosts[1].slug)).toMatch(/blog_posts_slug_live_key|unique/);
    expect(await insert("fresh-post", "published", "", "{a}")).toMatch(
      /blog_posts_published_complete/,
    );
    expect(await insert("fresh-post", "published", "x", "{}")).toMatch(
      /blog_posts_published_complete/,
    );
    expect(await insert("fresh-post", "draft", "", "{}")).toBeNull();
  });

  it("will not delete an author who still has content", async () => {
    const message = await db.query("DELETE FROM authors WHERE id = 'cafton'").then(
      () => null,
      (e: Error) => e.message,
    );
    expect(message).toMatch(/foreign key constraint/);
  });
});
