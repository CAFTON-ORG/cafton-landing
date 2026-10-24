/**
 * Plain, readable email in the Cafton style: dark button, light page. Every value that comes from a
 * person or the database is escaped before it goes into HTML; the plain-text part is sent too, so
 * clients that block HTML still get everything.
 */

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export interface EmailContent {
  title: string;
  /** Paragraphs of plain text. */
  paragraphs: string[];
  /** Optional facts shown as a small table: label, value. */
  facts?: [string, string][];
  button?: { label: string; href: string };
  /** A line in small print at the end. */
  footnote?: string;
}

export function renderEmail({ title, paragraphs, facts, button, footnote }: EmailContent) {
  const text = [
    title,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(facts ? [...facts.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(button ? [`${button.label}: ${button.href}`, ""] : []),
    ...(footnote ? [footnote] : []),
    "",
    "Cafton",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><div style="font-weight:800;letter-spacing:.08em;font-size:14px">CAFTON</div></td></tr>
<tr><td style="padding:8px 28px 4px"><h1 style="margin:0;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:8px 28px">${paragraphs
    .map((p) => `<p style="margin:12px 0;font-size:15px;line-height:1.55">${escapeHtml(p)}</p>`)
    .join("")}</td></tr>
${
  facts
    ? `<tr><td style="padding:4px 28px"><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">${facts
        .map(
          ([label, value]) =>
            `<tr><td style="padding:2px 16px 2px 0;color:#71717a">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table></td></tr>`
    : ""
}
${
  button
    ? `<tr><td style="padding:16px 28px 8px"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px">${escapeHtml(button.label)}</a></td></tr>`
    : ""
}
${footnote ? `<tr><td style="padding:12px 28px 0;font-size:12px;color:#71717a;line-height:1.5">${escapeHtml(footnote)}</td></tr>` : ""}
<tr><td style="padding:20px 28px 24px;font-size:12px;color:#a1a1aa">Cafton Software Development Services</td></tr>
</table></td></tr></table></body></html>`;

  return { html, text };
}
