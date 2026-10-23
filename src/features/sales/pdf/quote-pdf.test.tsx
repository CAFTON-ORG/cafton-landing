import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import type { PublicQuote } from "../types";
import { renderQuotePdf } from "./quote-pdf";

const company = { name: "Cafton", email: "contact@cafton.com", place: "Baguio City, Philippines" };

const line = (index: number) => ({
  description: `Line ${index}`,
  quantityMilli: 1000,
  unitLabel: "hour",
  unitPriceMinor: 250_000,
  discountPct: 0,
  totalMinor: 250_000,
});

const quote: PublicQuote = {
  reference: "QT-2026-0001",
  version: 1,
  title: "Online ordering",
  intro: "Thank you for the time.",
  terms: "Includes two rounds of revisions.",
  paymentTerms: "The deposit is due when the quote is accepted.",
  depositPct: 50,
  currency: "PHP",
  status: "sent",
  taxRatePct: 12,
  subtotalMinor: 250_000,
  taxMinor: 30_000,
  totalMinor: 280_000,
  validUntil: "2026-11-22",
  recipientName: "Maria Santos",
  issuedOn: "2026-10-23",
  lines: [line(1)],
};

interface Run {
  text: string;
  /** Points from the left edge of the page. */
  x: number;
  /** Points up from the bottom edge of the page. */
  y: number;
}

/** A PDF matrix [a b c d e f]. */
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `next` applied first, then `outer`: how a `cm` operator extends the current transform. */
const multiply = (next: Matrix, outer: Matrix): Matrix => [
  next[0] * outer[0] + next[1] * outer[2],
  next[0] * outer[1] + next[1] * outer[3],
  next[2] * outer[0] + next[3] * outer[2],
  next[2] * outer[1] + next[3] * outer[3],
  next[4] * outer[0] + next[5] * outer[2] + outer[4],
  next[4] * outer[1] + next[5] * outer[3] + outer[5],
];

const NUMBER = "(-?[\\d.]+)";
const SIX_NUMBERS = Array(6).fill(NUMBER).join(" ");
const STREAM = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
const HEX_STRING = /<([0-9a-fA-F]*)>/g;
const CM = new RegExp(`^${SIX_NUMBERS} cm$`);
const TM = new RegExp(`^${SIX_NUMBERS} Tm$`);

const numbers = (match: RegExpExecArray) => match.slice(1).map(Number) as Matrix;

/**
 * Every piece of text drawn on the pages, with where it ends up on the page. react-pdf writes each
 * run as hex strings in a `[<..> kern <..>] TJ` array, positioned by a text matrix inside nested
 * `q ... cm ... Q` blocks, so the real position is the text matrix through every enclosing `cm`.
 */
function pdfRuns(pdf: Buffer): Run[] {
  const runs: Run[] = [];
  for (const [, body] of pdf.toString("latin1").matchAll(STREAM)) {
    let content: string;
    try {
      content = inflateSync(Buffer.from(body, "latin1")).toString("latin1");
    } catch {
      continue; // fonts and images are not text
    }
    let current = IDENTITY;
    let text = IDENTITY;
    const saved: Matrix[] = [];
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      const cm = CM.exec(line);
      const tm = TM.exec(line);
      if (line === "q") saved.push(current);
      else if (line === "Q") current = saved.pop() ?? current;
      else if (cm) current = multiply(numbers(cm), current);
      else if (tm) text = numbers(tm);
      else if (line.endsWith("TJ")) {
        const hex = [...line.matchAll(HEX_STRING)].map((part) => part[1]).join("");
        const placed = multiply(text, current);
        runs.push({
          text: Buffer.from(hex, "hex").toString("latin1"),
          x: placed[4],
          y: placed[5],
        });
      }
    }
  }
  return runs;
}

const pdfText = (pdf: Buffer) =>
  pdfRuns(pdf)
    .map((run) => run.text)
    .join("\n");

const pageCount = (pdf: Buffer) =>
  (pdf.toString("latin1").match(/\/Type \/Page\b(?!s)/g) ?? []).length;

describe("the quote PDF", () => {
  it("is a one-page PDF for a short quote", async () => {
    const pdf = await renderQuotePdf(quote, company);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
  });

  it("puts the page footer inside the page, at the bottom", async () => {
    const pdf = await renderQuotePdf(quote, company);
    const footer = pdfRuns(pdf).find((run) => run.text.includes("page 1 of 1"));
    expect(footer, "the footer text is missing").toBeDefined();
    // The footer once rendered at x = 0, y = 0 (the page corner, half off the page): it was in the
    // file but invisible. It must sit inside the margins, near the bottom.
    expect(footer!.x).toBeGreaterThanOrEqual(30);
    expect(footer!.y).toBeGreaterThan(10);
    expect(footer!.y).toBeLessThan(80);
  });

  it("numbers every page and repeats the table header when the lines run on", async () => {
    const many = { ...quote, lines: Array.from({ length: 40 }, (_, i) => line(i + 1)) };
    const pdf = await renderQuotePdf(many, company);
    const pages = pageCount(pdf);
    expect(pages).toBeGreaterThan(1);
    const text = pdfText(pdf);
    for (let page = 1; page <= pages; page += 1) {
      expect(text).toContain(`page ${page} of ${pages}`);
    }
    // One table header on every page.
    expect(text.split("Description").length - 1).toBe(pages);
  });

  it("says the status only when the quote is not simply sent", async () => {
    expect(pdfText(await renderQuotePdf(quote, company))).not.toContain("Sent");
    const accepted = { ...quote, status: "accepted" as const, acceptedByName: "Maria Santos" };
    expect(pdfText(await renderQuotePdf(accepted, company))).toContain("Accepted");
  });
});
