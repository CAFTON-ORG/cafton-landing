import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/csv";
import { mapContacts, mapOrganizations, splitName } from "./import";

describe("splitName", () => {
  it("handles both orders", () => {
    expect(splitName("Ada Lovelace")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(splitName("Lovelace, Ada")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(splitName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
    expect(splitName("Maria  de la Cruz")).toEqual({ firstName: "Maria", lastName: "de la Cruz" });
  });
});

describe("mapContacts", () => {
  it("understands common column titles in any order", () => {
    const table = parseCsv(
      'Company,E-mail,Full Name,Mobile,Tags\nAcme,ADA@Example.com,Ada Lovelace,0917,"vip, baguio"\n',
    );
    const { rows, problems } = mapContacts(table);
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "0917",
      organization: "Acme",
      tags: ["vip", "baguio"],
    });
  });

  it("reports rows that cannot be imported, by line", () => {
    const { rows, problems } = mapContacts(
      parseCsv("name,email\nAda,ada@example.com\nBob,not-an-email\n,x@y.co\nCy,\n"),
    );
    expect(rows).toHaveLength(1);
    expect(problems.map((p) => p.line)).toEqual([3, 4, 5]);
    expect(problems[0].message).toMatch(/not a valid email/);
  });

  it("explains a file with no email or name column", () => {
    expect(mapContacts(parseCsv("name,phone\nAda,1\n")).problems[0].message).toMatch(/Email/);
    expect(mapContacts(parseCsv("email,phone\na@b.co,1\n")).problems[0].message).toMatch(/Name/);
  });
});

describe("mapOrganizations", () => {
  it("needs a name and keeps the details", () => {
    const { rows, problems } = mapOrganizations(
      parseCsv("Organization,Industry,Website\nAcme,Retail,acme.com\n,Retail,x.com\n"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Acme", industry: "Retail", website: "acme.com" });
    expect(problems).toEqual([{ line: 3, message: "No name." }]);
  });
});
