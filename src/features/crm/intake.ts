import "server-only";

import { getServicePillar } from "@/config/services";
import type { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { buildEnquirySummary, type ContactFormData } from "./contact";
import { live } from "./mappers";
import { nextLeadOwner } from "./repository/assignment";
import { scoreLead } from "./scoring";
import { acknowledgeLead, notifyStaffOfLead } from "./emails";
import { bookFromWebsite, type BookingOutcome } from "@/features/schedule/website";
import type { MeetingMode } from "@/features/schedule/types";

export type IntakeResult =
  { ok: true; reference: string; meeting?: BookingOutcome } | { ok: false; message: string };

interface IntakeContext {
  /** Which form or campaign sent it, e.g. "contact-page". */
  leadSource: string;
  pageName: string;
  /** Path on our own site the form was on. */
  pagePath: string;
}

/** The people on the receiving end of the form are a system actor, not a staff member. */
const WEBSITE = { id: "system:website", name: "Website contact form" };

/**
 * Stores a website enquiry as a Lead. It replaces the HubSpot submission:
 * staff see it in Dashboard > CRM > Leads. Everything happens in one
 * transaction, so a lead never exists without its first timeline entry and
 * follow-up task.
 */
export async function createLeadFromWebsite(
  form: ContactFormData,
  context: IntakeContext,
  /** A time the visitor picked on the contact form's calendar, if they did. */
  meeting?: { start: Date; mode: MeetingMode },
): Promise<IntakeResult> {
  if (!isDatabaseConfigured) {
    return {
      ok: false,
      message: "The contact form isn't configured yet. Please email us directly.",
    };
  }

  try {
    const email = form.email.trim().toLowerCase();
    const goalsArea =
      getServicePillar(form.goalsCategory)?.title ?? (form.goalsCategory || undefined);

    const lead = await prisma.$transaction(async (tx) => {
      // Link to an existing contact when we already know this person.
      const known = await tx.contact.findFirst({
        where: { ...live, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });

      // Round-robin: the next person in turn takes it, if anyone has been chosen to.
      const owner = await nextLeadOwner(tx);

      const lead = await tx.lead.create({
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email,
          phone: form.phone.trim() || undefined,
          businessName: form.businessName.trim() || undefined,
          goalsArea,
          budget: form.budget || undefined,
          timeline: form.timeline || undefined,
          source: context.leadSource,
          pagePath: context.pagePath,
          answers: form as unknown as Prisma.InputJsonValue,
          contactId: known?.id,
          ownerId: owner?.id,
          score: scoreLead({
            budget: form.budget,
            timeline: form.timeline,
            phone: form.phone,
            email,
            businessName: form.businessName,
            answers: form as unknown as Record<string, unknown>,
          }).score,
        },
      });

      await tx.activity.create({
        data: {
          type: "system",
          leadId: lead.id,
          contactId: known?.id,
          body: `Submitted the contact form on ${context.pageName}.\n\n${buildEnquirySummary(form)}`,
          createdByName: WEBSITE.name,
        },
      });

      if (owner) {
        await tx.activity.create({
          data: {
            type: "system",
            leadId: lead.id,
            contactId: known?.id,
            body: `Assigned to ${owner.name} (next in turn).`,
            createdByName: WEBSITE.name,
          },
        });
      }

      // Standard practice: every enquiry gets a reply-by date, so none is forgotten.
      const due = new Date();
      due.setDate(due.getDate() + 1);
      due.setHours(23, 59, 59, 0);
      await tx.task.create({
        data: {
          title: `Reply to ${lead.firstName} ${lead.lastName} (${lead.reference})`,
          dueAt: due,
          leadId: lead.id,
          assigneeId: owner?.id,
        },
      });

      await recordAudit(
        WEBSITE,
        {
          action: "lead.create",
          entity: "lead",
          entityId: lead.id,
          summary: `New website enquiry ${lead.reference} from ${lead.firstName} ${lead.lastName}`,
        },
        tx,
      );
      return lead;
    });

    // The lead is safe. What follows (a booked time, emails) can fail without losing it.
    const name = `${lead.firstName} ${lead.lastName}`.trim();
    const outcome = meeting
      ? await bookFromWebsite({
          start: meeting.start,
          mode: meeting.mode,
          lead: { id: lead.id, reference: lead.reference, contactId: lead.contactId },
          attendee: { name, email: lead.email, phone: lead.phone ?? undefined },
        })
      : undefined;
    const summary = { ...lead, name };
    await notifyStaffOfLead(summary).catch((error) =>
      console.error("Unable to email the team.", error),
    );
    // A booked time already sends the visitor its own email.
    if (outcome !== "requested" && outcome !== "confirmed")
      await acknowledgeLead(summary).catch((error) =>
        console.error("Unable to acknowledge the enquiry.", error),
      );

    return { ok: true, reference: lead.reference, ...(outcome && { meeting: outcome }) };
  } catch (error) {
    console.error("Unable to store the contact enquiry.", error);
    return {
      ok: false,
      message: "Something went wrong sending your message. Please try again or email us directly.",
    };
  }
}
