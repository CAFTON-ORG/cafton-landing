import { formatMinor } from "@/lib/money";
import type { MonthBar } from "../overview-repository";

/**
 * Income against expenses for the last few months, as paired bars. Drawn with plain elements (no
 * chart library), and every figure is also in a table for screen readers, since a bar's height
 * alone says nothing to someone who cannot see it.
 */
export function IncomeExpenseChart({ bars }: { bars: MonthBar[] }) {
  const top = Math.max(1, ...bars.flatMap((bar) => [bar.incomeMinor, bar.expenseMinor]));
  const height = (value: number) =>
    `${Math.max(value > 0 ? 3 : 0, Math.round((Math.max(0, value) / top) * 100))}%`;

  return (
    <figure>
      <div className="flex h-44 items-end gap-3 border-b px-1" aria-hidden="true">
        {bars.map((bar) => (
          <div key={bar.month} className="flex h-full flex-1 items-end justify-center gap-1">
            <div
              className="w-full max-w-6 rounded-t bg-emerald-500/80 dark:bg-emerald-400/80"
              style={{ height: height(bar.incomeMinor) }}
              title={`Income ${formatMinor(bar.incomeMinor)}`}
            />
            <div
              className="w-full max-w-6 rounded-t bg-slate-400/80 dark:bg-slate-500/80"
              style={{ height: height(bar.expenseMinor) }}
              title={`Expenses ${formatMinor(bar.expenseMinor)}`}
            />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-1 flex gap-3 px-1 text-xs" aria-hidden="true">
        {bars.map((bar) => (
          <span key={bar.month} className="flex-1 text-center">
            {bar.label}
          </span>
        ))}
      </div>
      <figcaption className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500/80 dark:bg-emerald-400/80" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-slate-400/80 dark:bg-slate-500/80" /> Expenses
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Income and expenses by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.month}>
              <th scope="row">{bar.month}</th>
              <td>{formatMinor(bar.incomeMinor)}</td>
              <td>{formatMinor(bar.expenseMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
