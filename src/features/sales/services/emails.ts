import "server-only";

import { getSiteSettings } from "@/features/cms/repository/site";
import { SITE_NAME } from "@/config/site";
import { env } from "@/lib/env";
import { formatMinor } from "@/lib/money";
import { sendMail, siteOrigin } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import { renderQuotePdf } from "../pdf/quote-pdf";
import type { PublicQuote } from "../types";

export const quoteLink = (token: string) => `${siteOrigin()}/q/${token}`;

/** Who the quote is from, for the PDF header: the same details as the website footer. */
export async function companyDetails() {
  const settings = await getSiteSettings();
  return {
    name: SITE_NAME,
    email: settings.email,
    place: [settings.city, settings.country].filter(Boolean).join(", "),
  };
}

const replyAddress = () =>
  (env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM ?? "no-reply@cafton.com").trim();

/** To the client: the link to review and accept, and the PDF attached. */
export async function sendQuoteEmail(options: {
  to: string;
  recipientName: string;
  quote: PublicQuote;
  token: string;
  senderName: string;
  replyTo?: string;
}) {
  const { quote } = options;
  const company = await companyDetails();
  const pdf = await renderQuotePdf(quote, company);
  const { html, text } = renderEmail({
    title: `Your quote from ${company.name}`,
    paragraphs: [
      `Hi ${options.recipientName.split(" ")[0]}, thank you for talking with us. Here is our quote for ${quote.title}.`,
      "You can read it, accept it or tell us what to change using the button below. The PDF is attached too.",
    ],
    facts: [
      ["Quote", `${quote.reference}${quote.version > 1 ? ` (version ${quote.version})` : ""}`],
      ["Total", formatMinor(quote.totalMinor, quote.currency)],
      ...(quote.validUntil ? ([["Valid until", quote.validUntil]] as [string, string][]) : []),
    ],
    button: { label: "Review and accept", href: quoteLink(options.token) },
    footnote: `Sent by ${options.senderName}. Reply to this email with any question.`,
  });
  return sendMail({
    to: options.to,
    subject: `Quote ${quote.reference}: ${quote.title}`,
    text,
    html,
    replyTo: options.replyTo ?? replyAddress(),
    attachments: [{ filename: `${quote.reference}.pdf`, content: pdf.toString("base64") }],
  });
}
