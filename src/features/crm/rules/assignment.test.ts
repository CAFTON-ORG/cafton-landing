import { describe, expect, it } from "vitest";

import { pickAssignee } from "./assignment";

const at = (iso: string) => new Date(iso);

describe("pickAssignee", () => {
  it("assigns nobody when no one takes new leads", () => {
    expect(pickAssignee([])).toBeNull();
  });

  it("gives the turn to someone who has never had a lead before anyone who has", () => {
    expect(
      pickAssignee([
        { id: "a", lastAssignedAt: at("2026-10-01T00:00:00Z") },
        { id: "b", lastAssignedAt: null },
      ]),
    ).toBe("b");
  });

  it("gives the turn to whoever waited longest", () => {
    expect(
      pickAssignee([
        { id: "a", lastAssignedAt: at("2026-10-03T00:00:00Z") },
        { id: "b", lastAssignedAt: at("2026-10-01T00:00:00Z") },
        { id: "c", lastAssignedAt: at("2026-10-02T00:00:00Z") },
      ]),
    ).toBe("b");
  });

  it("is stable on a tie, and rotates fairly over repeated picks", () => {
    expect(
      pickAssignee([
        { id: "z", lastAssignedAt: null },
        { id: "a", lastAssignedAt: null },
      ]),
    ).toBe("a");

    // Simulate ten enquiries: everyone gets within one of an equal share.
    const pool = [
      { id: "a", lastAssignedAt: null as Date | null },
      { id: "b", lastAssignedAt: null as Date | null },
      { id: "c", lastAssignedAt: null as Date | null },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let turn = 0; turn < 10; turn += 1) {
      const id = pickAssignee(pool)!;
      counts[id] += 1;
      pool.find((member) => member.id === id)!.lastAssignedAt = new Date(2026, 9, 1, 0, turn);
    }
    expect(
      Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)),
    ).toBeLessThanOrEqual(1);
  });
});
