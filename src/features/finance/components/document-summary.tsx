import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "./money";

/**
 * The top of an invoice, bill or expense: what is still owed (the figure people look for first),
 * how pressing it is, and the facts beside it. Every document page opens with the same band.
 */
export function DocumentSummary({
  label,
  amountMinor,
  hint,
  facts,
}: {
  /** "Balance due", "Amount", "Still to pay". */
  label: string;
  amountMinor: number;
  /** Under the amount: how late, or that it is paid. */
  hint?: ReactNode;
  facts: { label: string; value: ReactNode }[];
}) {
  return (
    <Card className="mb-4">
      <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-center">
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">
            <Money minor={amountMinor} />
          </p>
          {hint && <div className="mt-1 text-sm">{hint}</div>}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-muted-foreground text-xs">{fact.label}</dt>
              <dd className="mt-0.5 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export interface ActivityItem {
  /** An ISO date or moment, for ordering. */
  at: string;
  text: string;
  detail?: string;
  tone?: "neutral" | "success" | "danger";
}

const DOT = {
  neutral: "bg-slate-400",
  success: "bg-emerald-500",
  danger: "bg-red-500",
} as const;

/** What has happened to a document, oldest first: created, issued, sent, paid, credited, voided. */
export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  // By day, and in the order given within a day (a draft started and issued the same day reads in that order).
  const sorted = [...items].sort((a, b) => a.at.slice(0, 10).localeCompare(b.at.slice(0, 10)));
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Everything that has happened to this, in order.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-4">
          {sorted.map((item, index) => (
            <li key={index} className="relative flex gap-3 text-sm">
              <span
                aria-hidden="true"
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[item.tone ?? "neutral"])}
              />
              <div className="min-w-0">
                <p>{item.text}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(item.at)}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
