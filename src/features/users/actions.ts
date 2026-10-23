"use server";

import { revalidatePath } from "next/cache";

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
import { resolvePermissions, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { renderEmail } from "@/lib/mail-templates";
import { sendMail, siteOrigin } from "@/lib/mail";
import { emailSchema, inviteSchema, type InviteInput } from "./schema";
import { checkAssignable, checkRemoval, checkRoleChange, checkTakesLeads } from "./rules";

async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

function refresh() {
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard/audit");
}

async function loadRole(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  if (!role)
    throw new ActionError("That role no longer exists.", "rule", { roleId: "Choose a role." });
  return role;
}

const ownerCount = () => prisma.profile.count({ where: { role: { key: "owner" } } });

const findProfile = (email: string) =>
  prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { role: true },
  });

/**
 * Invites someone by email. They then sign in with that Google account; the
 * database trigger (and the sign-in fallback in the DAL) turns the invite into
 * a profile with this role.
 */
export async function inviteUser(input: InviteInput): Promise<ActionResult<{ emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("users:invite");
    const { email, roleId } = parse(inviteSchema, input);
    const role = await loadRole(roleId);

    const denied = checkAssignable(actor, resolvePermissions(role));
    if (denied) throw new ActionError(denied, "rule");

    if (await findProfile(email)) {
      throw new ActionError("This person already has access.", "rule", {
        email: "This person already has access.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffInvite.upsert({
        where: { email },
        update: { roleId: role.id, invitedBy: actorId(actor) },
        create: { email, roleId: role.id, invitedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "user.invite",
          entity: "user",
          entityId: email,
          summary: `Invited ${email} as ${role.name}`,
          metadata: { role: role.key },
        },
        tx,
      );
    });
    refresh();
    // The invite exists whatever happens to the email: they can still sign in with that Google account.
    return { emailed: await sendInviteEmail(email, role.name, actor.name) };
  });
}

/** Sends (or sends again) the invitation email to someone whose invitation is still open. */
export async function resendInvite(email: string): Promise<ActionResult<{ emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("users:invite");
    const target = parse(emailSchema, email);
    const invite = await prisma.staffInvite.findUnique({
      where: { email: target },
      include: { role: true },
    });
    if (!invite) throw new ActionError("There is no open invitation for this address.", "rule");
    const emailed = await sendInviteEmail(target, invite.role.name, actor.name);
    await recordAudit(actor, {
      action: "user.invite.resend",
      entity: "user",
      entityId: target,
      summary: `Sent the invitation again to ${target}`,
    });
    if (!emailed)
      throw new ActionError("The email could not be sent. Check the email settings.", "rule");
    return { emailed };
  });
}

async function sendInviteEmail(email: string, roleName: string, inviterName: string) {
  const { html, text } = renderEmail({
    title: "You have been invited to the Cafton dashboard",
    paragraphs: [
      `${inviterName} invited you to join as ${roleName}.`,
      "Sign in with this Google account (the one this email was sent to). Your access is ready as soon as you do.",
    ],
    button: { label: "Open the dashboard", href: `${siteOrigin()}/login` },
    footnote:
      "If you were not expecting this, you can ignore this email: nothing happens until someone signs in.",
  });
  const result = await sendMail({
    to: email,
    subject: "You have been invited to the Cafton dashboard",
    text,
    html,
  });
  return result.ok;
}

export async function changeUserRole(email: string, roleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:update");
    const target = parse(emailSchema, email);
    const role = await loadRole(roleId);

    const denied = checkAssignable(actor, resolvePermissions(role));
    if (denied) throw new ActionError(denied, "rule");

    const profile = await findProfile(target);
    const blocked = checkRoleChange({
      actor,
      target: { email: target, roleKey: profile?.role.key ?? "" },
      newRoleKey: role.key,
      ownerCount: await ownerCount(),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.staffInvite.updateMany({ where: { email: target }, data: { roleId: role.id } });
      await tx.profile.updateMany({
        where: { email: { equals: target, mode: "insensitive" } },
        data: { roleId: role.id },
      });
      await recordAudit(
        actor,
        {
          action: "user.role",
          entity: "user",
          entityId: target,
          summary: `Changed ${target} from ${profile?.role.name ?? "invited"} to ${role.name}`,
          metadata: { from: profile?.role.key ?? null, to: role.key },
        },
        tx,
      );
    });
    refresh();
  });
}

/** Removes a person's access, or cancels an invitation that was never used. */
export async function removeUser(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:remove");
    const target = parse(emailSchema, email);
    const profile = await findProfile(target);

    const blocked = checkRemoval({
      actor,
      target: profile ? { email: target, roleKey: profile.role.key } : null,
      ownerCount: await ownerCount(),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      if (profile) await tx.profile.delete({ where: { id: profile.id } });
      await tx.staffInvite.deleteMany({ where: { email: target } });
      await recordAudit(
        actor,
        {
          action: profile ? "user.remove" : "user.invite.cancel",
          entity: "user",
          entityId: target,
          summary: profile ? `Removed ${target}` : `Cancelled the invitation for ${target}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Puts someone in, or takes them out of, the turn order for new website enquiries. */
export async function setTakesLeads(email: string, takes: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:update");
    const target = parse(emailSchema, email);
    const profile = await prisma.profile.findFirst({
      where: { email: { equals: target, mode: "insensitive" } },
      include: { role: { include: { permissions: true } } },
    });
    if (!profile) throw new ActionError("That person has not signed in yet.", "rule");
    if (takes) {
      const blocked = checkTakesLeads({
        status: "Active",
        canWorkLeads: resolvePermissions(profile.role).includes("leads:update"),
      });
      if (blocked) throw new ActionError(blocked, "rule");
    }

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: profile.id }, data: { takesLeads: takes } });
      await recordAudit(
        actor,
        {
          action: "user.leads",
          entity: "user",
          entityId: profile.email,
          summary: takes
            ? `${profile.email} now takes a turn at new enquiries`
            : `${profile.email} no longer takes new enquiries`,
        },
        tx,
      );
    });
    refresh();
    revalidatePath("/dashboard/crm/leads");
  });
}
