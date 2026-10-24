import { parseTagList } from "./tags";

/**
 * Turning a spreadsheet export (CSV) into contacts or organizations. Pure: it only reads rows and
 * says what is wrong with them; the action decides what already exists and writes the rest.
 */

export const IMPORT_LIMIT = 2000;

const norm = (header: string) =>
  header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Column titles people commonly use, by the field they mean. */
const ALIASES: Record<string, string[]> = {
  firstName: ["first name", "firstname", "given name", "first"],
  lastName: ["last name", "lastname", "surname", "family name", "last"],
  name: ["name", "full name", "contact", "contact name"],
  email: ["email", "e mail", "email address", "mail"],
  phone: ["phone", "mobile", "phone number", "telephone", "tel", "contact number"],
  position: ["position", "title", "job title", "role"],
  organization: ["organization", "organisation", "company", "business", "company name", "account"],
  tags: ["tags", "tag", "labels"],
  industry: ["industry", "sector"],
  size: ["size", "company size", "employees"],
  website: ["website", "web", "url", "site"],
  address: ["address", "location"],
};

function columnMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const seen = header.map(norm);
  for (const [field, names] of Object.entries(ALIASES)) {
    const at = seen.findIndex((title) => names.includes(title));
    if (at !== -1) map[field] = at;
  }
  return map;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactDraft {
  line: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  organization?: string;
  tags: string[];
}

export interface OrganizationDraft {
  line: number;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  address?: string;
  tags: string[];
}

export interface RowProblem {
  line: number;
  message: string;
}

export interface Mapped<T> {
  rows: T[];
  problems: RowProblem[];
  /** What the file's columns were understood as, so the person can check. */
  understood: string[];
}

const cell = (row: string[], at: number | undefined) =>
  at === undefined ? undefined : row[at]?.trim() || undefined;

/** "Ada Lovelace" -> Ada / Lovelace; "Lovelace, Ada" -> Ada / Lovelace. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const text = full.trim().replace(/\s+/g, " ");
  if (text.includes(",")) {
    const [last, first] = text.split(",").map((part) => part.trim());
    return { firstName: first || last, lastName: first ? last : "" };
  }
  const parts = text.split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function mapContacts(table: string[][]): Mapped<ContactDraft> {
  const [header, ...body] = table;
  const columns = columnMap(header ?? []);
  const problems: RowProblem[] = [];
  const rows: ContactDraft[] = [];
  const understood = Object.keys(columns);

  if (columns.email === undefined) {
    return { rows, understood, problems: [{ line: 1, message: 'There is no "Email" column.' }] };
  }
  if (columns.name === undefined && columns.firstName === undefined) {
    return {
      rows,
      understood,
      problems: [{ line: 1, message: 'There is no "Name" (or "First name") column.' }],
    };
  }

  for (const [index, row] of body.entries()) {
    const line = index + 2;
    const email = cell(row, columns.email)?.toLowerCase();
    if (!email || !EMAIL.test(email)) {
      problems.push({ line, message: email ? `"${email}" is not a valid email.` : "No email." });
      continue;
    }
    let firstName = cell(row, columns.firstName) ?? "";
    let lastName = cell(row, columns.lastName) ?? "";
    if (!firstName && columns.name !== undefined) {
      ({ firstName, lastName } = splitName(cell(row, columns.name) ?? ""));
    }
    if (!firstName) {
      problems.push({ line, message: "No name." });
      continue;
    }
    rows.push({
      line,
      firstName: firstName.slice(0, 100),
      lastName: lastName.slice(0, 100),
      email: email.slice(0, 200),
      phone: cell(row, columns.phone)?.slice(0, 50),
      position: cell(row, columns.position)?.slice(0, 100),
      organization: cell(row, columns.organization)?.slice(0, 200),
      tags: parseTagList(cell(row, columns.tags) ?? ""),
    });
  }
  return { rows, problems, understood };
}

export function mapOrganizations(table: string[][]): Mapped<OrganizationDraft> {
  const [header, ...body] = table;
  const columns = columnMap(header ?? []);
  const understood = Object.keys(columns);
  const nameAt = columns.organization ?? columns.name;
  if (nameAt === undefined) {
    return {
      rows: [],
      understood,
      problems: [{ line: 1, message: 'There is no "Name" (or "Organization") column.' }],
    };
  }
  const rows: OrganizationDraft[] = [];
  const problems: RowProblem[] = [];
  for (const [index, row] of body.entries()) {
    const line = index + 2;
    const name = cell(row, nameAt);
    if (!name) {
      problems.push({ line, message: "No name." });
      continue;
    }
    rows.push({
      line,
      name: name.slice(0, 200),
      industry: cell(row, columns.industry)?.slice(0, 100),
      size: cell(row, columns.size)?.slice(0, 50),
      website: cell(row, columns.website)?.slice(0, 200),
      phone: cell(row, columns.phone)?.slice(0, 50),
      address: cell(row, columns.address)?.slice(0, 300),
      tags: parseTagList(cell(row, columns.tags) ?? ""),
    });
  }
  return { rows, problems, understood };
}
