import { describe, expect, it } from "vitest";

import {
  MAX_FIELDS_PER_ENTITY,
  MAX_TEXT_VALUE,
  applyCustomValues,
  asValues,
  checkDefinition,
  checkFieldLimit,
  canBeRequired,
  checkTypeChange,
  customConditions,
  csvCustomValue,
  filterOptions,
  isFilterable,
  displayCustomValue,
  keyFromLabel,
  mergeCustomValues,
  normalizeOptions,
  parseFieldValue,
  uniqueKey,
  type CustomFieldDef,
} from "./custom-fields";

const def = (over: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  id: "1",
  entity: "lead",
  key: "region",
  label: "Region",
  type: "text",
  options: [],
  required: false,
  active: true,
  position: 0,
  ...over,
});

describe("keys", () => {
  it("turn a label into a safe, stable key", () => {
    expect(keyFromLabel("Preferred contact time")).toBe("preferred_contact_time");
    expect(keyFromLabel("  Café & Bar  ")).toBe("cafe_bar");
    expect(keyFromLabel("2026 budget")).toBe("f_2026_budget");
    expect(keyFromLabel("!!!")).toBe("field");
    expect(keyFromLabel("x".repeat(100)).length).toBeLessThanOrEqual(40);
    expect(keyFromLabel("Region")).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
  });

  it("never repeat a key already taken", () => {
    expect(uniqueKey("Region", [])).toBe("region");
    expect(uniqueKey("Region", ["region"])).toBe("region_2");
    expect(uniqueKey("Region", ["region", "region_2"])).toBe("region_3");
    expect(uniqueKey("x".repeat(60), [keyFromLabel("x".repeat(60))]).length).toBeLessThanOrEqual(
      40,
    );
  });
});

describe("definitions", () => {
  it("need a name, and a list needs at least two different choices", () => {
    expect(checkDefinition({ label: "Region", type: "text", options: [] })).toBeNull();
    expect(checkDefinition({ label: "  ", type: "text", options: [] })).toMatch(/name/);
    expect(checkDefinition({ label: "x".repeat(61), type: "text", options: [] })).toMatch(/60/);
    expect(checkDefinition({ label: "Tier", type: "select", options: ["Gold"] })).toMatch(
      /at least 2/,
    );
    expect(
      checkDefinition({ label: "Tier", type: "select", options: ["Gold", "gold", " "] }),
    ).toMatch(/at least 2/);
    expect(
      checkDefinition({ label: "Tier", type: "select", options: ["Gold", "Silver"] }),
    ).toBeNull();
  });

  it("clean up choices: trimmed, no blanks, no repeats ignoring case", () => {
    expect(normalizeOptions([" Gold ", "gold", "", "Silver"])).toEqual(["Gold", "Silver"]);
  });

  it("can't change type once made, and are limited per record", () => {
    expect(checkTypeChange("text", "text")).toBeNull();
    expect(checkTypeChange("text", "number")).toMatch(/can't be changed/);
    expect(checkFieldLimit(MAX_FIELDS_PER_ENTITY - 1)).toBeNull();
    expect(checkFieldLimit(MAX_FIELDS_PER_ENTITY)).toMatch(/limit/);
  });
});

describe("parseFieldValue", () => {
  it("treats an empty value as clearing the field", () => {
    for (const raw of ["", null, undefined, "   "]) {
      expect(parseFieldValue(def(), raw)).toEqual({ ok: true, value: null });
    }
  });

  it("trims text and caps its length", () => {
    expect(parseFieldValue(def(), "  Luzon ")).toEqual({ ok: true, value: "Luzon" });
    expect(parseFieldValue(def(), "x".repeat(MAX_TEXT_VALUE + 1))).toMatchObject({ ok: false });
  });

  it("reads numbers, with thousands separators, and refuses nonsense", () => {
    const number = def({ type: "number" });
    expect(parseFieldValue(number, "12,500.50")).toEqual({ ok: true, value: 12500.5 });
    expect(parseFieldValue(number, 3)).toEqual({ ok: true, value: 3 });
    expect(parseFieldValue(number, "abc")).toMatchObject({ ok: false });
    expect(parseFieldValue(number, "Infinity")).toMatchObject({ ok: false });
    expect(parseFieldValue(number, "1e99")).toMatchObject({ ok: false });
  });

  it("accepts only real calendar dates", () => {
    const date = def({ type: "date" });
    expect(parseFieldValue(date, "2026-02-28")).toEqual({ ok: true, value: "2026-02-28" });
    expect(parseFieldValue(date, "2026-02-30")).toMatchObject({ ok: false });
    expect(parseFieldValue(date, "28/02/2026")).toMatchObject({ ok: false });
  });

  it("accepts only one of the listed choices", () => {
    const select = def({ type: "select", options: ["Gold", "Silver"] });
    expect(parseFieldValue(select, "Gold")).toEqual({ ok: true, value: "Gold" });
    expect(parseFieldValue(select, "Bronze")).toMatchObject({ ok: false });
  });

  it("reads yes and no, and keeps no as a value rather than clearing it", () => {
    const check = def({ type: "checkbox" });
    expect(parseFieldValue(check, true)).toEqual({ ok: true, value: true });
    expect(parseFieldValue(check, "false")).toEqual({ ok: true, value: false });
    expect(parseFieldValue(check, "maybe")).toMatchObject({ ok: false });
  });
});

describe("applyCustomValues", () => {
  const defs = [
    def({ key: "region", type: "text" }),
    def({ key: "seats", type: "number", id: "2" }),
    def({ key: "tier", type: "select", options: ["Gold", "Silver"], id: "3" }),
    def({ key: "old", type: "text", active: false, id: "4" }),
  ];

  it("sets, changes and clears values, leaving the rest of the record's values alone", () => {
    const result = applyCustomValues({ region: "Luzon", seats: 4, old: "keep me" }, defs, {
      region: "",
      seats: "10",
      tier: "Gold",
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ seats: 10, tier: "Gold", old: "keep me" });
  });

  it("reports every refused value by its key, and keeps the rest", () => {
    const result = applyCustomValues({}, defs, {
      seats: "many",
      tier: "Bronze",
      region: "Visayas",
    });
    expect(result.errors).toEqual({ seats: "Enter a number.", tier: "Pick one of the choices." });
    expect(result.values).toEqual({ region: "Visayas" });
  });

  it("ignores keys that are not fields, and archived fields", () => {
    const result = applyCustomValues({}, defs, { injected: "x", old: "nope", __proto__: "y" });
    expect(result.values).toEqual({});
    expect(result.errors).toEqual({});
  });
});

describe("stored values", () => {
  it("narrow to plain values, so nothing odd gets through", () => {
    expect(asValues({ a: "x", b: 2, c: true, d: null, e: { nested: 1 }, f: [1] })).toEqual({
      a: "x",
      b: 2,
      c: true,
    });
    expect(asValues(null)).toEqual({});
    expect(asValues([1, 2])).toEqual({});
    expect(asValues("text")).toEqual({});
  });

  it("read as people expect", () => {
    expect(displayCustomValue(def({ type: "checkbox" }), true)).toBe("Yes");
    expect(displayCustomValue(def({ type: "checkbox" }), false)).toBe("No");
    expect(displayCustomValue(def({ type: "number" }), 1234567)).toBe("1,234,567");
    expect(displayCustomValue(def(), "Luzon")).toBe("Luzon");
    expect(displayCustomValue(def(), undefined)).toBe("");
  });
});

describe("mergeCustomValues", () => {
  it("keeps the kept record's values and fills only the gaps from the others, in order", () => {
    expect(
      mergeCustomValues({ region: "Luzon", seats: 4 }, [
        { region: "Visayas", tier: "Gold" },
        { tier: "Silver", note: "x" },
      ]),
    ).toEqual({ region: "Luzon", seats: 4, tier: "Gold", note: "x" });
    expect(mergeCustomValues(null, [{ a: 1 }])).toEqual({ a: 1 });
    expect(mergeCustomValues({ a: 1 }, [])).toEqual({ a: 1 });
  });
});

describe("required fields", () => {
  const required = def({ required: true });

  it("refuses to save a record while a required field is empty", () => {
    const { errors } = applyCustomValues({}, [required], { region: "" });
    expect(errors.region).toBe("This field is required.");
  });

  it("is satisfied by a value that was already stored", () => {
    expect(applyCustomValues({ region: "North" }, [required], {}).errors).toEqual({});
  });

  it("does not ask for archived fields, and a yes/no field can't be required", () => {
    expect(applyCustomValues({}, [def({ required: true, active: false })], {}).errors).toEqual({});
    expect(canBeRequired("checkbox")).toBe(false);
    expect(canBeRequired("text")).toBe(true);
    const box = def({ type: "checkbox", required: true });
    expect(applyCustomValues({}, [box], {}).errors).toEqual({});
  });
});

describe("list filters and columns", () => {
  const tier = def({ key: "tier", label: "Tier", type: "select", options: ["Gold", "Silver"] });
  const vip = def({ key: "vip", label: "VIP", type: "checkbox" });
  const note = def({ key: "note", label: "Note" });

  it("only choice and yes/no fields can be filtered", () => {
    expect([tier, vip, note].map(isFilterable)).toEqual([true, true, false]);
    expect(isFilterable({ ...tier, active: false })).toBe(false);
  });

  it("turns allowed URL filters into conditions and ignores the rest", () => {
    const filters = { cf_tier: "Gold", cf_vip: "no", cf_note: "x", cf_missing: "y" };
    expect(customConditions(filters, [tier, vip, note])).toEqual([
      { key: "tier", equals: "Gold" },
      { key: "vip", equals: false },
    ]);
    expect(customConditions({ cf_tier: "Bronze", cf_vip: "maybe" }, [tier, vip])).toEqual([]);
  });

  it("offers Yes and No for a yes/no field and the list for a choice field", () => {
    expect(filterOptions(vip).map((option) => option.value)).toEqual(["yes", "no"]);
    expect(filterOptions(tier).map((option) => option.value)).toEqual(["Gold", "Silver"]);
  });

  it("writes CSV values plainly", () => {
    expect(csvCustomValue(vip, true)).toBe("Yes");
    expect(csvCustomValue(def({ type: "number" }), 12500)).toBe(12500);
    expect(csvCustomValue(note, undefined)).toBe("");
  });
});
