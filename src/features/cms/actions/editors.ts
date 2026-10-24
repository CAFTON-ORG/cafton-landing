"use server";

import { servicePillars } from "@/config/services";
import { Prisma } from "@/generated/prisma/client";
import { ensureAuthor } from "../rules/authors";
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
import {
  checkEventDates,
  checkPublishEvent,
  checkPublishPartner,
  checkPublishProject,
  listFromCommas,
  listFromText,
  manilaToIso,
  paragraphsFromText,
  type PublishStatus,
} from "../rules/core";
import {
  eventSchema,
  faqSetSchema,
  partnerSchema,
  projectSchema,
  type EventInput,
  type FaqSetInput,
  type PartnerInput,
  type ProjectInput,
} from "../schemas/forms";
import { revalidatePublicContent } from "../services/revalidate";
import type { PublishIntent } from "../schemas/admin";

/**
 * Saving the project, event, partner and FAQ editors. Each follows the blog post's rules:
 * permission first, validation, one transaction, the status only changes when asked,
 * publishing needs a complete record, and every change is audited and revalidated.
 */

async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

function statusFor(intent: PublishIntent, existing: PublishStatus | undefined): PublishStatus {
  return intent === "publish"
    ? "published"
    : intent === "unpublish"
      ? "draft"
      : (existing ?? "draft");
}

const verbFor = (existed: boolean, intent: PublishIntent) =>
  !existed
    ? "Created"
    : intent === "publish"
      ? "Published"
      : intent === "unpublish"
        ? "Unpublished"
        : "Updated";

function slugTaken(message = "Another item already uses this web address.") {
  return new ActionError(message, "rule", { slug: message });
}

/** The JSON column value for an optional list or object: the data, or SQL NULL. */
const jsonOrNull = <T>(value: T | undefined | null | readonly unknown[]) =>
  value === undefined || value === null || (Array.isArray(value) && value.length === 0)
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue);

/* ---------------------------------------------------------------- project */

export async function saveProject(
  input: ProjectInput,
  intent: PublishIntent = "save",
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard(input.id ? "content:update" : "content:create");
    if (intent !== "save") await guard("content:publish");
    const data = parse(projectSchema, input);

    const known = new Set(servicePillars.map((pillar) => pillar.slug));
    const unknown = data.services.find((slug) => !known.has(slug));
    if (unknown)
      throw new ActionError("Choose from the listed services.", "validation", {
        services: "One of those services doesn't exist.",
      });

    const id = await prisma.$transaction(async (tx) => {
      const existing = data.id
        ? await tx.portfolioProject.findFirst({ where: { id: data.id, deletedAt: null } })
        : null;
      if (data.id && !existing) throw new ActionError("That project no longer exists.");
      await ensureAuthor(tx, data.authorId);
      if (
        await tx.portfolioProject.findFirst({
          where: {
            slug: data.slug,
            deletedAt: null,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        })
      ) {
        throw slugTaken("Another project already uses this web address.");
      }

      const status = statusFor(intent, existing?.status);
      if (status === "published") {
        const blocked = checkPublishProject(data);
        if (blocked) throw new ActionError(blocked, "rule", { form: blocked });
      }

      const gallery = data.gallery.map((image) => ({
        src: image.src,
        alt: image.alt,
        width: image.width,
        height: image.height,
        ...(image.caption && { caption: image.caption }),
      }));
      const fields = {
        slug: data.slug,
        authorId: data.authorId,
        client: data.client,
        title: data.title,
        category: data.category,
        services: data.services,
        summary: data.summary,
        description: data.description,
        problem: data.problem || null,
        solution: data.solution || null,
        recognition: data.recognition || null,
        imageLight: data.imageLight || null,
        imageDark: data.imageDark || null,
        imageAlt: data.imageAlt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        imageFit: data.imageFit || null,
        liveUrl: data.liveUrl || null,
        media: jsonOrNull(gallery),
        status,
        updatedBy: actorId(actor),
      };
      const project = existing
        ? await tx.portfolioProject.update({ where: { id: existing.id }, data: fields })
        : await tx.portfolioProject.create({ data: { ...fields, createdBy: actorId(actor) } });

      const verb = verbFor(Boolean(existing), intent);
      await recordAudit(
        actor,
        {
          action: `project.${verb.toLowerCase()}`,
          entity: "project",
          entityId: project.id,
          summary: `${verb} the project "${project.title}"`,
        },
        tx,
      );
      return project.id;
    });
    revalidatePublicContent();
    return { id };
  });
}

/* ------------------------------------------------------------------ event */

export async function saveEvent(
  input: EventInput,
  intent: PublishIntent = "save",
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard(input.id ? "content:update" : "content:create");
    if (intent !== "save") await guard("content:publish");
    const data = parse(eventSchema, input);

    const startsAt = data.startsAt ? manilaToIso(data.startsAt) : null;
    const endsAt = data.endsAt ? manilaToIso(data.endsAt) : null;
    if (data.startsAt && !startsAt)
      throw new ActionError("Pick a start date and time.", "validation", {
        startsAt: "Pick a start date and time.",
      });
    if (data.endsAt && !endsAt)
      throw new ActionError("Pick an end date and time.", "validation", {
        endsAt: "Pick an end date and time.",
      });
    const order = checkEventDates(startsAt, endsAt);
    if (order) throw new ActionError(order, "rule", { endsAt: order });

    if (
      data.posterSrc &&
      (!data.posterAlt.trim() || data.posterWidth === "" || data.posterHeight === "")
    ) {
      throw new ActionError("A poster needs a description and its size.", "validation", {
        posterAlt: data.posterAlt.trim() ? "" : "Describe the poster.",
        posterWidth: data.posterWidth === "" ? "Enter the width." : "",
        posterHeight: data.posterHeight === "" ? "Enter the height." : "",
      });
    }
    const promoFields = [
      data.promoEyebrow,
      data.promoTitle,
      data.promoDescription,
      data.promoHref,
      data.promoCta,
    ];
    if (promoFields.some(Boolean) && !promoFields.every(Boolean)) {
      throw new ActionError("A promo needs all five parts, or none.", "validation", {
        promoTitle: "Fill in every part of the promo, or clear them all.",
      });
    }

    const id = await prisma.$transaction(async (tx) => {
      const existing = data.id
        ? await tx.event.findFirst({ where: { id: data.id, deletedAt: null } })
        : null;
      if (data.id && !existing) throw new ActionError("That event no longer exists.");
      await ensureAuthor(tx, data.authorId);
      if (
        await tx.event.findFirst({
          where: {
            slug: data.slug,
            deletedAt: null,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        })
      ) {
        throw slugTaken("Another event already uses this web address.");
      }

      const status = statusFor(intent, existing?.status);
      if (status === "published") {
        const blocked = checkPublishEvent({ ...data, prizeCount: data.prizes.length });
        if (blocked) throw new ActionError(blocked, "rule", { form: blocked });
      }

      const prizes = data.prizes.map((prize) => ({
        rank: prize.rank,
        name: prize.name,
        items: listFromText(prize.itemsText),
        ...(prize.image && { image: prize.image }),
        ...(prize.imageAlt && { imageAlt: prize.imageAlt }),
        ...(prize.cutout && { cutout: true }),
      }));
      const fields = {
        slug: data.slug,
        authorId: data.authorId,
        title: data.title,
        type: data.type,
        tagline: data.tagline,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        summary: data.summary,
        campaignUrl: data.campaignUrl || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        closed: data.closed,
        poster: data.posterSrc
          ? {
              src: data.posterSrc,
              alt: data.posterAlt,
              width: Number(data.posterWidth),
              height: Number(data.posterHeight),
            }
          : Prisma.DbNull,
        about: paragraphsFromText(data.aboutText),
        prizesHeading: data.prizesHeading || null,
        prizes: prizes as Prisma.InputJsonValue,
        steps: jsonOrNull(
          data.steps.map((step) => ({ title: step.title, description: step.description })),
        ),
        facts: jsonOrNull(data.facts.map((fact) => [fact.label, fact.value])),
        closedTitle: data.closedTitle || null,
        closedNote: data.closedNote || null,
        promo: promoFields.every(Boolean)
          ? {
              eyebrow: data.promoEyebrow,
              title: data.promoTitle,
              description: data.promoDescription,
              href: data.promoHref,
              cta: data.promoCta,
            }
          : Prisma.DbNull,
        status,
        updatedBy: actorId(actor),
      };
      const event = existing
        ? await tx.event.update({ where: { id: existing.id }, data: fields })
        : await tx.event.create({ data: { ...fields, createdBy: actorId(actor) } });

      const verb = verbFor(Boolean(existing), intent);
      await recordAudit(
        actor,
        {
          action: `event.${verb.toLowerCase()}`,
          entity: "event",
          entityId: event.id,
          summary: `${verb} the event "${event.title}"`,
        },
        tx,
      );
      return event.id;
    });
    revalidatePublicContent();
    return { id };
  });
}

/* ---------------------------------------------------------------- partner */

export async function savePartner(
  input: PartnerInput,
  intent: PublishIntent = "save",
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard(input.id ? "content:update" : "content:create");
    if (intent !== "save") await guard("content:publish");
    const data = parse(partnerSchema, input);

    const id = await prisma.$transaction(async (tx) => {
      const existing = data.id
        ? await tx.partner.findFirst({ where: { id: data.id, deletedAt: null } })
        : null;
      if (data.id && !existing) throw new ActionError("That partner no longer exists.");
      if (
        await tx.partner.findFirst({
          where: {
            slug: data.slug,
            deletedAt: null,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        })
      ) {
        throw slugTaken("Another partner already uses this web address.");
      }

      const status = statusFor(intent, existing?.status);
      if (status === "published") {
        const blocked = checkPublishPartner(data);
        if (blocked) throw new ActionError(blocked, "rule", { form: blocked });
      }

      const fields = {
        slug: data.slug,
        name: data.name,
        shortName: data.shortName,
        logo: {
          src: data.logoSrc,
          fit: data.logoFit,
          ...(data.logoFit === "contain" && data.logoPlate && { plate: data.logoPlate }),
        } as Prisma.InputJsonValue,
        roles: listFromCommas(data.rolesText),
        featured: data.featured,
        description: data.description || null,
        links: jsonOrNull(data.links.map((link) => ({ label: link.label, href: link.href }))),
        status,
        updatedBy: actorId(actor),
      };
      const partner = existing
        ? await tx.partner.update({ where: { id: existing.id }, data: fields })
        : await tx.partner.create({ data: { ...fields, createdBy: actorId(actor) } });

      const verb = verbFor(Boolean(existing), intent);
      await recordAudit(
        actor,
        {
          action: `partner.${verb.toLowerCase()}`,
          entity: "partner",
          entityId: partner.id,
          summary: `${verb} the partner "${partner.name}"`,
        },
        tx,
      );
      return partner.id;
    });
    revalidatePublicContent();
    return { id };
  });
}

/* ------------------------------------------------------------------- FAQs */

/** Replaces a service's questions with the list sent, in that order. They are live as soon as they are saved. */
export async function saveServiceFaqs(
  input: FaqSetInput,
): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const actor = await guard("content:update");
    const data = parse(faqSetSchema, input);
    const pillar = servicePillars.find((entry) => entry.slug === data.serviceSlug);
    if (!pillar) throw new ActionError("That service doesn't exist.");

    const seen = new Set<string>();
    for (const [index, item] of data.items.entries()) {
      const key = item.question.toLowerCase();
      if (seen.has(key))
        throw new ActionError("Two questions are the same.", "validation", {
          form: `Question ${index + 1} repeats an earlier one.`,
        });
      seen.add(key);
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceFaq.deleteMany({ where: { serviceSlug: data.serviceSlug } });
      if (data.items.length > 0) {
        await tx.serviceFaq.createMany({
          data: data.items.map((item, position) => ({
            serviceSlug: data.serviceSlug,
            question: item.question,
            answer: item.answer,
            position,
          })),
        });
      }
      await recordAudit(
        actor,
        {
          action: "faq.updated",
          entity: "faq",
          entityId: data.serviceSlug,
          summary: `Updated the questions on ${pillar.title} (${data.items.length})`,
        },
        tx,
      );
    });
    revalidatePublicContent();
    return { count: data.items.length };
  });
}
