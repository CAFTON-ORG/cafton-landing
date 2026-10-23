import { describe, expect, it, vi } from "vitest";

const loaded = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/features/delivery/handlers", () => {
  loaded.count += 1;
  return {};
});

const accepted = {
  quoteId: "11111111-1111-4111-8111-111111111111",
  reference: "QT-2026-0001",
  dealId: "22222222-2222-4222-8222-222222222222",
  totalMinor: 100,
  currency: "PHP",
  acceptedByName: "Client",
};

describe("the event bus", () => {
  it("connects the reacting parts itself, once, the first time anything is announced", async () => {
    // A separate startup hook would be bundled apart from the pages and register on another bus
    // (that is exactly what went wrong once), so the bus loads the handlers where it is used.
    const { emit, on } = await import("./events");
    expect(loaded.count).toBe(0);
    await emit("quote.accepted", accepted);
    await emit("quote.accepted", accepted);
    expect(loaded.count).toBe(1);

    const seen: string[] = [];
    on("quote.accepted", (event) => void seen.push(event.reference));
    await emit("quote.accepted", accepted);
    expect(seen).toEqual(["QT-2026-0001"]);
  });

  it("never lets a failing handler undo or block what happened", async () => {
    const { emit, on } = await import("./events");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const after: string[] = [];
    on("contract.accepted", () => {
      throw new Error("boom");
    });
    on("contract.accepted", () => void after.push("second handler ran"));
    await emit("contract.accepted", {
      contractId: "33333333-3333-4333-8333-333333333333",
      reference: "CT-2026-0001",
      dealId: accepted.dealId,
      kind: "contract",
      acceptedByName: "Client",
    });
    expect(after).toEqual(["second handler ran"]);
    expect(error).toHaveBeenCalled();
  });
});
