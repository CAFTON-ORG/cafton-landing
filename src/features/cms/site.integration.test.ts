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
import { siteSettings } from "./content/site-settings";
import type { SiteSettings } from "./types/core";

/**
 * Website settings against a real database: the seed copies what the site said before,
 * reading it back gives exactly that, edits are validated, permission-gated and audited,
 * and a damaged document can never break a page.
 */

const session = vi.hoisted(() => ({ role: "admin" as "owner" | "admin" | "editor" }));
const staff = () => ({
  id: "66666666-6666-4666-8666-666666666666",
  name: "Ada Admin",
  email: "ada@cafton.com",
  roleKey: session.role,
  roleName: session.role,
  permissions: SYSTEM_ROLE_PERMISSIONS[session.role],
});
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath, revalidateTag: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn, // no request scope in a test: read every time
}));
vi.mock("server-only", () => ({}));
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

let db: PGlite;
let server: PGLiteSocketServer;
let act: typeof import("./actions/site");
let read: typeof import("./repository/site");
let docs: typeof import("./repository/documents");

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  await seedContent(db, { ...bundled, siteContent: { settings: siteSettings } });
  act = await import("./actions/site");
  read = await import("./repository/site");
  docs = await import("./repository/documents");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const bundled = { authors, blogPosts, projects, events, partners, serviceFaqs };
const edited = (patch: Partial<SiteSettings>): SiteSettings => ({
  ...plain(siteSettings),
  ...patch,
});

describe("website settings", () => {
  it("reads back exactly what the site said before they were editable", async () => {
    expect(plain(await read.getSiteSettings())).toEqual(plain(siteSettings));
  });

  it("is safe to seed twice and never overwrites an edit", async () => {
    await act.saveSiteSettings(edited({ email: "hello@cafton.com" }));
    await seedContent(db, { ...bundled, siteContent: { settings: siteSettings } });
    expect((await read.getSiteSettings()).email).toBe("hello@cafton.com");
    await act.saveSiteSettings(plain(siteSettings));
  });

  it("saves an edit, refreshes the whole site and records who did it", async () => {
    revalidatePath.mockClear();
    const result = await act.saveSiteSettings(
      edited({
        email: "studio@cafton.com",
        facts: ["Est. 2026", "Baguio City"],
        socials: siteSettings.socials.slice(0, 2),
      }),
    );
    expect(result).toMatchObject({ ok: true });
    const settings = await read.getSiteSettings();
    expect(settings.email).toBe("studio@cafton.com");
    expect(settings.socials).toHaveLength(2);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");

    const audit = await db.query(
      "SELECT summary, actor_name FROM audit_log WHERE action = 'site.settings'",
    );
    expect(audit.rows.at(-1)).toMatchObject({
      summary: "Updated the website settings",
      actor_name: "Ada Admin",
    });
    await act.saveSiteSettings(plain(siteSettings));
  });

  it("rejects a bad email, an insecure link and a network listed twice", async () => {
    expect(await act.saveSiteSettings(edited({ email: "not-an-email" }))).toMatchObject({
      ok: false,
      fieldErrors: { email: expect.any(String) },
    });
    expect(
      await act.saveSiteSettings(
        edited({ socials: [{ platform: "facebook", url: "http://facebook.com/cafton" }] }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      await act.saveSiteSettings(
        edited({
          socials: [
            { platform: "x", url: "https://x.com/a" },
            { platform: "x", url: "https://x.com/b" },
          ],
        }),
      ),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/once/) });
    expect(
      await act.saveSiteSettings(
        edited({ socials: [{ platform: "x", url: "javascript:alert(1)" }] }),
      ),
    ).toMatchObject({ ok: false });
    expect((await read.getSiteSettings()).email).toBe(siteSettings.email);
  });

  it("is for people who may edit settings: an editor cannot", async () => {
    session.role = "editor";
    expect(await act.saveSiteSettings(edited({ email: "x@cafton.com" }))).toMatchObject({
      ok: false,
    });
    session.role = "admin";
    expect((await read.getSiteSettings()).email).toBe(siteSettings.email);
  });

  it("falls back to the bundled settings when the stored document is damaged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await db.exec(`UPDATE site_content SET data = '{"email": 42}'::jsonb WHERE key = 'settings'`);
    expect(plain(await read.getSiteSettings())).toEqual(plain(siteSettings));
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    await act.saveSiteSettings(plain(siteSettings));
  });

  it("refuses a document that is not an object, and a malformed key, at the database", async () => {
    await expect(
      db.exec(`UPDATE site_content SET data = '[]'::jsonb WHERE key = 'settings'`),
    ).rejects.toThrow();
    await expect(
      db.exec(`INSERT INTO site_content (key, data) VALUES ('Bad Key', '{}')`),
    ).rejects.toThrow();
  });
});

describe("a page that gained fields after it was saved", () => {
  it("keeps the editor's wording and fills the new fields from the bundled text", async () => {
    const { home } = await import("./content/home");
    const { hero: _hero, ...older } = plain(home);
    await db.query(
      "INSERT INTO site_content (key, data) VALUES ('home', $1::jsonb) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data",
      [JSON.stringify({ ...older, heroEyebrow: "Edited line" })],
    );
    const read = await docs.getDocument("home");
    expect(read.heroEyebrow).toBe("Edited line");
    expect(plain(read.hero)).toEqual(plain(home.hero));
  });

  it("serves the bundled wording for list pages and partners until someone edits them", async () => {
    const { listings, partnerCopy } = await import("./content/listings");
    expect(plain(await docs.getDocument("listings"))).toEqual(plain(listings));
    expect(plain(await docs.getDocument("partnerCopy"))).toEqual(plain(partnerCopy));
  });
});
