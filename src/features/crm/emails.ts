import "server-only";
import { notify } from "@/features/notifications/server";

import { staffEmailsWith } from "@/features/schedule/emails";
import { staffIdsWith } from "@/features/notifications/server";
import { sendMail, siteOrigin } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";

interface LeadSummary {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  goalsArea?: string | null;
  budget?: string | null;
  timeline?: string | null;
}

/** To the team when a new enquiry arrives, so nobody has to watch the dashboard. */
export async function notifyStaffOfLead(lead: LeadSummary) {
  await notify(await staffIdsWith("leads:update"), {
    kind: "lead.new",
    title: `New enquiry from ${lead.name}`,
    body: [lead.businessName, lead.goalsArea].filter(Boolean).join(" · ") || lead.email,
    href: `/dashboard/crm/leads/${lead.id}`,
  });
  const to = await staffEmailsWith("leads:update");
  if (to.length === 0) return;
  const { html, text } = renderEmail({
    title: `New enquiry from ${lead.name}`,
    paragraphs: [
      "Someone filled in the contact form. Replying within one business day is the promise on the site.",
    ],
    facts: [
      ["Reference", lead.reference],
      ["Email", lead.email],
      ...(lead.phone ? ([["Phone", lead.phone]] as [string, string][]) : []),
      ...(lead.businessName ? ([["Business", lead.businessName]] as [string, string][]) : []),
      ...(lead.goalsArea ? ([["Interested in", lead.goalsArea]] as [string, string][]) : []),
      ...(lead.budget ? ([["Budget", lead.budget]] as [string, string][]) : []),
      ...(lead.timeline ? ([["Timeline", lead.timeline]] as [string, string][]) : []),
    ],
    button: { label: "Open the lead", href: `${siteOrigin()}/dashboard/crm/leads/${lead.id}` },
  });
  await sendMail({
    to,
    subject: `New enquiry ${lead.reference}: ${lead.name}`,
    text,
    html,
    replyTo: lead.email,
  });
}

/** To the enquirer, so they know it arrived. Skipped when a meeting email already says so. */
export async function acknowledgeLead(lead: LeadSummary) {
  const { html, text } = renderEmail({
    title: "Thanks, we got your message",
    paragraphs: [
      `Hi ${lead.name.split(" ")[0]}, thanks for reaching out to Cafton. We usually reply within one business day.`,
      `Your reference is ${lead.reference}. Reply to this email if you would like to add anything.`,
    ],
    button: { label: "Visit cafton.com", href: siteOrigin() },
  });
  await sendMail({ to: lead.email, subject: "We received your message", text, html });
}
