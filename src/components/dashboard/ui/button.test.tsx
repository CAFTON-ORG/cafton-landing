// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("is a real button by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).tagName).toBe("BUTTON");
  });

  it("stays a link for assistive tech when it renders an anchor", () => {
    render(<Button render={<a href="/notes">Back to notes</a>} />);
    const link = screen.getByRole("link", { name: "Back to notes" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/notes");
  });
});
