import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the small text format used by the editable long-form pages (privacy, legal):
 *
 * - a blank line starts a new paragraph; a line starting with "- " is a bullet
 * - **bold** and [link text](address); an address is a path (/contact), https://… or mailto:…
 * - {{email}}, {{city}} and {{country}} are filled from `vars`
 * - {{name}} inside text, or on a line of its own, is replaced by `inline[name]` / `blocks[name]`
 *
 * Everything is built as React elements, never as HTML, so nothing typed here can inject markup,
 * and an address that is not one of the three safe kinds is shown as plain text.
 */

const LINK = "font-medium text-foreground underline underline-offset-4";
const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{([\w-]+)\}\}/g;

function isSafeAddress(href: string) {
  return /^\/(?!\/)/.test(href) || /^https:\/\//.test(href) || /^mailto:[^\s@]+@[^\s@]+$/.test(href);
}

function inlineNodes(text: string, inline: Record<string, ReactNode>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [whole, bold, label, href, name] = match;
    if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {bold}
        </strong>,
      );
    } else if (label !== undefined && href !== undefined) {
      if (!isSafeAddress(href)) nodes.push(label);
      else if (href.startsWith("/"))
        nodes.push(
          <Link key={key++} href={href} className={LINK}>
            {label}
          </Link>,
        );
      else
        nodes.push(
          <a
            key={key++}
            href={href}
            {...(href.startsWith("https://") && { target: "_blank", rel: "noopener noreferrer" })}
            className={LINK}
          >
            {label}
          </a>,
        );
    } else if (name !== undefined) {
      nodes.push(name in inline ? <span key={key++}>{inline[name]}</span> : whole);
    }
    last = match.index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({
  text,
  vars = {},
  inline = {},
  blocks = {},
  paragraphClassName,
}: {
  text: string;
  vars?: Record<string, string>;
  inline?: Record<string, ReactNode>;
  blocks?: Record<string, ReactNode>;
  paragraphClassName?: string;
}) {
  const filled = text.replace(/\{\{(email|city|country)\}\}/g, (whole, name: string) => vars[name] ?? whole);

  return (
    <>
      {filled
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => {
          const standalone = block.match(/^\{\{([\w-]+)\}\}$/);
          if (standalone && standalone[1] in blocks) return <div key={index}>{blocks[standalone[1]]}</div>;

          const lines = block.split("\n").map((line) => line.trim());
          if (lines.every((line) => line.startsWith("- "))) {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5">
                {lines.map((line, i) => (
                  <li key={i}>{inlineNodes(line.slice(2), inline)}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className={paragraphClassName}>
              {inlineNodes(lines.join(" "), inline)}
            </p>
          );
        })}
    </>
  );
}
