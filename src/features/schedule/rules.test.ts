import { describe, expect, it } from "vitest";

import { canMove, checkStatusChange, isEditable, isOverdue, isOverlapError } from "./rules";

const past = new Date("2030-01-01T00:00:00Z");
const future = new Date("2030-02-01T00:00:00Z");
const now = new Date("2030-01-15T00:00:00Z");

describe("meeting status rules", () => {
  it("lets a request be confirmed or declined, and nothing else", () => {
    expect(canMove("requested", "confirmed")).toBe(true);
    expect(canMove("requested", "cancelled")).toBe(true);
    expect(canMove("requested", "completed")).toBe(false);
  });

  it("treats finished meetings as final", () => {
    expect(
      checkStatusChange("completed", "cancelled", { startsAt: past, now, reason: "x" }),
    ).toMatch(/finished/);
    expect(isEditable("cancelled")).toBe(false);
    expect(isEditable("confirmed")).toBe(true);
  });

  it("only marks a meeting held or missed after it started", () => {
    expect(checkStatusChange("confirmed", "completed", { startsAt: future, now })).toMatch(
      /hasn't started/,
    );
    expect(checkStatusChange("confirmed", "no_show", { startsAt: past, now })).toBeNull();
  });

  it("needs a reason to cancel", () => {
    expect(
      checkStatusChange("confirmed", "cancelled", { startsAt: future, now, reason: " " }),
    ).toMatch(/why/);
    expect(
      checkStatusChange("confirmed", "cancelled", { startsAt: future, now, reason: "Clash" }),
    ).toBeNull();
  });

  it("flags an unclosed meeting whose time has passed", () => {
    expect(isOverdue("confirmed", past, now)).toBe(true);
    expect(isOverdue("completed", past, now)).toBe(false);
    expect(isOverdue("confirmed", future, now)).toBe(false);
  });

  it("recognises the overlap constraint", () => {
    expect(
      isOverlapError(
        new Error('conflicting key value violates exclusion constraint "meetings_no_overlap"'),
      ),
    ).toBe(true);
    expect(isOverlapError(new Error("boom"))).toBe(false);
  });
});
