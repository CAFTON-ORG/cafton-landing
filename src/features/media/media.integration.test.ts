import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { seedContent } from "../../../scripts/seed-content.mjs";
import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { authors } from "../cms/content/authors";
import { blogPosts } from "../cms/content/blog-posts";
import { events } from "../cms/content/events";
import { partners } from "../cms/content/partners";
import { projects } from "../cms/content/projects";
import { serviceFaqs } from "../cms/content/service-faqs";

/**
 * The image library against a real database, with Supabase Storage replaced by an
 * in-memory bucket: what gets stored, what is refused, and when an image is protected.
 */

const session = vi.hoisted(() => ({ role: "editor" as "owner" | "editor" | "viewer" }));
const bucket = vi.hoisted(() => ({ objects: new Map<string, { data: Buffer; contentType: string }>(), failRemove: false }));

const staff = () => ({
  id: "33333333-3333-4333-8333-333333333333",
  name: "Eddie Editor",
  email: "eddie@cafton.com",
  roleKey: session.role,
  roleName: session.role,
  permissions: SYSTEM_ROLE_PERMISSIONS[session.role],
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async (permission: string) => {
    if (!(staff().permissions as readonly string[]).includes(permission)) {
      const { ForbiddenError } = await import("@/lib/actions");
      throw new ForbiddenError();
    }
    return staff();
  }),
  verifySession: vi.fn(async () => staff()),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    storage: {
      from: () => ({
        upload: async (path: string, data: Buffer, options: { contentType: string }) => {
          bucket.objects.set(path, { data, contentType: options.contentType });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          if (bucket.failRemove) return { error: { message: "boom" } };
          for (const path of paths) bucket.objects.delete(path);
          return { error: null };
        },
      }),
    },
  }),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let actions: typeof import("./actions");
let repo: typeof import("./repository");

const file = async (name: string, bytes: Buffer, type: string) => {
  const body = new FormData();
  body.set("file", new File([new Uint8Array(bytes)], name, { type }));
  return body;
};
const png = (w = 64, h = 32) => sharp({ create: { width: w, height: h, channels: 3, background: "#123456" } }).png().toBuffer();

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address().port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test";
  await seedContent(db, { authors, blogPosts, projects, events, partners, serviceFaqs });
  actions = await import("./actions");
  repo = await import("./repository");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

describe("uploading", () => {
  let item: Awaited<ReturnType<typeof repo.getMedia>>;

  it("stores a cleaned copy under a random path and lists it with its real size", async () => {
    const result = await actions.uploadMedia(await file("Team photo (final).PNG", await png(64, 32), "image/png"));
    expect(result.ok).toBe(true);
    item = (result as { data: NonNullable<typeof item> }).data;

    expect(item).toMatchObject({ width: 64, height: 32, mime: "image/png", name: "Team photo (final).PNG", uses: 0 });
    expect(item!.path).toMatch(/^content\/[0-9a-f-]{36}\.png$/);
    expect(item!.url).toBe(`https://abc.supabase.co/storage/v1/object/public/media/${item!.path}`);
    expect(bucket.objects.get(item!.path)?.contentType).toBe("image/png");
    expect((await repo.listMedia()).items.map((m) => m.id)).toContain(item!.id);
  });

  it("refuses an SVG with a script in it, a file that lies about its type, and an oversized file", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>");
    expect(await actions.uploadMedia(await file("x.svg", svg, "image/svg+xml"))).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a JPG, PNG or WebP/) });
    expect(await actions.uploadMedia(await file("fake.png", svg, "image/png"))).toMatchObject({ ok: false, error: expect.stringMatching(/JPG, PNG or WebP/) });
    const big = Buffer.concat([await png(), Buffer.alloc(4 * 1024 * 1024 + 1)]);
    expect(await actions.uploadMedia(await file("big.png", big, "image/png"))).toMatchObject({ ok: false, error: expect.stringMatching(/4 MB/) });
    expect(bucket.objects.size).toBe(1); // nothing from the refused files reached storage
  });

  it("keeps a viewer from uploading", async () => {
    session.role = "viewer";
    expect(await actions.uploadMedia(await file("a.png", await png(), "image/png"))).toMatchObject({ ok: false, error: expect.stringMatching(/permission/) });
    session.role = "editor";
  });

  it("saves a description, but not a file name posing as one", async () => {
    expect(await actions.updateMediaAlt(item!.id, "The Cafton team around a table")).toMatchObject({ ok: true });
    expect((await repo.getMedia(item!.id))?.alt).toBe("The Cafton team around a table");
    expect(await actions.updateMediaAlt(item!.id, "IMG_0042.jpg")).toMatchObject({ ok: false });
  });

  it("is protected while content uses it, and deletable by someone who may delete once it is free", async () => {
    await db.query("UPDATE blog_posts SET image_light = $1 WHERE slug = $2", [item!.url, blogPosts[0].slug]);
    expect((await repo.getMedia(item!.id))?.uses).toBe(1);

    session.role = "editor";
    expect(await actions.deleteMedia(item!.id)).toMatchObject({ ok: false, error: expect.stringMatching(/permission/) });

    session.role = "owner";
    expect(await actions.deleteMedia(item!.id)).toMatchObject({ ok: false, error: expect.stringMatching(/used in 1 place/) });
    expect(bucket.objects.has(item!.path)).toBe(true);

    await db.query("UPDATE blog_posts SET image_light = NULL WHERE slug = $1", [blogPosts[0].slug]);
    bucket.failRemove = true;
    expect(await actions.deleteMedia(item!.id)).toMatchObject({ ok: false, error: expect.stringMatching(/storage/) });
    expect(await repo.getMedia(item!.id)).not.toBeNull(); // the row stays if the file could not be removed

    bucket.failRemove = false;
    expect(await actions.deleteMedia(item!.id)).toMatchObject({ ok: true });
    expect(bucket.objects.has(item!.path)).toBe(false);
    expect(await repo.getMedia(item!.id)).toBeNull();
  });

  it("counts a use inside a gallery's JSON too, and audits every change", async () => {
    session.role = "owner";
    const uploaded = await actions.uploadMedia(await file("g.png", await png(), "image/png"));
    const gallery = (uploaded as { data: { id: string; url: string; path: string } }).data;
    await db.query(`UPDATE portfolio_projects SET media = $1::jsonb WHERE slug = $2`, [
      JSON.stringify([{ src: gallery.url, alt: "x", width: 64, height: 32 }]),
      projects[0].slug,
    ]);
    expect((await repo.getMedia(gallery.id))?.uses).toBe(1);

    const { rows } = await db.query<{ action: string }>("SELECT action FROM audit_log WHERE entity = 'media'");
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["media.upload", "media.update", "media.delete"]));
  });
});
