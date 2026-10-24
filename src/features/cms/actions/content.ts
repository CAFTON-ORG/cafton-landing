"use server";

import {
  ActionError,
  NOT_CONFIGURED,
  actorId,
  parse,
  runAction,
  type ActionResult,
} from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { checkDeleteContent, checkPublishPost, paragraphsFromText } from "../rules/core";
import { ensureAuthor } from "../rules/authors";
import { revalidatePublicContent } from "../services/revalidate";
import { postSchema, type PostInput, type PublishIntent } from "../schemas/admin";
import type { ContentKind } from "../types/admin";

async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

const LABEL: Record<ContentKind, string> = {
  post: "post",
  project: "project",
  event: "event",
  partner: "partner",
};

/**
 * Creates or updates a blog post. `intent` says what to do with its status: keep it
 * ("save"), publish it, or take it down. Publishing needs the permission and a
 * complete post; the database repeats the completeness check as a backstop.
 * Galleries inside the article are not edited here and are left exactly as they are.
 */
export async function savePost(
  input: PostInput,
  intent: PublishIntent = "save",
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard(input.id ? "content:update" : "content:create");
    if (intent !== "save") await guard("content:publish");
    const data = parse(postSchema, input);
    const content = paragraphsFromText(data.body);

    const id = await prisma.$transaction(async (tx) => {
      const existing = data.id
        ? await tx.blogPost.findFirst({ where: { id: data.id, deletedAt: null } })
        : null;
      if (data.id && !existing) throw new ActionError("That post no longer exists.");

      await ensureAuthor(tx, data.authorId);

      const clash = await tx.blogPost.findFirst({
        where: {
          slug: data.slug,
          deletedAt: null,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
      });
      if (clash)
        throw new ActionError("Another post already uses this web address.", "rule", {
          slug: "Another post already uses this web address.",
        });

      const status =
        intent === "publish"
          ? "published"
          : intent === "unpublish"
            ? "draft"
            : (existing?.status ?? "draft");
      if (status === "published") {
        const blocked = checkPublishPost({ ...data, content });
        if (blocked) throw new ActionError(blocked, "rule", { form: blocked });
      }

      const fields = {
        slug: data.slug,
        authorId: data.authorId,
        title: data.title,
        excerpt: data.excerpt,
        content,
        date: new Date(data.date),
        category: data.category,
        imageLight: data.imageLight || null,
        imageDark: data.imageDark || null,
        imageAlt: data.imageAlt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        status,
        updatedBy: actorId(actor),
      } as const;

      const post = existing
        ? await tx.blogPost.update({ where: { id: existing.id }, data: fields })
        : await tx.blogPost.create({ data: { ...fields, createdBy: actorId(actor) } });

      const verb = !existing
        ? "Created"
        : intent === "publish"
          ? "Published"
          : intent === "unpublish"
            ? "Unpublished"
            : "Updated";
      await recordAudit(
        actor,
        {
          action: `post.${verb.toLowerCase()}`,
          entity: "post",
          entityId: post.id,
          summary: `${verb} the post "${post.title}"`,
        },
        tx,
      );
      return post.id;
    });

    revalidatePublicContent();
    return { id };
  });
}

type Delegate = {
  findFirst(args: {
    where: object;
  }): Promise<
    { id: string; status: "draft" | "published"; slug: string } & Record<string, unknown>
  >;
  update(args: { where: { id: string }; data: object }): Promise<unknown>;
};

function delegateFor(
  tx: typeof prisma,
  kind: ContentKind,
): { table: Delegate; name: (row: Record<string, unknown>) => string } {
  switch (kind) {
    case "post":
      return { table: tx.blogPost as unknown as Delegate, name: (row) => String(row.title) };
    case "project":
      return {
        table: tx.portfolioProject as unknown as Delegate,
        name: (row) => String(row.title),
      };
    case "event":
      return { table: tx.event as unknown as Delegate, name: (row) => String(row.title) };
    case "partner":
      return { table: tx.partner as unknown as Delegate, name: (row) => String(row.name) };
  }
}

/** Publish or unpublish any content type from its list. Posts are checked for completeness first. */
export async function setContentStatus(
  kind: ContentKind,
  id: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("content:publish");

    await prisma.$transaction(async (tx) => {
      const { table, name } = delegateFor(tx as typeof prisma, kind);
      const row = await table.findFirst({ where: { id, deletedAt: null } });
      if (!row) throw new ActionError(`That ${LABEL[kind]} no longer exists.`);
      if (row.status === status) return;

      if (kind === "post" && status === "published") {
        const post = row as unknown as {
          title: string;
          excerpt: string;
          content: string[];
          imageLight: string | null;
          imageDark: string | null;
          imageAlt: string | null;
        };
        const blocked = checkPublishPost(post);
        if (blocked) throw new ActionError(blocked, "rule");
      }

      await table.update({ where: { id }, data: { status, updatedBy: actorId(actor) } });
      await recordAudit(
        actor,
        {
          action: `${kind}.${status === "published" ? "published" : "unpublished"}`,
          entity: kind,
          entityId: id,
          summary: `${status === "published" ? "Published" : "Unpublished"} the ${LABEL[kind]} "${name(row)}"`,
        },
        tx,
      );
    });
    revalidatePublicContent();
  });
}

/** Soft-delete. Published content must be unpublished first. */
export async function deleteContent(kind: ContentKind, id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("content:delete");

    await prisma.$transaction(async (tx) => {
      const { table, name } = delegateFor(tx as typeof prisma, kind);
      const row = await table.findFirst({ where: { id, deletedAt: null } });
      if (!row) throw new ActionError(`That ${LABEL[kind]} no longer exists.`);
      const blocked = checkDeleteContent(row);
      if (blocked) throw new ActionError(blocked, "rule");

      await table.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: `${kind}.deleted`,
          entity: kind,
          entityId: id,
          summary: `Deleted the ${LABEL[kind]} "${name(row)}"`,
        },
        tx,
      );
    });
    revalidatePublicContent();
  });
}
