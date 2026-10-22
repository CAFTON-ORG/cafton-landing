import "server-only";

import { companyDetails } from "@/features/sales/emails";
import { sendMail, siteOrigin } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import { env } from "@/lib/env";
import { renderContractPdf } from "./pdf/contract-pdf";
import { CONTRACT_KIND_LABEL } from "./rules";
import type { PublicContract } from "./types";

export const contractLink = (token: string) => `${siteOrigin()}/c/${token}`;

const replyAddress = () =>
  (env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM ?? "no-reply@cafton.com").trim();

/** To the client: the link to read and sign, and the PDF attached. */
export async function sendContractEmail(options: {
  to: string;
  contract: PublicContract;
  token: string;
  senderName: string;
}) {
  const { contract } = options;
  const company = await companyDetails();
  const pdf = await renderContractPdf(contract, company);
  const kind = CONTRACT_KIND_LABEL[contract.kind].toLowerCase();
  const { html, text } = renderEmail({
    title: `Your ${kind} from ${company.name}`,
    paragraphs: [
      `Hi ${contract.recipientName.split(" ")[0]}, here is the ${kind} for ${contract.title}.`,
      "Please read it, then sign online using the button below. The PDF is attached too.",
    ],
    facts: [
      ["Document", contract.reference],
      ...(contract.validUntil ? ([["Sign by", contract.validUntil]] as [string, string][]) : []),
    ],
    button: { label: "Read and sign", href: contractLink(options.token) },
    footnote: `Sent by ${options.senderName}. Reply to this email with any question.`,
  });
  return sendMail({
    to: options.to,
    subject: `${CONTRACT_KIND_LABEL[contract.kind]} ${contract.reference}: ${contract.title}`,
    text,
    html,
    replyTo: replyAddress(),
    attachments: [{ filename: `${contract.reference}.pdf`, content: pdf.toString("base64") }],
  });
}
