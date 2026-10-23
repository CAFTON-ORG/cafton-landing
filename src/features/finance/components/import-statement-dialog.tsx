"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { importStatement } from "../actions/bank";
import { DATE_FORMAT_LABEL, type DateFormat } from "../bank";
import type { ImportReport } from "../bank-types";

const MAX_BYTES = 2_000_000;

/** Brings in a bank statement (CSV): a preview first, and nothing is written until you confirm it. */
export function ImportStatementDialog({
  bankAccountId,
  trigger,
}: {
  bankAccountId: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [format, setFormat] = useState<DateFormat>("ymd");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState("");

  function reset() {
    setFileName("");
    setCsv("");
    setFormat("ymd");
    setReport(null);
    setError("");
    if (input.current) input.current.value = "";
  }

  function preview(text: string, name: string, dateFormat: DateFormat) {
    setError("");
    run(
      () => importStatement({ bankAccountId, fileName: name, csv: text, dateFormat, dryRun: true }),
      {
        onSuccess: (data) => setReport(data ?? null),
        onFieldErrors: (errors) => setError(Object.values(errors)[0] ?? ""),
      },
    );
  }

  async function choose(file: File | undefined) {
    setReport(null);
    setError("");
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 2 MB. Export a shorter period.");
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    preview(text, file.name, format);
  }

  function confirm() {
    run(
      () => importStatement({ bankAccountId, fileName, csv, dateFormat: format, dryRun: false }),
      {
        success: (data) => `Imported ${data?.created ?? 0} lines.`,
        onSuccess: () => {
          setOpen(false);
          router.refresh();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import a statement</DialogTitle>
          <DialogDescription>
            Download your statement from the bank as a CSV and choose it here. Lines already
            imported are recognised and skipped, so overlapping statements are fine.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <Field
            id="stmt-file"
            label="Statement file"
            hint="It needs a date, a description and an amount (or separate debit and credit columns)."
            error={error}
          >
            <input
              ref={input}
              id="stmt-file"
              type="file"
              accept=".csv,text/csv"
              disabled={pending}
              className="file:bg-muted file:text-foreground text-muted-foreground w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </Field>
          <Field
            id="stmt-format"
            label="Dates in the file"
            hint="Banks write 03/04/2026 in different orders. Check the preview shows the right dates."
          >
            <Select
              value={format}
              onValueChange={(next) => {
                setFormat(next as DateFormat);
                if (csv) preview(csv, fileName, next as DateFormat);
              }}
            >
              <SelectTrigger id="stmt-format" className="w-full">
                <SelectValue>{(value: DateFormat) => DATE_FORMAT_LABEL[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DATE_FORMAT_LABEL) as DateFormat[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {DATE_FORMAT_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {report && (
            <div role="status" className="grid gap-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {report.created} new {report.created === 1 ? "line" : "lines"} to import
                {report.firstDate && report.lastDate
                  ? `, from ${formatDate(report.firstDate)} to ${formatDate(report.lastDate)}`
                  : ""}
                .
              </p>
              <p className="text-muted-foreground text-xs">Read: {report.understood.join(" · ")}</p>
              {report.sample.length > 0 && (
                <ul className="text-muted-foreground grid gap-0.5 text-xs">
                  {report.sample.map((row, index) => (
                    <li key={index} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {formatDate(row.date)} · {row.description}
                      </span>
                      <span className="tabular-nums">
                        {row.amountMinor > 0 ? "+" : "−"}
                        {formatMinor(Math.abs(row.amountMinor))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {report.existing > 0 && (
                <p className="text-muted-foreground">
                  {report.existing} already imported, skipped.
                </p>
              )}
              {report.locked > 0 && (
                <p className="text-muted-foreground">
                  {report.locked} fall in a period already signed off, skipped.
                </p>
              )}
              {report.problems.length > 0 && (
                <div>
                  <p className="text-destructive">
                    {report.problems.length} {report.problems.length === 1 ? "row" : "rows"} could
                    not be read:
                  </p>
                  <ul className="text-muted-foreground mt-1 list-disc pl-5 text-xs">
                    {report.problems.slice(0, 6).map((problem) => (
                      <li key={problem.line}>
                        Line {problem.line}: {problem.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !report || report.created === 0}
            onClick={confirm}
          >
            {pending ? "Working…" : report ? `Import ${report.created}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
