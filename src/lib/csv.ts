/**
 * CSV for spreadsheets. A cell that starts with = + - @ (or a tab or carriage return) would be run
 * as a formula by Excel and Google Sheets, which is how a hostile enquiry could attack whoever
 * opens an export, so such cells are prefixed with a quote. A byte-order mark makes Excel read
 * the file as UTF-8 (names with accents, the peso sign).
 */
const FORMULA = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * Reads CSV text into rows of cells (RFC 4180): quoted cells may hold commas, quotes ("") and line
 * breaks; a leading byte-order mark and blank lines are ignored.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}
