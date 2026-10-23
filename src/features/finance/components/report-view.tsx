import { Card, CardContent } from "@/components/dashboard/ui/card";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ReportRow, ReportSpec } from "../reports";

function Row({ row, columns }: { row: ReportRow; columns: number }) {
  if (row.kind === "note")
    return <li className="text-muted-foreground px-4 py-2 text-xs">{row.label}</li>;
  const strong = row.kind === "subtotal" || row.kind === "total";
  return (
    <li
      className={cn(
        "flex items-baseline gap-3 px-4 py-2 text-sm",
        row.kind === "subtotal" && "bg-muted/40 font-medium",
        row.kind === "total" && "bg-muted/60 border-t font-semibold",
      )}
    >
      {row.code && (
        <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">{row.code}</span>
      )}
      <span className={cn("min-w-0 flex-1", !strong && !row.code && "")}>{row.label}</span>
      {Array.from({ length: columns }, (_, index) => {
        const value = row.amounts?.[index];
        return (
          <span key={index} className="w-28 shrink-0 text-right tabular-nums sm:w-32">
            {value === null || value === undefined ? "" : formatMinor(value)}
          </span>
        );
      })}
    </li>
  );
}

/** A report drawn from its description: the same one the CSV and the PDF are made from. */
export function ReportView({ spec }: { spec: ReportSpec }) {
  const columns = spec.columns.length;
  return (
    <Card>
      <CardContent className="p-0">
        {columns > 1 && (
          <div
            className="text-muted-foreground flex gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase"
            aria-hidden="true"
          >
            <span className="flex-1" />
            {spec.columns.map((column) => (
              <span key={column} className="w-28 shrink-0 text-right sm:w-32">
                {column}
              </span>
            ))}
          </div>
        )}
        {spec.sections.map((section, index) => (
          <section
            key={index}
            aria-label={section.heading ?? undefined}
            className="not-first:border-t"
          >
            {section.heading && (
              <h2 className="bg-muted/40 text-muted-foreground border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
                {section.heading}
              </h2>
            )}
            <ul className="divide-y">
              {section.rows.map((row, at) => (
                <Row key={at} row={row} columns={columns} />
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
