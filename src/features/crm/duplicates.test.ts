import { describe, expect, it } from "vitest";

import {
  domainOf,
  findContactDuplicates,
  findLeadDuplicates,
  findOrganizationDuplicates,
  mergeValues,
  normalizeCompany,
  normalizePhone,
} from "./duplicates";

describe("normalising", () => {
  it("compares phone numbers by their last ten digits", () => {
    expect(normalizePhone("0917 123 4567")).toBe("9171234567");
    expect(normalizePhone("+63 917-123-4567")).toBe("9171234567");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("sees through company suffixes and punctuation", () => {
    expect(normalizeCompany("Acme, Inc.")).toBe(normalizeCompany("ACME Corporation"));
    expect(normalizeCompany("Mt. Pulag Outfitters")).toBe("mtpulagoutfitters");
  });

  it("reads the domain of a website", () => {
    expect(domainOf("https://www.Acme.com/about?x=1")).toBe("acme.com");
    expect(domainOf("acme.com")).toBe("acme.com");
    expect(domainOf("not a site")).toBeNull();
  });
});

describe("finding duplicate contacts", () => {
  const base = { organizationId: null };
  it("groups by phone and by name, and joins overlapping groups", () => {
    const groups = findContactDuplicates([
      {
        id: "1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "a@x.co",
        phone: "0917 111 2222",
        ...base,
      },
      {
        id: "2",
        firstName: "A.",
        lastName: "Lovelace",
        email: "b@x.co",
        phone: "+63 917 111 2222",
        ...base,
      },
      { id: "3", firstName: "Ada", lastName: "Lovelace", email: "c@x.co", phone: null, ...base },
      {
        id: "4",
        firstName: "Bob",
        lastName: "Ray",
        email: "d@x.co",
        phone: "0999 000 1111",
        ...base,
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id).sort()).toEqual(["1", "2", "3"]);
    expect(groups[0].reasons).toContain("the same phone number");
    expect(groups[0].reasons).toContain("the same name");
  });

  it("does not treat a shared first name alone as a match", () => {
    expect(
      findContactDuplicates([
        { id: "1", firstName: "Ada", lastName: "", email: "a@x.co", ...base },
        { id: "2", firstName: "Ada", lastName: "", email: "b@x.co", ...base },
      ]),
    ).toEqual([]);
  });
});

describe("finding duplicate organizations", () => {
  it("matches by name or website", () => {
    const groups = findOrganizationDuplicates([
      { id: "1", name: "Acme Inc.", website: null },
      { id: "2", name: "ACME", website: "https://acme.com" },
      { id: "3", name: "Other Co", website: "www.acme.com" },
      { id: "4", name: "Unrelated", website: null },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id).sort()).toEqual(["1", "2", "3"]);
  });
});

describe("mergeValues", () => {
  it("fills only the gaps, from the first record that has a value", () => {
    const primary = { phone: "", position: "CEO", website: null as string | null };
    const others = [
      { phone: "0917", position: "Founder", website: null as string | null },
      { phone: "0999", position: "x", website: "acme.com" },
    ];
    expect(mergeValues(primary, others, ["phone", "position", "website"])).toEqual({
      phone: "0917",
      website: "acme.com",
    });
  });
});

describe("finding duplicate leads", () => {
  const lead = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    firstName: "Ada",
    lastName: "Lovelace",
    email: `${id}@x.co`,
    phone: null,
    businessName: null,
    ...extra,
  });

  it("groups the same email in any letter case, and the same phone however it is written", () => {
    const groups = findLeadDuplicates([
      lead("1", { email: "Ada@X.co" }),
      lead("2", { email: " ada@x.co " }),
      lead("3", { phone: "0917 555 0000", firstName: "Bo", lastName: "Reyes" }),
      lead("4", { phone: "+63 917 555 0000", firstName: "Cy", lastName: "Tan" }),
      lead("5", { firstName: "Di", lastName: "Cruz" }),
    ]);
    const ids = groups.map((g) => g.members.map((m) => m.id).sort());
    expect(ids).toContainEqual(["1", "2"]);
    expect(ids).toContainEqual(["3", "4"]);
    expect(ids.flat()).not.toContain("5");
  });

  it("matches a name only together with the business, so two people called the same don't merge", () => {
    const same = findLeadDuplicates([
      lead("1", { businessName: "Acme, Inc." }),
      lead("2", { businessName: "ACME Corporation" }),
    ]);
    expect(same).toHaveLength(1);
    expect(same[0].reasons).toContain("the same name at the same business");

    expect(
      findLeadDuplicates([lead("1", { businessName: "Acme" }), lead("2", { businessName: "Zed" })]),
    ).toHaveLength(0);
    expect(findLeadDuplicates([lead("1"), lead("2")])).toHaveLength(0);
  });
});
