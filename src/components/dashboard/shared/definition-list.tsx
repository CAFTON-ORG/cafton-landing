import type { ReactNode } from "react";

/**
 * Label/value pairs for a record's details. Empty values render as an em dash,
 * or are left out entirely with `hideEmpty` (use it for long, optional forms).
 */
export function DefinitionList({
  items,
  hideEmpty = false,
}: {
  items: { label: string; value: ReactNode }[];
  hideEmpty?: boolean;
}) {
  const shown = hideEmpty ? items.filter((item) => item.value) : items;
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      {shown.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
