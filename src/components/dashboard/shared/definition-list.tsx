import type { ReactNode } from "react";

/** Label/value pairs for a record's details. Empty values render as an em dash. */
export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
