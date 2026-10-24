import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent, formatRelative, getInitials } from "./format";

describe("format", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("describes times relative to now", () => {
    expect(formatRelative("2026-10-01T11:55:00Z", now)).toBe("5 minutes ago");
    expect(formatRelative("2026-10-01T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatRelative("2026-09-30T12:00:00Z", now)).toBe("yesterday");
    expect(formatRelative("2026-10-04T12:00:00Z", now)).toBe("in 3 days");
    expect(formatRelative("2026-10-01T11:59:50Z", now)).toBe("just now");
  });

  it("formats money and percentages", () => {
    expect(formatCurrency(12500)).toBe("$12,500");
    expect(formatPercent(45)).toBe("45%");
  });

  it("builds initials from a name, falling back to the email", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("Ada")).toBe("AD");
    expect(getInitials("  grace   brewster  hopper ")).toBe("GH");
    expect(getInitials("", "zed@example.com")).toBe("Z");
    expect(getInitials()).toBe("?");
  });
});
