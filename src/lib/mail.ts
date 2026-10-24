import "server-only";

import { SITE_URL } from "@/config/site";
import { env } from "@/lib/env";

/** One email. `attachments` content is base64. */
export interface Mail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

export type MailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not-configured" | "rejected" | "network"; message?: string };

/** The public address of the site, for links in emails. Falls back to the production address. */
export const siteOrigin = () => (env.SITE_URL ?? SITE_URL).replace(/\/$/, "");

export const isMailConfigured = () => Boolean(env.RESEND_API_KEY && env.MAIL_FROM);

/**
 * Sends one email through Resend. It never throws: the caller decides what a failure means
 * (an invite still exists if its email could not be sent). Without RESEND_API_KEY and
 * MAIL_FROM nothing is sent and the reason says so.
 */
export async function sendMail(mail: Mail): Promise<MailResult> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return { ok: false, reason: "not-configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html && { html: mail.html }),
        ...(mail.replyTo && { reply_to: mail.replyTo }),
        ...(mail.attachments && { attachments: mail.attachments }),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok || !body.id) {
      console.error("Mail: Resend rejected the message.", response.status, body.message);
      return { ok: false, reason: "rejected", message: body.message };
    }
    return { ok: true, id: body.id };
  } catch (error) {
    console.error("Mail: could not reach Resend.", error);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
