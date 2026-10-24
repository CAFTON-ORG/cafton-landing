"use server";

import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { live } from "../repository/mappers";
import { checkEmailable } from "../rules/core";
import { sendEmailSchema, type SendEmailInput } from "../schemas";
import { guard, refreshCrm } from "./guard";
import { assertSubjectExists, logActivity, subjectPermission } from "./shared";

/** The address a message to this lead, contact or deal's contact goes to. */
async function recipientOf(subject: { leadId?: string; contactId?: string; dealId?: string }) {
  if (subject.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: subject.leadId, ...live },
      select: { email: true, firstName: true, lastName: true },
    });
    return lead && { email: lead.email, name: `${lead.firstName} ${lead.lastName}`.trim() };
  }
  if (subject.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: subject.contactId, ...live },
      select: { email: true, firstName: true, lastName: true },
    });
    return (
      contact && { email: contact.email, name: `${contact.firstName} ${contact.lastName}`.trim() }
    );
  }
  const deal = await prisma.deal.findFirst({
    where: { id: subject.dealId, ...live },
    select: { contact: { select: { email: true, firstName: true, lastName: true } } },
  });
  return (
    deal && {
      email: deal.contact.email,
      name: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
    }
  );
}

/**
 * Sends an email to the person on a lead, contact or deal, and keeps it on the timeline. The
 * replies go to the sender's own address. It is logged only once it has been handed to the mail
 * service, so the timeline never claims something was sent that was not.
 */
export async function sendRecordEmail(input: SendEmailInput): Promise<ActionResult> {
  return runAction(async () => {
    const data = parse(sendEmailSchema, input);
    const actor = await guard(subjectPermission(data.to));

    const limit = checkRateLimit(`crm-email:${actor.id}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!limit.allowed) {
      throw new ActionError("You've sent a lot of emails this hour. Please wait a little.");
    }

    await prisma.$transaction((tx) => assertSubjectExists(tx, data.to));
    const recipient = await recipientOf(data.to);
    const blocked = checkEmailable(recipient?.email);
    if (blocked || !recipient)
      throw new ActionError(blocked ?? "That record no longer exists.", "rule");

    const sent = await sendMail({
      to: recipient.email,
      subject: data.subject,
      text: `${data.body}\n\n${actor.name}\nCafton`,
      replyTo: actor.email,
    });
    if (!sent.ok) {
      throw new ActionError(
        sent.reason === "not-configured"
          ? "Email isn't set up on this site yet (it needs RESEND_API_KEY and MAIL_FROM), so nothing was sent."
          : sent.reason === "rejected"
            ? "The email service refused the message. Check the address and try again. Nothing was sent."
            : "Couldn't reach the email service. Nothing was sent; please try again.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await logActivity(
        tx,
        actor,
        data.to as never,
        "email",
        `To: ${recipient.name} <${recipient.email}>\nSubject: ${data.subject}\n\n${data.body}`,
      );
      await recordAudit(
        actor,
        {
          action: "email.send",
          entity: data.to.dealId ? "deal" : data.to.leadId ? "lead" : "contact",
          entityId: data.to.dealId ?? data.to.leadId ?? data.to.contactId,
          summary: `Emailed ${recipient.email}: ${data.subject}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
