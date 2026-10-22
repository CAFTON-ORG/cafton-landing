/**
 * How a page of site content is edited, described as plain data so the same description
 * can be read on the server and drawn by one generic form (`components/doc-form.tsx`).
 * Values are plain JSON; a field's `name` is its key inside the object it sits in.
 */

export type FieldSpec =
  | {
      kind: "text";
      name: string;
      label: string;
      hint?: string;
      placeholder?: string;
      /** Shown but not editable (a fixed key such as a web address). */
      readonly?: boolean;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      hint?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | { kind: "checkbox"; name: string; label: string; hint?: string }
  | { kind: "textarea"; name: string; label: string; hint?: string; rows?: number }
  /** A list of strings, one per row. */
  | { kind: "lines"; name: string; label: string; hint?: string; rows?: number }
  | { kind: "image"; name: string; label: string; hint?: string; aspect?: string }
  | {
      kind: "select";
      name: string;
      label: string;
      hint?: string;
      options: { value: string; label: string }[];
    }
  /** A list of objects the editor can add to, remove and reorder. */
  | {
      kind: "list";
      name: string;
      label: string;
      hint?: string;
      itemName: string;
      max?: number;
      /** The items can be reordered and edited but not added or removed. */
      fixed?: boolean;
      /** Names for the items instead of "Item 1", e.g. the days of the week. */
      itemLabels?: string[];
      /** The field shown as the item's one-line summary when it is folded. Turns folding on. */
      summary?: string;
      fields: FieldSpec[];
      /** Starting values for a new item. */
      blank?: Record<string, unknown>;
    }
  /** An object shown under its own heading, inside the same card. */
  | { kind: "group"; name: string; label: string; hint?: string; fields: FieldSpec[] };

export interface SectionSpec {
  /** Tab label; also the card title. */
  title: string;
  description?: string;
  fields: FieldSpec[];
}

export interface DocSpec {
  key: string;
  title: string;
  description: string;
  /** Where the page lives on the website, for the "view" link. */
  path?: string;
  sections: SectionSpec[];
}

/* --------------------------------------------------------------- value paths */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function blankFor(fields: FieldSpec[]): Record<string, unknown> {
  const value: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "list" || field.kind === "lines") value[field.name] = [];
    else if (field.kind === "group") value[field.name] = blankFor(field.fields);
    else if (field.kind === "select") value[field.name] = field.options[0]?.value ?? "";
    else if (field.kind === "number") value[field.name] = field.min ?? 0;
    else if (field.kind === "checkbox") value[field.name] = false;
    else value[field.name] = "";
  }
  return value;
}
