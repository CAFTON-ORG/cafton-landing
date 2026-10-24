// Built with fromCharCode so this source file never contains the raw separator characters.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");
const BACKSLASH = String.fromCharCode(0x5c);

/**
 * Serialises structured data for a <script type="application/ld+json"> tag.
 *
 * The result is placed inside a script element as raw text, so the only way to
 * break out of it is a literal "</script" (or "<!--") in the data. Escaping
 * every "<" removes that possibility whatever the data holds, which matters
 * once the content comes from the CMS rather than from our source code. The
 * line and paragraph separators are escaped too: they are valid JSON but were
 * line terminators in older JavaScript parsers.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, BACKSLASH + "u003c")
    .replace(/>/g, BACKSLASH + "u003e")
    .replace(/&/g, BACKSLASH + "u0026")
    .replace(LINE_SEPARATOR, BACKSLASH + "u2028")
    .replace(PARAGRAPH_SEPARATOR, BACKSLASH + "u2029");
}
