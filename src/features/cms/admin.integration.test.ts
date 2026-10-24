import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { seedContent } from "../../../scripts/seed-content.mjs";
import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { authors } from "./content/authors";
import { blogPosts } from "./content/blog-posts";
import { events } from "./content/events";
import { partners } from "./content/partners";
import { projects } from "./content/projects";
import { serviceFaqs } from "./content/service-faqs";

/**
 * The content editors against a real database: what a Content Editor can and cannot do,
 * what reaches the public repositories, and what is written to the audit log.
 */

const asStaff = (key: "owner" | "editor" | "viewer") => ({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Eddie Editor",
  email: "eddie@cafton.com",
  roleKey: key,
  roleName: key,
  permissions: SYSTEM_ROLE_PERMISSIONS[key],
});

const session = vi.hoisted(() => ({ role: "editor" as "owner" | "editor" | "viewer" }));
const revalidated = vi.hoisted(() => [] as string[]);

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn((path: string) => void revalidated.push(path)),
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async (permission: string) => {
    const staff = asStaff(session.role);
    if (!(staff.permissions as readonly string[]).includes(permission)) {
      const { ForbiddenError } = await import("@/lib/actions");
      throw new ForbiddenError();
    }
    return staff;
  }),
  verifySession: vi.fn(async () => asStaff(session.role)),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let actions: typeof import("./actions/content");
let publicBlog: typeof import("./repository/blog");
let adminRepo: typeof import("./repository/admin");

const draft = (overrides: Record<string, unknown> = {}) => ({
  title: "A brand new post",
  slug: "a-brand-new-post",
  authorId: "cafton",
  category: "News",
  date: "2026-10-21",
  excerpt: "Short and sweet.",
  body: "First paragraph.\n\nSecond paragraph.",
  imageLight: "",
  imageDark: "",
  imageAlt: "",
  ...overrides,
});

const params = { q: "", filters: {}, sort: "updated", dir: "desc" as const, page: 1, pageSize: 25 };

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  await seedContent(db, { authors, blogPosts, projects, events, partners, serviceFaqs });

  actions = await import("./actions/content");
  publicBlog = await import("./repository/blog");
  adminRepo = await import("./repository/admin");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

describe("a Content Editor writing a post", () => {
  let id: string;

  it("creates a draft that stays off the public site", async () => {
    session.role = "editor";
    const result = await actions.savePost(draft());
    expect(result.ok).toBe(true);
    id = (result as { data: { id: string } }).data.id;

    expect(await adminRepo.getPost(id)).toMatchObject({
      status: "draft",
      body: "First paragraph.\n\nSecond paragraph.",
    });
    expect((await publicBlog.listBlogPosts()).map((p) => p.slug)).not.toContain("a-brand-new-post");
  });

  it("explains what is missing instead of publishing a half-written post", async () => {
    const result = await actions.savePost(draft({ id, excerpt: "" }), "publish");
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/excerpt/) });
    expect((await adminRepo.getPost(id))?.status).toBe("draft");
  });

  it("publishes, after which it is on the public site in the right shape, and the pages are revalidated", async () => {
    revalidated.length = 0;
    expect(await actions.savePost(draft({ id }), "publish")).toMatchObject({ ok: true });

    const post = await publicBlog.getBlogPost("a-brand-new-post");
    expect(post).toMatchObject({
      title: "A brand new post",
      content: ["First paragraph.", "Second paragraph."],
      date: "2026-10-21",
      authorId: "cafton",
    });
    expect(revalidated).toEqual(expect.arrayContaining(["/blog", "/blog/[slug]", "/"]));
  });

  it("will not take a web address another post uses, nor an invalid one", async () => {
    expect(await actions.savePost(draft({ slug: blogPosts[0].slug }))).toMatchObject({
      ok: false,
      fieldErrors: { slug: expect.stringMatching(/already uses/) },
    });
    expect(await actions.savePost(draft({ slug: "Not A Slug" }))).toMatchObject({
      ok: false,
      fieldErrors: { slug: expect.stringMatching(/lowercase/) },
    });
  });

  it("rejects an image address that could run script", async () => {
    expect(
      await actions.savePost(draft({ imageLight: "javascript:alert(1)", imageAlt: "x" })),
    ).toMatchObject({
      ok: false,
      fieldErrors: { imageLight: expect.stringMatching(/path on this site/) },
    });
  });

  it("cannot delete (no permission), and published content must be unpublished before any delete", async () => {
    expect(await actions.deleteContent("post", id)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/permission/),
    });

    session.role = "owner";
    expect(await actions.deleteContent("post", id)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Unpublish this first/),
    });

    expect(await actions.setContentStatus("post", id, "draft")).toMatchObject({ ok: true });
    expect(await actions.deleteContent("post", id)).toMatchObject({ ok: true });
    expect(await adminRepo.getPost(id)).toBeNull();
    expect((await publicBlog.listBlogPosts()).map((p) => p.slug)).not.toContain("a-brand-new-post");
  });

  it("lets a deleted post's web address be used again", async () => {
    session.role = "editor";
    expect(await actions.savePost(draft())).toMatchObject({ ok: true });
  });
});

describe("permissions", () => {
  it("keeps a viewer from writing or publishing anything", async () => {
    session.role = "viewer";
    expect(await actions.savePost(draft({ slug: "viewer-post" }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/permission/),
    });
    expect(
      await actions.setContentStatus("post", "00000000-0000-4000-8000-000000000000", "published"),
    ).toMatchObject({ ok: false });
  });

  it("lets an editor publish and unpublish a project from its list", async () => {
    session.role = "editor";
    const { rows } = await db.query<{ id: string }>("SELECT id FROM portfolio_projects LIMIT 1");
    expect(await actions.setContentStatus("project", rows[0].id, "draft")).toMatchObject({
      ok: true,
    });
    const list = await adminRepo.listProjects(params);
    expect(list.items.find((row) => row.id === rows[0].id)?.status).toBe("draft");
    expect(await actions.setContentStatus("project", rows[0].id, "published")).toMatchObject({
      ok: true,
    });
  });
});

describe("accountability", () => {
  it("records who did what in the audit log, in the same transaction", async () => {
    const { rows } = await db.query<{ action: string; actor_name: string }>(
      "SELECT action, actor_name FROM audit_log WHERE entity IN ('post','project') ORDER BY created_at",
    );
    const actions = rows.map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "post.created",
        "post.published",
        "post.unpublished",
        "post.deleted",
        "project.unpublished",
        "project.published",
      ]),
    );
    expect(new Set(rows.map((row) => row.actor_name))).toEqual(new Set(["Eddie Editor"]));
  });
});
