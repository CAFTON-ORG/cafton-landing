/**
 * Contract wording is plain text. Blank lines separate blocks, and a short line on its own that
 * looks like a heading ("1. Scope", "SCOPE", "## Scope") is set as one. The web page and the PDF
 * share this so they always read the same.
 */
export interface Block {
  kind: "heading" | "paragraph";
  text: string;
}

const looksLikeHeading = (line: string) =>
  /^#{1,3}\s+\S/.test(line) ||
  /^\d+(\.\d+)*\.?\s+[A-Z][^.]{0,60}$/.test(line) ||
  (line.length > 2 && line.length <= 60 && line === line.toUpperCase() && /[A-Z]/.test(line));

export function contractBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;
    const [first, ...rest] = block.split("\n");
    // A heading line may sit directly on top of its paragraph, with no blank line between.
    if (looksLikeHeading(first.trim())) {
      blocks.push({ kind: "heading", text: first.trim().replace(/^#{1,3}\s+/, "") });
      const remainder = rest.join("\n").trim();
      if (remainder) blocks.push({ kind: "paragraph", text: remainder });
    } else {
      blocks.push({ kind: "paragraph", text: block });
    }
  }
  return blocks;
}
