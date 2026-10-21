// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { paginate } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { Column } from "./data-table";
import { ResourceTable, type TableController } from "./resource-table";

type Row = { id: string; name: string };
const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({
  id: String(i + 1),
  name: `Row ${i + 1}`,
}));
const columns: Column<Row>[] = [
  { id: "name", header: "Name", sortable: true, cell: (row) => row.name },
];

function controller(overrides: Partial<TableParams> = {}): TableController {
  return {
    params: { q: "", filters: {}, sort: "name", dir: "asc", page: 1, pageSize: 10, ...overrides },
    setSearch: vi.fn(),
    setFilter: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    clear: vi.fn(),
  };
}

const base = {
  columns,
  getRowId: (row: Row) => row.id,
  caption: "Rows",
  searchLabel: "Search rows",
  emptyIcon: Inbox,
  emptyTitle: "No rows yet",
  emptyDescription: "Rows you add show up here.",
};

describe("ResourceTable", () => {
  it("shows a page of rows with the range summary and pager", () => {
    render(<ResourceTable {...base} table={controller()} page={paginate(rows, 1, 10)} />);

    expect(screen.getByRole("table", { name: "Rows" })).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("1–10 of 23")).toBeInTheDocument();
  });

  it("sends search, sort and paging back to the table controller", async () => {
    const table = controller();
    const user = userEvent.setup();
    render(<ResourceTable {...base} table={table} page={paginate(rows, 1, 10)} />);

    await user.click(within(screen.getByRole("table")).getByRole("button", { name: /Name/ }));
    expect(table.setSort).toHaveBeenCalledWith("name", "desc");

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(table.setPage).toHaveBeenCalledWith(2);
  });

  it("explains an empty list and offers the empty-state action", () => {
    render(
      <ResourceTable
        {...base}
        table={controller()}
        page={paginate([], 1, 10)}
        emptyAction={<button type="button">Add a row</button>}
      />,
    );

    expect(screen.getByText("No rows yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a row" })).toBeInTheDocument();
    expect(screen.queryByText(/of 0/)).not.toBeInTheDocument(); // no pager for nothing
  });

  it("tells a filtered-to-nothing list apart from an empty one, and can clear the filters", async () => {
    const table = controller({ q: "zzz" });
    const user = userEvent.setup();
    render(
      <ResourceTable
        {...base}
        table={table}
        page={paginate([], 1, 10)}
        emptyAction={<button>Add a row</button>}
      />,
    );

    expect(screen.getByText("Nothing matches those filters")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a row" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Clear/ })[0]);
    expect(table.clear).toHaveBeenCalled();
  });

  it("replaces the table with an error and a retry button", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceTable
        {...base}
        table={controller()}
        error={{ title: "Could not load rows", description: "Network down", onRetry }}
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows skeleton rows while loading and marks the table busy", () => {
    render(<ResourceTable {...base} table={controller()} loading />);

    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("shows the bulk bar only while rows are selected", () => {
    const { rerender } = render(
      <ResourceTable
        {...base}
        table={controller()}
        page={paginate(rows, 1, 10)}
        selection={{ selected: new Set(), onChange: vi.fn() }}
        bulkBar={<button type="button">Delete</button>}
      />,
    );
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    rerender(
      <ResourceTable
        {...base}
        table={controller()}
        page={paginate(rows, 1, 10)}
        selection={{ selected: new Set(["1", "2"]), onChange: vi.fn() }}
        bulkBar={<button type="button">Delete</button>}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
