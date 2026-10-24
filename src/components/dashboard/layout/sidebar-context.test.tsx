// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarProvider, useSidebar } from "./sidebar-context";

function State() {
  const { collapsed } = useSidebar();
  return <p>{collapsed ? "collapsed" : "open"}</p>;
}

describe("SidebarProvider", () => {
  it("toggles with Ctrl+B and ignores key events that carry no key", () => {
    window.localStorage.clear();
    render(
      <SidebarProvider>
        <State />
      </SidebarProvider>,
    );
    expect(screen.getByText("open")).toBeInTheDocument();

    // Browsers send these when autofill fills a field: a keydown event with no `key` at all.
    // An error inside a listener does not throw from dispatchEvent: it goes to the window.
    const failures: string[] = [];
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      failures.push(event.message);
    };
    window.addEventListener("error", onError);
    act(() => void document.dispatchEvent(new Event("keydown")));
    window.removeEventListener("error", onError);
    expect(failures).toEqual([]);
    expect(screen.getByText("open")).toBeInTheDocument();

    act(
      () => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true })),
    );
    expect(screen.getByText("collapsed")).toBeInTheDocument();
  });
});
