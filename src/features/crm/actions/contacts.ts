"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { live } from "../repository/mappers";
import { checkContactDelete, checkOrganizationDelete, fullName } from "../rules/core";
import {
  contactRecordSchema,
  organizationSchema,
  type ContactInput,
  type OrganizationInput,
} from "../schemas/core";
import { guard, refreshCrm } from "./guard";
import { findLiveContactByEmail } from "./shared";

/* --------------------------------------------------------------- contacts */

export async function createContact(input: ContactInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("contacts:create");
    const data = parse(contactRecordSchema, input);

    const id = await prisma.$transaction(async (tx) => {
      if (await findLiveContactByEmail(tx, data.email)) {
        throw new ActionError("A contact with this email already exists.", "rule", {
          email: "A contact with this email already exists.",
        });
      }
      const contact = await tx.contact.create({
        data: { ...data, ownerId: data.ownerId ?? actorId(actor), createdBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "contact.create",
          entity: "contact",
          entityId: contact.id,
          summary: `Added contact ${fullName(contact)}`,
        },
        tx,
      );
      return contact.id;
    });
    refreshCrm();
    return { id };
  });
}

export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("contacts:update");
    const data = parse(contactRecordSchema, input);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.contact.findFirst({ where: { id, ...live } });
      if (!existing) throw new ActionError("That contact no longer exists.");

      const clash = await findLiveContactByEmail(tx, data.email);
      if (clash && clash.id !== id) {
        throw new ActionError("Another contact already uses this email.", "rule", {
          email: "Another contact already uses this email.",
        });
      }
      await tx.contact.update({
        where: { id },
        data: {
          ...data,
          // Cleared optional fields are written as null, not left unchanged.
          phone: data.phone ?? null,
          position: data.position ?? null,
          organizationId: data.organizationId ?? null,
          ownerId: data.ownerId ?? null,
          notes: data.notes ?? null,
          updatedBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "contact.update",
          entity: "contact",
          entityId: id,
          summary: `Updated contact ${fullName(data)}`,
        },
        tx,
      );
    });
    refreshCrm();
    return { id };
  });
}

export async function deleteContact(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("contacts:delete");
    await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findFirst({ where: { id, ...live } });
      if (!contact) throw new ActionError("That contact no longer exists.");
      const blocked = checkContactDelete({
        liveDeals: await tx.deal.count({ where: { contactId: id, ...live } }),
      });
      if (blocked) throw new ActionError(blocked, "rule");

      await tx.contact.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "contact.delete",
          entity: "contact",
          entityId: id,
          summary: `Deleted contact ${fullName(contact)}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

/* ---------------------------------------------------------- organizations */

export async function createOrganization(
  input: OrganizationInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("organizations:create");
    const data = parse(organizationSchema, input);

    const id = await prisma.$transaction(async (tx) => {
      const clash = await tx.organization.findFirst({
        where: { ...live, name: { equals: data.name, mode: "insensitive" } },
      });
      if (clash) {
        throw new ActionError("An organization with this name already exists.", "rule", {
          name: "An organization with this name already exists.",
        });
      }
      const org = await tx.organization.create({ data: { ...data, createdBy: actorId(actor) } });
      await recordAudit(
        actor,
        {
          action: "organization.create",
          entity: "organization",
          entityId: org.id,
          summary: `Added organization ${org.name}`,
        },
        tx,
      );
      return org.id;
    });
    refreshCrm();
    return { id };
  });
}

export async function updateOrganization(
  id: string,
  input: OrganizationInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("organizations:update");
    const data = parse(organizationSchema, input);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findFirst({ where: { id, ...live } });
      if (!existing) throw new ActionError("That organization no longer exists.");
      const clash = await tx.organization.findFirst({
        where: { ...live, id: { not: id }, name: { equals: data.name, mode: "insensitive" } },
      });
      if (clash) {
        throw new ActionError("Another organization already has this name.", "rule", {
          name: "Another organization already has this name.",
        });
      }
      await tx.organization.update({
        where: { id },
        data: {
          name: data.name,
          industry: data.industry ?? null,
          size: data.size ?? null,
          website: data.website ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          notes: data.notes ?? null,
          updatedBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "organization.update",
          entity: "organization",
          entityId: id,
          summary: `Updated organization ${data.name}`,
        },
        tx,
      );
    });
    refreshCrm();
    return { id };
  });
}

export async function deleteOrganization(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("organizations:delete");
    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.findFirst({ where: { id, ...live } });
      if (!org) throw new ActionError("That organization no longer exists.");
      const [contacts, deals] = await Promise.all([
        tx.contact.count({ where: { organizationId: id, ...live } }),
        tx.deal.count({ where: { organizationId: id, ...live } }),
      ]);
      const blocked = checkOrganizationDelete({ contacts, deals });
      if (blocked) throw new ActionError(blocked, "rule");

      await tx.organization.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "organization.delete",
          entity: "organization",
          entityId: id,
          summary: `Deleted organization ${org.name}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
