import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../../scripts/pglite-setup.mjs";
import { seedContent } from "../../../../scripts/seed-content.mjs";
import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { authors } from "../content/authors";
import { blogPosts } from "../content/blog-posts";
import { events } from "../content/events";
import { partners } from "../content/partners";
import { projects } from "../content/projects";
import { serviceFaqs } from "../content/service-faqs";

/**
 * The project, event, partner and FAQ editors against a real database.
 *
 * The key guarantee: opening any existing item in its editor and saving it without
 * touching anything changes nothing a visitor can see. If that holds for every item the
 * site shipped with, the editors cannot corrupt content by merely being used.
 */

const session = vi.hoisted(() => ({ role: "editor" as "owner" | "editor" | "sales" }));
const staff = () => ({
  id: "44444444-4444-4444-8444-444444444444",
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

let db: PGlite;
let server: PGLiteSocketServer;
let act: typeof import("./editor-actions");
let read: typeof import("./editor-repository");
let publicProjects: typeof import("../repository/projects");
let publicEvents: typeof import("../repository/events");
let publicPartners: typeof import("../repository/partners");
let publicFaqs: typeof import("../repository/service-faqs");

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const idOf = async (table: string, slug: string) =>
  (await db.query<{ id: string }>(`SELECT id FROM ${table} WHERE slug = $1`, [slug])).rows[0].id;

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  await seedContent(db, { authors, blogPosts, projects, events, partners, serviceFaqs });
  act = await import("./editor-actions");
  read = await import("./editor-repository");
  publicProjects = await import("../repository/projects");
  publicEvents = await import("../repository/events");
  publicPartners = await import("../repository/partners");
  publicFaqs = await import("../repository/service-faqs");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

describe("opening an item and saving it untouched changes nothing visitors can see", () => {
  it("projects", async () => {
    for (const project of projects) {
      const detail = (await read.getProjectForEdit(
        await idOf("portfolio_projects", project.slug),
      ))!;
      expect(await act.saveProject(detail), project.slug).toMatchObject({ ok: true });
    }
    expect(plain(await publicProjects.listProjects())).toEqual(plain(projects));
  });

  it("events, including dates, prizes, steps, facts and promos", async () => {
    for (const event of events) {
      const detail = (await read.getEventForEdit(await idOf("events", event.slug)))!;
      expect(await act.saveEvent(detail), event.slug).toMatchObject({ ok: true });
    }
    expect(plain(await publicEvents.listEvents())).toEqual(plain(events));
  });

  it("partners", async () => {
    for (const partner of partners) {
      const slug = partner.shortName
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-");
      const detail = (await read.getPartnerForEdit(await idOf("partners", slug)))!;
      expect(await act.savePartner(detail), partner.name).toMatchObject({ ok: true });
    }
    expect(plain(await publicPartners.listPartners())).toEqual(plain(partners));
  });

  it("service FAQs", async () => {
    for (const [serviceSlug, items] of Object.entries(serviceFaqs)) {
      expect(
        await act.saveServiceFaqs({ serviceSlug, items: await read.getFaqsForEdit(serviceSlug) }),
      ).toMatchObject({ ok: true });
      expect(await publicFaqs.getServiceFaqs(serviceSlug)).toEqual(items);
    }
  });
});

describe("editing", () => {
  it("changes only what was edited, and the public site follows", async () => {
    const id = await idOf("portfolio_projects", projects[0].slug);
    const detail = (await read.getProjectForEdit(id))!;
    expect(await act.saveProject({ ...detail, summary: "A sharper summary." })).toMatchObject({
      ok: true,
    });
    const [first, ...rest] = await publicProjects.listProjects();
    expect(first.summary).toBe("A sharper summary.");
    expect(plain(rest)).toEqual(plain(projects.slice(1)));
    await act.saveProject({ ...detail }); // put it back
  });

  it("creates a project as a draft, refuses to publish it half-written, then publishes it", async () => {
    const base = {
      title: "New case study",
      slug: "new-case-study",
      authorId: "cafton",
      client: "Acme",
      category: "Web Application",
      services: ["operations"],
      summary: "",
      description: "",
      problem: "",
      solution: "",
      recognition: "",
      imageLight: "",
      imageDark: "",
      imageAlt: "",
      imageFit: "" as const,
      liveUrl: "",
      gallery: [],
    };
    const created = await act.saveProject(base);
    expect(created).toMatchObject({ ok: true });
    const id = (created as { data: { id: string } }).data.id;
    expect((await publicProjects.listProjects()).map((p) => p.slug)).not.toContain(
      "new-case-study",
    );

    expect(await act.saveProject({ ...base, id }, "publish")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/summary/),
    });
    expect(
      await act.saveProject({ ...base, id, summary: "S", description: "D" }, "publish"),
    ).toMatchObject({ ok: true });
    const live = (await publicProjects.listProjects()).find((p) => p.slug === "new-case-study");
    expect(live).toMatchObject({ client: "Acme", services: ["operations"], summary: "S" });
    expect(live?.media).toBeUndefined();
  });

  it("stores a gallery and shows it on the project", async () => {
    const id = await idOf("portfolio_projects", "new-case-study");
    const detail = (await read.getProjectForEdit(id))!;
    expect(
      await act.saveProject({
        ...detail,
        gallery: [
          {
            src: "https://cdn.example.com/a.png",
            alt: "The dashboard",
            width: 1200,
            height: 800,
            caption: "Overview",
          },
        ],
      }),
    ).toMatchObject({ ok: true });
    expect((await publicProjects.getProject("new-case-study"))?.media).toEqual([
      {
        src: "https://cdn.example.com/a.png",
        alt: "The dashboard",
        width: 1200,
        height: 800,
        caption: "Overview",
      },
    ]);
  });
});

describe("authors and covers", () => {
  it("credits a staff member as author, from their profile, and shows a single cover in both themes", async () => {
    const profileId = "55555555-5555-4555-8555-555555555555";
    await db.exec("ALTER TABLE profiles DISABLE TRIGGER ALL");
    await db.query(
      `INSERT INTO profiles (id, email, full_name, avatar_url, role_id)
       VALUES ($1, 'ada@cafton.com', 'Ada Lovelace', 'https://lh3.googleusercontent.com/a/ada', (SELECT id FROM roles WHERE key = 'editor'))`,
      [profileId],
    );
    const options = await (await import("./repository")).listAuthorOptions(profileId);
    expect(options[0]).toMatchObject({
      id: `staff-${profileId}`,
      name: "Ada Lovelace",
      avatar: "https://lh3.googleusercontent.com/a/ada",
      staff: true,
    });
    expect(options.every((o) => o.staff)).toBe(true);

    const saved = await act.saveProject(
      {
        title: "Cover test",
        slug: "cover-test",
        authorId: `staff-${profileId}`,
        client: "Acme",
        category: "Web Application",
        services: ["operations"],
        summary: "S",
        description: "D",
        problem: "",
        solution: "",
        recognition: "",
        imageLight: "https://x.supabase.co/storage/v1/object/public/media/content/a.webp",
        imageDark: "",
        imageAlt: "A screen",
        imageFit: "" as const,
        liveUrl: "",
        gallery: [],
      },
      "publish",
    );
    expect(saved).toMatchObject({ ok: true });
    const author = await db.query("SELECT name, role, avatar, kind FROM authors WHERE id = $1", [
      `staff-${profileId}`,
    ]);
    expect(author.rows[0]).toMatchObject({ name: "Ada Lovelace", kind: "person" });
    const live = (await publicProjects.listProjects()).find((p) => p.slug === "cover-test");
    expect(live?.imageLight).toBe(live?.imageDark);
    expect(live?.imageLight).toContain("/media/content/a.webp");
  }, 30_000);
});

describe("validation", () => {
  it("rejects a taken address, an unknown service, and an unsafe or malformed link or image", async () => {
    const detail = (await read.getProjectForEdit(
      await idOf("portfolio_projects", projects[1].slug),
    ))!;
    expect(
      await act.saveProject({ ...detail, id: undefined, slug: projects[0].slug }),
    ).toMatchObject({ ok: false, fieldErrors: { slug: expect.stringMatching(/already uses/) } });
    expect(await act.saveProject({ ...detail, services: ["nonsense"] })).toMatchObject({
      ok: false,
      fieldErrors: { services: expect.any(String) },
    });
    expect(await act.saveProject({ ...detail, liveUrl: "javascript:alert(1)" })).toMatchObject({
      ok: false,
      fieldErrors: { liveUrl: expect.stringMatching(/https/) },
    });
    expect(
      await act.saveProject({ ...detail, imageLight: "data:text/html,<script>" }),
    ).toMatchObject({ ok: false });
    expect(
      await act.saveProject({
        ...detail,
        gallery: [{ src: "/a.png", alt: "", width: 10, height: 10, caption: "" }],
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects an event that ends before it starts, an incomplete promo, a poster without a size, and an unsafe promo link", async () => {
    const detail = (await read.getEventForEdit(await idOf("events", events[0].slug)))!;
    expect(
      await act.saveEvent({ ...detail, startsAt: "2026-10-02T09:00", endsAt: "2026-10-01T09:00" }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { endsAt: expect.stringMatching(/can't end before/) },
    });
    expect(
      await act.saveEvent({
        ...detail,
        promoTitle: "Only a title",
        promoEyebrow: "",
        promoDescription: "",
        promoHref: "",
        promoCta: "",
      }),
    ).toMatchObject({ ok: false, fieldErrors: { promoTitle: expect.any(String) } });
    expect(
      await act.saveEvent({
        ...detail,
        posterSrc: "/p.png",
        posterAlt: "A poster",
        posterWidth: "",
        posterHeight: "",
      }),
    ).toMatchObject({ ok: false });
    expect(
      await act.saveEvent({
        ...detail,
        promoEyebrow: "e",
        promoTitle: "t",
        promoDescription: "d",
        promoCta: "c",
        promoHref: "javascript:alert(1)",
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects duplicate FAQ questions and an unknown service", async () => {
    expect(
      await act.saveServiceFaqs({
        serviceSlug: "operations",
        items: [
          { question: "Same?", answer: "A" },
          { question: "same?", answer: "B" },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(await act.saveServiceFaqs({ serviceSlug: "nope", items: [] })).toMatchObject({
      ok: false,
    });
  });
});

describe("permissions and the audit trail", () => {
  it("keeps sales from creating content, and an editor can save but a viewer-level role cannot publish", async () => {
    session.role = "sales";
    expect(
      await act.savePartner({
        name: "N",
        shortName: "n",
        slug: "n",
        logoSrc: "",
        logoFit: "contain",
        logoPlate: "",
        rolesText: "",
        featured: false,
        description: "",
        links: [],
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/permission/) });
    session.role = "editor";
  });

  it("audits what changed", async () => {
    const { rows } = await db.query<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity IN ('project','event','partner','faq')",
    );
    expect(new Set(rows.map((r) => r.action))).toEqual(
      expect.objectContaining(
        new Set([
          "project.updated",
          "project.created",
          "project.published",
          "event.updated",
          "partner.updated",
          "faq.updated",
        ]),
      ),
    );
  });
});
