// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STATUS_TONES, StatusBadge, type StatusTone } from "./status-badge";

describe("StatusBadge", () => {
  it("always shows the status as text, so colour is never the only signal", () => {
    render(<StatusBadge tone="success">Active</StatusBadge>);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies the tone's classes", () => {
    render(<StatusBadge tone="danger">Overdue</StatusBadge>);

    expect(screen.getByText("Overdue")).toHaveClass("text-red-800");
  });

  it("defines a light and a dark text colour for every coloured tone", () => {
    const coloured = (Object.keys(STATUS_TONES) as StatusTone[]).filter(
      (tone) => tone !== "neutral",
    );

    for (const tone of coloured) {
      expect(STATUS_TONES[tone], tone).toMatch(/\btext-\w+-800\b|dark:text-/);
      expect(STATUS_TONES[tone], tone).toContain("dark:text-");
    }
  });
});
