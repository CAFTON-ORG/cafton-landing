/**
 * A deal made from an enquiry keeps the form's answers in its description as plain lines
 * ("Budget: Not sure yet"). This reads such lines back into label/value pairs, so they can be
 * shown as a list instead of a block of text. Lines that are not "Label: value" are ignored.
 */
export function parseKeyLines(text: string): [string, string][] {
  const pairs: [string, string][] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z][A-Za-z ]{1,39}): (.+)$/.exec(line.trim());
    if (match) pairs.push([match[1], match[2]]);
  }
  return pairs;
}
