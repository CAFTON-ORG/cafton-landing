"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, FileCheck2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor, minorToInput, parseMinor } from "@/lib/money";
import { recordFiling, voidFiling } from "../actions/tax";
import type { BillAccount } from "../types/payables";
import { FILING_STATUS_LABEL, type FilingStatus } from "../rules/tax";
import type { ObligationView } from "../repository/tax";
import { ReasonDialog } from "./reason-dialog";

const TONE: Record<FilingStatus, StatusTone> = {
  in_progress: "neutral",
  due: "info",
  due_soon: "warning",
  overdue: "danger",
  filed: "success",
};

const minor = (text: string) => (text.trim() ? (parseMinor(text) ?? 0) : 0);

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 ${strong ? "font-medium" : "text-muted-foreground"}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatMinor(value)}</dd>
    </div>
  );
}

/** The returns of a tax year: what each comes to so far, and a record of those already filed. */
export function TaxTrackerView({
  year,
  today,
  items,
  accounts,
}: {
  year: number;
  today: string;
  items: ObligationView[];
  accounts: BillAccount[];
}) {
  const router = useRouter();
  const canFile = useCan("finance:post");
  const [filing, setFiling] = useState<ObligationView | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {items.map((item) => {
              const { obligation, estimate } = item;
              return (
                <li key={obligation.kind} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_20rem]">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {obligation.form} · {obligation.label}
                      <StatusBadge tone={TONE[item.status]}>
                        {FILING_STATUS_LABEL[item.status]}
                      </StatusBadge>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Due {formatDate(obligation.dueDate)}
                      {item.status === "due_soon" &&
                        ` (${item.daysToDue} ${item.daysToDue === 1 ? "day" : "days"} left)`}
                      {item.status === "overdue" &&
                        ` (${-item.daysToDue} ${-item.daysToDue === 1 ? "day" : "days"} late)`}
                      {" · "}covers 1 January to {formatDate(obligation.periodEnd)}
                    </p>
                    {item.filing && (
                      <p className="mt-2 text-sm">
                        Filed {formatDate(item.filing.filedOn)}
                        {item.filing.reference
                          ? `, reference ${item.filing.reference}`
                          : ""} by {item.filing.filedByName}.
                        {item.filing.journalEntryId && (
                          <>
                            {" "}
                            <Link
                              className="underline underline-offset-4"
                              href={`/dashboard/finance/journal/${item.filing.journalEntryId}`}
                            >
                              See the entry
                            </Link>
                            .
                          </>
                        )}
                      </p>
                    )}
                    {item.filing?.notes && (
                      <p className="text-muted-foreground mt-1 text-xs">{item.filing.notes}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canFile && !item.filing && item.status !== "in_progress" && (
                        <Button size="sm" onClick={() => setFiling(item)}>
                          <FileCheck2 aria-hidden="true" /> Record filing
                        </Button>
                      )}
                      {canFile && item.filing && (
                        <ReasonDialog
                          title={`Void the ${obligation.form} for ${obligation.label.toLowerCase()}?`}
                          description="Its posting is reversed in the books and the return can be recorded again. A return that builds on it must be voided first."
                          confirmLabel="Void filing"
                          success="Filing voided."
                          onConfirm={(reason) => voidFiling({ id: item.filing!.id, reason })}
                          onDone={() => router.refresh()}
                          trigger={(open) => (
                            <Button size="sm" variant="outline" onClick={open}>
                              <Ban aria-hidden="true" /> Void
                            </Button>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <dl className="grid content-start gap-1 text-sm">
                    {item.filing ? (
                      <>
                        <Line label="Gross receipts then" value={item.filing.grossReceiptsMinor} />
                        <Line label="Estimated then" value={item.filing.estimateMinor} />
                        <Line label="Paid in cash" value={item.filing.cashPaidMinor} />
                        <Line label="Settled by withheld tax" value={item.filing.cwtAppliedMinor} />
                        <Line
                          label="Total settled"
                          value={item.filing.cashPaidMinor + item.filing.cwtAppliedMinor}
                          strong
                        />
                      </>
                    ) : (
                      estimate && (
                        <>
                          <Line
                            label={
                              item.status === "in_progress"
                                ? `Gross receipts so far`
                                : "Gross receipts"
                            }
                            value={item.grossMinor}
                          />
                          <Line label="Above the allowance" value={estimate.taxableMinor} />
                          <Line
                            label="Tax for the year so far (8%)"
                            value={estimate.taxToDateMinor}
                          />
                          <Line
                            label="Settled by earlier returns"
                            value={-estimate.settledBeforeMinor}
                          />
                          <Line label="Withheld tax to use" value={-estimate.cwtToApplyMinor} />
                          <Line
                            label="To pay in cash (estimate)"
                            value={estimate.cashDueMinor}
                            strong
                          />
                          {estimate.overpaidMinor > 0 && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              Earlier returns paid {formatMinor(estimate.overpaidMinor)} more than
                              the year so far comes to. Ask your accountant whether to carry it
                              over.
                            </p>
                          )}
                        </>
                      )
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <FilingDialog
        item={filing}
        year={year}
        today={today}
        accounts={accounts}
        onClose={() => setFiling(null)}
      />
    </>
  );
}

function FilingDialog({
  item,
  year,
  today,
  accounts,
  onClose,
}: {
  item: ObligationView | null;
  year: number;
  today: string;
  accounts: BillAccount[];
  onClose: () => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent scrollable className="sm:max-w-xl">
        {item && (
          <FilingBody
            key={item.obligation.kind}
            item={item}
            year={year}
            today={today}
            accounts={accounts}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FilingBody({
  item,
  year,
  today,
  accounts,
  onClose,
}: {
  item: ObligationView;
  year: number;
  today: string;
  accounts: BillAccount[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const estimate = item.estimate;
  const [filedOn, setFiledOn] = useState(today);
  const [reference, setReference] = useState("");
  const [cash, setCash] = useState(estimate ? minorToInput(estimate.cashDueMinor) : "");
  const [cwt, setCwt] = useState(estimate ? minorToInput(estimate.cwtToApplyMinor) : "");
  const [paidFromId, setPaidFromId] = useState(
    (accounts.find((a) => a.systemKey === "bank") ?? accounts[0])?.id ?? "",
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const paidFrom = accounts.find((a) => a.id === paidFromId);
  const settles = minor(cash) + minor(cwt);

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        run(
          () =>
            recordFiling({
              year,
              kind: item.obligation.kind,
              filedOn,
              reference,
              cash,
              cwt,
              paidFromAccountId: paidFromId,
              notes,
            }),
          {
            success: "Filing recorded.",
            onSuccess: () => {
              onClose();
              router.refresh();
            },
            onFieldErrors: setErrors,
          },
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>
          Record the {item.obligation.form} for {item.obligation.label.toLowerCase()}
        </DialogTitle>
        <DialogDescription>
          Record what you filed and paid. The amounts start at the estimate; change them to what the
          return actually said. The tax is booked as income tax expense.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field id="tax-filed-on" label="Filed on" required error={errors.filedOn}>
            <DatePicker id="tax-filed-on" value={filedOn} onChange={setFiledOn} />
          </Field>
          <Field
            id="tax-ref"
            label="Reference number"
            hint="From the BIR's confirmation."
            error={errors.reference}
          >
            <Input
              id="tax-ref"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
          <Field id="tax-cash" label="Paid in cash (₱)" error={errors.cash}>
            <Input
              id="tax-cash"
              inputMode="decimal"
              value={cash}
              onChange={(event) => setCash(event.target.value)}
              aria-invalid={!!errors.cash}
              className="tabular-nums"
            />
          </Field>
          <Field
            id="tax-cwt"
            label="Settled with withheld tax (₱)"
            hint={`${formatMinor(item.cwtAvailableMinor)} is available to claim.`}
            error={errors.cwt}
          >
            <Input
              id="tax-cwt"
              inputMode="decimal"
              value={cwt}
              onChange={(event) => setCwt(event.target.value)}
              aria-invalid={!!errors.cwt}
              className="tabular-nums"
            />
          </Field>
        </div>
        <Field
          id="tax-paid-from"
          label="Paid from"
          error={errors.paidFromAccountId}
          hint="Needed when something was paid in cash."
        >
          <Select value={paidFromId} onValueChange={(next) => setPaidFromId(String(next))}>
            <SelectTrigger id="tax-paid-from" className="w-full">
              <SelectValue placeholder="Cash or bank account">
                {paidFrom ? `${paidFrom.code} ${paidFrom.name}` : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <p role="status" className="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
          {settles === 0
            ? "Nothing to pay: this is recorded as a nil return, with nothing posted to the books."
            : `${formatMinor(settles)} is booked as income tax expense${estimate ? ` (the estimate was ${formatMinor(estimate.remainingMinor)})` : ""}.`}
        </p>
        <Field id="tax-notes" label="Notes">
          <Textarea
            id="tax-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record filing"}
        </Button>
      </DialogFooter>
    </form>
  );
}
