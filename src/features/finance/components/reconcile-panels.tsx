"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck, Sparkles } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { autoMatchLines, signOffPeriod } from "../actions/bank";
import type { ReconciliationView } from "../types/bank";

/** Matches every line that has exactly one possible posting. */
export function AutoMatchButton({
  bankAccountId,
  disabled,
}: {
  bankAccountId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  return (
    <Button
      variant="outline"
      disabled={pending || disabled}
      onClick={() =>
        run(() => autoMatchLines(bankAccountId), {
          success: (data) =>
            data?.matched
              ? `Matched ${data.matched} ${data.matched === 1 ? "line" : "lines"}.`
              : "Nothing was certain enough to match by itself.",
          onSuccess: () => router.refresh(),
        })
      }
    >
      <Sparkles aria-hidden="true" /> {pending ? "Matching…" : "Match what is certain"}
    </Button>
  );
}

/** Signs off a statement period once every line in it is dealt with and its figures add up. */
export function SignOffCard({
  bankAccountId,
  history,
  today,
  defaultStart,
}: {
  bankAccountId: string;
  history: ReconciliationView[];
  today: string;
  defaultStart: string;
}) {
  const router = useRouter();
  const canReconcile = useCan("bank:reconcile");
  const { run, pending } = useServerAction();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(today);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(
      () =>
        signOffPeriod({
          bankAccountId,
          periodStart: start,
          periodEnd: end,
          opening,
          closing,
        }),
      {
        success: "Signed off. Nothing in that period can change now.",
        onSuccess: () => {
          setOpening("");
          setClosing("");
          router.refresh();
        },
        onFieldErrors: (errors) => setError(errors.form ?? Object.values(errors)[0] ?? ""),
      },
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sign off a statement</CardTitle>
          <CardDescription>
            Enter the opening and closing balances printed on the statement. They must agree with
            its lines, and every line must be matched, booked or set aside.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-2">
            <Field id="so-start" label="First day">
              <DatePicker id="so-start" value={start} onChange={setStart} />
            </Field>
            <Field id="so-end" label="Last day">
              <DatePicker id="so-end" value={end} onChange={setEnd} />
            </Field>
            <Field id="so-opening" label="Opening balance (₱)">
              <Input
                id="so-opening"
                inputMode="decimal"
                value={opening}
                onChange={(event) => setOpening(event.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field id="so-closing" label="Closing balance (₱)">
              <Input
                id="so-closing"
                inputMode="decimal"
                value={closing}
                onChange={(event) => setClosing(event.target.value)}
                className="tabular-nums"
              />
            </Field>
            {error && (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                {error}
              </p>
            )}
            {canReconcile && (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending || !opening.trim() || !closing.trim()}>
                  <CheckCheck aria-hidden="true" /> {pending ? "Checking…" : "Sign off"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signed off</CardTitle>
          <CardDescription>Periods that were checked. They can&apos;t be changed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <EmptyState compact title="Nothing signed off yet" />
          ) : (
            <ul className="divide-y">
              {history.map((item) => (
                <li key={item.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">
                    {formatDate(item.periodStart)} to {formatDate(item.periodEnd)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatMinor(item.openingMinor)} to {formatMinor(item.closingMinor)} ·{" "}
                    {item.lineCount} {item.lineCount === 1 ? "line" : "lines"} · by{" "}
                    {item.signedByName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
