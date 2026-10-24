/**
 * Custom fields: extra facts a team wants on its leads, contacts, organizations and deals, defined by
 * an administrator and filled in on the record. Pure (no database), so the rules are tested alone and
 * shared by the settings screen, the record forms and the server actions.
 *
 * A field's values live on the record as a small JSON object keyed by the field's `key`. Keys never
 * change once made, so renaming a label can't orphan stored values, and an archived field keeps its
 * values (they come back if it is restored).
 */

export const CUSTOM_ENTITIES = ["lead", "contact", "organization", "deal"] as const;
export type CustomEntity = (typeof CUSTOM_ENTITIES)[number];

export const CUSTOM_ENTITY_LABEL: Record<CustomEntity, string> = {
  lead: "Leads",
  contact: "Contacts",
  organization: "Organizations",
  deal: "Deals",
};

export const CUSTOM_TYPES = ["text", "number", "date", "select", "checkbox"] as const;
export type CustomType = (typeof CUSTOM_TYPES)[number];

export const CUSTOM_TYPE_LABEL: Record<CustomType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Choice from a list",
  checkbox: "Yes or no",
};

/** A record can carry this many fields: enough to be useful, and a bound on form length. */
export const MAX_FIELDS_PER_ENTITY = 25;
export const MAX_LABEL = 60;
export const MAX_TEXT_VALUE = 500;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 30;
export const MAX_OPTION = 60;

export interface CustomFieldDef {
  id: string;
  entity: CustomEntity;
  key: string;
  label: string;
  type: CustomType;
  /** The choices of a "choice from a list" field; empty for the other types. */
  options: string[];
  /** Must be filled in when the record's fields are saved. Never true for a yes/no field. */
  required: boolean;
  active: boolean;
  position: number;
}

export type CustomValue = string | number | boolean;
export type CustomValues = Record<string, CustomValue>;

/** "Preferred contact time" becomes "preferred_contact_time": what the stored values are keyed by. */
export function keyFromLabel(label: string): string {
  const key = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return /^[a-z]/.test(key) ? key : key ? `f_${key}`.slice(0, 40) : "field";
}

/** A key not used yet on this kind of record: "region", then "region_2", "region_3"... */
export function uniqueKey(label: string, taken: readonly string[]): string {
  const base = keyFromLabel(label);
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base.slice(0, 40 - String(n).length - 1)}_${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

/** Trimmed, no blanks, no repeats (ignoring letter case); order kept. */
export function normalizeOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const option of options) {
    const text = option.trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    result.push(text);
  }
  return result;
}

/** Why a field can't be saved as written, or null. */
export function checkDefinition(input: {
  label: string;
  type: CustomType;
  options: readonly string[];
}): string | null {
  const label = input.label.trim();
  if (!label) return "Give the field a name.";
  if (label.length > MAX_LABEL) return `Keep the name under ${MAX_LABEL} characters.`;
  if (input.type !== "select") return null;
  const options = normalizeOptions(input.options);
  if (options.length < MIN_OPTIONS)
    return `A list needs at least ${MIN_OPTIONS} different choices.`;
  if (options.length > MAX_OPTIONS) return `A list can have at most ${MAX_OPTIONS} choices.`;
  if (options.some((option) => option.length > MAX_OPTION)) {
    return `Keep each choice under ${MAX_OPTION} characters.`;
  }
  return null;
}

/** Changing a field's type would make its stored values meaningless, so it is not allowed. */
export function checkTypeChange(current: CustomType, next: CustomType): string | null {
  return current === next
    ? null
    : "A field's type can't be changed once it exists. Archive it and add a new one.";
}

export function checkFieldLimit(activeCount: number): string | null {
  return activeCount >= MAX_FIELDS_PER_ENTITY
    ? `That is the limit of ${MAX_FIELDS_PER_ENTITY} fields. Archive one you no longer use first.`
    : null;
}

export type ParsedValue = { ok: true; value: CustomValue | null } | { ok: false; error: string };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** One field's value from what a form sent. `null` means "clear it". */
export function parseFieldValue(def: CustomFieldDef, raw: unknown): ParsedValue {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  switch (def.type) {
    case "text": {
      const text = String(raw).trim();
      if (!text) return { ok: true, value: null };
      if (text.length > MAX_TEXT_VALUE) {
        return { ok: false, error: `Keep this under ${MAX_TEXT_VALUE} characters.` };
      }
      return { ok: true, value: text };
    }
    case "number": {
      const text = typeof raw === "number" ? String(raw) : String(raw).trim().replace(/,/g, "");
      if (text === "") return { ok: true, value: null };
      const number = Number(text);
      return Number.isFinite(number) && Math.abs(number) <= 1e12
        ? { ok: true, value: number }
        : { ok: false, error: "Enter a number." };
    }
    case "date": {
      const text = String(raw).trim();
      return isRealDate(text)
        ? { ok: true, value: text }
        : { ok: false, error: "Pick a real date." };
    }
    case "select": {
      const text = String(raw).trim();
      return def.options.includes(text)
        ? { ok: true, value: text }
        : { ok: false, error: "Pick one of the choices." };
    }
    case "checkbox": {
      if (raw === true || raw === "true") return { ok: true, value: true };
      if (raw === false || raw === "false") return { ok: true, value: false };
      return { ok: false, error: "Choose yes or no." };
    }
  }
}

export interface AppliedValues {
  /** The record's custom values after the change. */
  values: CustomValues;
  /** Field key -> why that value was refused. Empty when everything was accepted. */
  errors: Record<string, string>;
}

/**
 * Applies a form's values to what a record already holds. Only active fields of this kind of record
 * are read; anything else in the input is ignored, so a form can't write a key that isn't a field.
 * A cleared value removes its key. Values of other (or archived) fields are left alone.
 */
export function applyCustomValues(
  current: unknown,
  defs: readonly CustomFieldDef[],
  input: Record<string, unknown>,
): AppliedValues {
  const values: CustomValues = { ...asValues(current) };
  const errors: Record<string, string> = {};
  for (const def of defs) {
    if (!def.active || !(def.key in input)) continue;
    const parsed = parseFieldValue(def, input[def.key]);
    if (!parsed.ok) errors[def.key] = parsed.error;
    else if (parsed.value === null) delete values[def.key];
    else values[def.key] = parsed.value;
  }
  for (const def of defs) {
    if (def.active && def.required && def.type !== "checkbox" && !(def.key in values)) {
      errors[def.key] = "This field is required.";
    }
  }
  return { values, errors };
}

/** A yes/no field has no "empty", so it can't be required. */
export const canBeRequired = (type: CustomType) => type !== "checkbox";

/** How many custom fields a list shows as columns; the rest are on the record and in the CSV. */
export const LIST_COLUMN_LIMIT = 3;

/** The URL filter id of a custom field: `cf_region`. */
export const CUSTOM_FILTER_PREFIX = "cf_";
export const customFilterId = (key: string) => `${CUSTOM_FILTER_PREFIX}${key}`;

/** Only choice and yes/no fields can be filtered: exact values, so a list of them makes sense. */
export const isFilterable = (def: CustomFieldDef) =>
  def.active && (def.type === "select" || def.type === "checkbox");

/** The filter dropdown choices of a field: its list, or Yes and No. */
export function filterOptions(def: CustomFieldDef): { value: string; label: string }[] {
  return def.type === "checkbox"
    ? [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]
    : def.options.map((option) => ({ value: option, label: option }));
}

/**
 * The conditions for the custom-field filters in a URL: one per filterable field of this kind of
 * record whose value is allowed. Anything else in the URL is ignored.
 */
export function customConditions(
  filters: Record<string, string>,
  defs: readonly CustomFieldDef[],
): { key: string; equals: string | boolean }[] {
  const result: { key: string; equals: string | boolean }[] = [];
  for (const def of defs) {
    const value = filters[customFilterId(def.key)];
    if (!value || !isFilterable(def)) continue;
    if (def.type === "checkbox") {
      if (value === "yes" || value === "no") result.push({ key: def.key, equals: value === "yes" });
    } else if (def.options.includes(value)) {
      result.push({ key: def.key, equals: value });
    }
  }
  return result;
}

/** What the database holds, narrowed to values this module understands (nothing else gets through). */
export function asValues(stored: unknown): CustomValues {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  const result: CustomValues = {};
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
}

/** A value as people read it; empty when nothing is set. */
export function displayCustomValue(def: CustomFieldDef, value: CustomValue | undefined): string {
  if (value === undefined) return "";
  if (def.type === "checkbox") return value ? "Yes" : "No";
  if (def.type === "number") return Number(value).toLocaleString("en-PH");
  return String(value);
}

/**
 * The custom values a merged record ends up with: its own first, then any value another record has
 * for a field it left empty. Values of fields no longer in use are carried over too.
 */
export function mergeCustomValues(primary: unknown, others: readonly unknown[]): CustomValues {
  const result: CustomValues = { ...asValues(primary) };
  for (const other of others) {
    for (const [key, value] of Object.entries(asValues(other))) {
      if (!(key in result)) result[key] = value;
    }
  }
  return result;
}

/** A value in a CSV: dates and text as stored, numbers plain (no thousands separators), yes/no as words. */
export function csvCustomValue(
  def: CustomFieldDef,
  value: CustomValue | undefined,
): string | number {
  if (value === undefined) return "";
  if (def.type === "checkbox") return value ? "Yes" : "No";
  return typeof value === "number" ? value : String(value);
}

/** The permission that lets someone fill in the custom fields of each kind of record. */
export const CUSTOM_EDIT_PERMISSION = {
  lead: "leads:update",
  contact: "contacts:update",
  organization: "organizations:update",
  deal: "deals:update",
} as const satisfies Record<CustomEntity, string>;
