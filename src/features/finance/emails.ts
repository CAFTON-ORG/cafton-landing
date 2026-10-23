import "server-only";

import { companyDetails } from "@/features/sales/emails";
import { env } from "@/lib/env";
import { formatMinor } from "@/lib/money";
import { sendMail } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import type { InvoiceDetail } from "./invoice-types";
import { renderInvoicePdf } from "./pdf/invoice-pdf";

const replyAddress = () =>
  (env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM ?? "no-reply@cafton.com").trim();

/** To the client: the invoice as a PDF, or (when `reminder`) a polite nudge about it. */
export async function sendInvoiceEmail(options: {
  to: string;
  invoice: InvoiceDetail;
  senderName: string;
  reminder?: boolean;
  replyTo?: string;
}) {
  const { invoice } = options;
  const number = invoice.number as string;
  const company = await companyDetails();
  const pdf = await renderInvoicePdf(invoice, company);
  const first = invoice.clientName.split(" ")[0];
  const { html, text } = renderEmail({
    title: options.reminder
      ? `A reminder about invoice ${number}`
      : `Invoice ${number} from ${company.name}`,
    paragraphs: options.reminder
      ? [
          `Hi ${first}, a friendly reminder that invoice ${number} is past its due date and still shows a balance.`,
          "If you have already paid, thank you, and please ignore this message. The invoice is attached again for reference.",
        ]
      : [
          `Hi ${first}, thank you for working with us. Your invoice ${number} is attached.`,
          invoice.paymentInstructions ?? "Reply to this email if you have any question about it.",
        ],
    facts: [
      ["Invoice", number],
      ["Amount due", formatMinor(invoice.balanceMinor)],
      ...(invoice.dueDate ? ([["Due", invoice.dueDate]] as [string, string][]) : []),
    ],
    footnote: `Sent by ${options.senderName}. Reply to this email with any question.`,
  });
  return sendMail({
    to: options.to,
    subject: options.reminder
      ? `Reminder: invoice ${number} is overdue`
      : `Invoice ${number} from ${company.name}`,
    text,
    html,
    replyTo: options.replyTo ?? replyAddress(),
    attachments: [{ filename: `${number}.pdf`, content: pdf.toString("base64") }],
  });
}
