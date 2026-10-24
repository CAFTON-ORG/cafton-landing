// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DefinitionList } from "./definition-list";

const items = [
  { label: "Client", value: "Northwind" },
  { label: "Owner", value: "" },
];

describe("DefinitionList", () => {
  it("renders labels as terms and shows an em dash for an empty value", () => {
    render(<DefinitionList items={items} />);

    expect(screen.getByText("Client").tagName).toBe("DT");
    expect(screen.getByText("Northwind").tagName).toBe("DD");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("can leave empty rows out entirely", () => {
    render(<DefinitionList items={items} hideEmpty />);

    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
  });
});
