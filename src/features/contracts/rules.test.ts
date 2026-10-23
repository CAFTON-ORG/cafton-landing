import { describe, expect, it } from "vitest";

import { contractBlocks } from "./format";
import { fieldsIn, fillTemplate, needsQuote, unknownFields } from "./merge";
import {
  checkReopenSigned,
  checkCreate,
  checkDealDelete,
  checkDelete,
  checkRespond,
  checkSend,
  checkValidity,
  checkWithdraw,
  effectiveStatus,
} from "./rules";

describe("merge fields", () => {
  const body = "Hi {{client_name}}, {{ quote_total }} for {{client_name}}. {{nope}}";

  it("finds each field once, and the unknown ones", () => {
    expect(fieldsIn(body)).toEqual(["client_name", "quote_total", "nope"]);
    expect(unknownFields(body)).toEqual(["nope"]);
  });

  it("knows when a quote is needed", () => {
    expect(needsQuote("Dear {{client_name}}")).toBe(false);
    expect(needsQuote("Total {{quote_total}}")).toBe(true);
  });

  it("fills the fields and blanks the missing ones", () => {
    expect(fillTemplate(body, { client_name: "Cora", quote_total: "PHP 10.00" })).toBe(
      "Hi Cora, PHP 10.00 for Cora.",
    );
    expect(fillTemplate("{{client_name}} {{client_company}} (you)", { client_name: "Cora" })).toBe(
      "Cora (you)",
    );
  });
});

describe("contract blocks", () => {
  it("sets headings apart, even when they sit on top of their paragraph", () => {
    const body = ["SERVICE AGREEMENT", "", "1. Scope", "We build it.", "", "Plain text here."];
    expect(contractBlocks(body.join("\n"))).toEqual([
      { kind: "heading", text: "SERVICE AGREEMENT" },
      { kind: "heading", text: "1. Scope" },
      { kind: "paragraph", text: "We build it." },
      { kind: "paragraph", text: "Plain text here." },
    ]);
  });
});

describe("sign-by date", () => {
  it("must be set, current and within 180 days", () => {
    expect(checkValidity(null, "2026-11-01")).toMatch(/Set a sign-by/);
    expect(checkValidity("2026-10-31", "2026-11-01")).toMatch(/passed/);
    expect(checkValidity("2027-06-01", "2026-11-01")).toMatch(/at most 180/);
    expect(checkValidity("2026-11-30", "2026-11-01")).toBeNull();
  });
});

describe("making a contract", () => {
  const base = {
    dealKind: "open" as const,
    kind: "contract" as const,
    quote: { accepted: true },
    templateNeedsQuote: true,
    liveOfSameKind: 0,
  };

  it("works for an open deal with an accepted quote", () => {
    expect(checkCreate(base)).toBeNull();
  });

  it("refuses lost deals, a second live one, and unaccepted quotes", () => {
    expect(checkCreate({ ...base, dealKind: "lost" })).toMatch(/lost/);
    expect(checkCreate({ ...base, liveOfSameKind: 1 })).toMatch(/already has/);
    expect(checkCreate({ ...base, quote: { accepted: false } })).toMatch(/accepted quote/);
  });

  it("makes a statement of work follow an accepted quote", () => {
    expect(checkCreate({ ...base, kind: "sow", quote: null, templateNeedsQuote: false })).toMatch(
      /accepted quote/,
    );
  });

  it("needs a quote when the template uses quote details", () => {
    expect(checkCreate({ ...base, quote: null })).toMatch(/uses quote details/);
    expect(checkCreate({ ...base, quote: null, templateNeedsQuote: false })).toBeNull();
  });
});

describe("sending, answering and closing", () => {
  const send = {
    status: "draft" as const,
    body: "Terms",
    recipient: "a@b.com",
    validUntil: "2026-11-30",
    today: "2026-11-01",
    dealKind: "open" as const,
  };

  it("sends only a complete draft", () => {
    expect(checkSend(send)).toBeNull();
    expect(checkSend({ ...send, status: "sent" })).toMatch(/Only a draft/);
    expect(checkSend({ ...send, body: "  " })).toMatch(/no wording/);
    expect(checkSend({ ...send, recipient: null })).toMatch(/email/);
    expect(checkSend({ ...send, dealKind: "lost" })).toMatch(/lost/);
  });

  it("lets the client answer only while it is open and in date", () => {
    expect(checkRespond({ status: "sent", validUntil: "2026-11-30" }, "2026-11-01")).toBeNull();
    expect(checkRespond({ status: "sent", validUntil: "2026-10-30" }, "2026-11-01")).toMatch(
      /expired/,
    );
    expect(checkRespond({ status: "accepted" }, "2026-11-01")).toMatch(/already signed/);
    expect(checkRespond({ status: "draft" }, "2026-11-01")).toMatch(/not open/);
  });

  it("reads a late sent contract as expired", () => {
    expect(effectiveStatus({ status: "sent", validUntil: "2026-10-01" }, "2026-11-01")).toBe(
      "expired",
    );
    expect(effectiveStatus({ status: "accepted", validUntil: "2026-10-01" }, "2026-11-01")).toBe(
      "accepted",
    );
  });

  it("withdraws only a sent contract, with a reason", () => {
    expect(checkWithdraw("sent", "")).toMatch(/why/);
    expect(checkWithdraw("sent", "Scope changed")).toBeNull();
    expect(checkWithdraw("draft", "x")).toMatch(/Delete/);
    expect(checkWithdraw("accepted", "x")).toMatch(/waiting for a signature/);
  });

  it("deletes only a draft that was never sent, and protects the deal", () => {
    expect(checkDelete("draft", false)).toBeNull();
    expect(checkDelete("draft", true)).not.toBeNull();
    expect(checkDelete("accepted", true)).not.toBeNull();
    expect(checkDealDelete(["draft"])).toBeNull();
    expect(checkDealDelete(["draft", "withdrawn"])).toMatch(/can't be deleted/);
  });
});

describe("checkReopenSigned", () => {
  it("allows reopening a deal with no signed contract", () => {
    expect(checkReopenSigned([])).toBeNull();
    expect(checkReopenSigned(["draft", "sent", "declined", "withdrawn", "expired"])).toBeNull();
  });

  it("refuses once a contract is signed, and points to a new quote", () => {
    expect(checkReopenSigned(["sent", "accepted"])).toMatch(/signed contract.*new quote/);
  });
});
