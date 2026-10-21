// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { paginate } from "@/lib/pagination";
import { DataTable, type Column } from "./data-table";
import { DataTablePagination } from "./data-table-pagination";

type Row = { id: string; name: string; amount: number };
const rows: Row[] = [
  { id: "1", name: "Alpha", amount: 10 },
  { id: "2", name: "Beta", amount: 20 },
];
const columns: Column<Row>[] = [
  { id: "name", header: "Name", sortable: true, cell: (r) => r.name },
  { id: "amount", header: "Amount", sortable: true, hideBelow: "md", cell: (r) => r.amount },
];

describe("DataTable", () => {
  it("renders a named table with a row per item", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} caption="People" />);

    expect(screen.getByRole("table", { name: "People" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
  });

  it("marks the sorted column and toggles direction on click", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        caption="People"
        sort="name"
        direction="asc"
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");

    await user.click(screen.getByRole("button", { name: /Amount/ }));
    expect(onSortChange).toHaveBeenCalledWith("amount", "asc");
  });

  it("shows skeleton rows instead of data while loading", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        caption="People"
        loading
        skeletonRows={3}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3 skeletons
    expect(screen.getByRole("table")).not.toHaveTextContent("Alpha");
  });

  it("shows the empty state when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        caption="People"
        empty={<p>Nobody here</p>}
      />,
    );

    expect(screen.getByText("Nobody here")).toBeInTheDocument();
  });

  it("selects rows and selects all on the page", async () => {
    const onSelectedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        caption="People"
        selected={new Set(["1"])}
        onSelectedChange={onSelectedChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(onSelectedChange).toHaveBeenLastCalledWith(new Set(["1", "2"]));

    const row = screen.getByRole("row", { name: /Beta/ });
    await user.click(within(row).getByRole("checkbox"));
    expect(onSelectedChange).toHaveBeenLastCalledWith(new Set(["1", "2"]));
  });
});

describe("DataTablePagination", () => {
  const page = paginate(
    Array.from({ length: 95 }, (_, i) => i),
    5,
    10,
  );

  it("reports the range and the current page", () => {
    render(<DataTablePagination page={page} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getByText("41–50 of 95")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
  });

  it("navigates with previous, next and numbered buttons", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTablePagination page={page} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole("button", { name: "Page 10" }));
    expect(onPageChange).toHaveBeenLastCalledWith(10);
  });

  it("disables previous on the first page and next on the last", () => {
    const first = paginate(Array(30).fill(0), 1, 10);
    const { rerender } = render(
      <DataTablePagination page={first} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    rerender(
      <DataTablePagination
        page={paginate(Array(30).fill(0), 3, 10)}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
