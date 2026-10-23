"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
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
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor } from "@/lib/money";
import { createInvoice } from "../actions/invoices";
import { RATE_SOURCE_LABEL, billableMilli, hoursText } from "../billing";
import type { BillableTimeProject } from "../invoice-repository-types";
import type { BillableMilestone } from "../invoice-types";

type Source = "quote" | "milestones" | "time" | "blank";

export interface InvoiceableQuote {
  id: string;
  reference: string;
  title: string;
  clientName: string;
  totalMinor: number;
}

const SOURCE_LABEL: Record<Source, string> = {
  quote: "An accepted quote",
  milestones: "Finished milestones",
  time: "Approved time",
  blank: "A blank invoice",
};

/** Starts a draft from an accepted quote, finished milestones of one project, or nothing. */
export function NewInvoiceDialog({
  quotes,
  milestones,
  time = [],
  today,
  trigger,
}: {
  quotes: InvoiceableQuote[];
  milestones: BillableMilestone[];
  /** Projects with approved time nobody has invoiced yet. */
  time?: BillableTimeProject[];
  today: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>(quotes.length ? "quote" : "blank");
  const [quoteId, setQuoteId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [timeProjectId, setTimeProjectId] = useState("");
  const [upTo, setUpTo] = useState(today);
  const [error, setError] = useState("");

  const projectId = milestones.find((milestone) => milestone.id === picked[0])?.projectId;
  const quote = quotes.find((item) => item.id === quoteId);
  const timeProject = time.find((item) => item.projectId === timeProjectId);
  const missingRate = timeProject?.people.some((person) => person.rateMinor === null) ?? false;
  const ready =
    source === "quote"
      ? !!quoteId
      : source === "milestones"
        ? picked.length > 0
        : source === "time"
          ? !!timeProjectId && !missingRate
          : !!clientName.trim();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(
      () =>
        createInvoice(
          source === "quote"
            ? { source, quoteId }
            : source === "milestones"
              ? { source, milestoneIds: picked }
              : source === "time"
                ? { source, projectId: timeProjectId, upTo }
                : { source, clientName },
        ),
      {
        success: "Draft started.",
        onSuccess: (data) => {
          setOpen(false);
          const made = data as { id: string } | undefined;
          router.push(
            made ? `/dashboard/finance/invoices/${made.id}` : "/dashboard/finance/invoices",
          );
        },
        onFieldErrors: (errors) =>
          setError(errors.clientName ?? errors.form ?? Object.values(errors)[0] ?? ""),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setQuoteId("");
          setPicked([]);
          setClientName("");
          setTimeProjectId("");
          setUpTo(today);
          setError("");
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
            <DialogDescription>
              Start a draft. You can change everything on it until it is issued.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="invoice-source" label="Start from">
              <Select value={source} onValueChange={(next) => setSource(next as Source)}>
                <SelectTrigger id="invoice-source" className="w-full">
                  <SelectValue>{SOURCE_LABEL[source]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOURCE_LABEL) as Source[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SOURCE_LABEL[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {source === "quote" && (
              <Field id="invoice-quote" label="Quote" required error={error}>
                {quotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No accepted quotes are waiting to be invoiced.
                  </p>
                ) : (
                  <Select value={quoteId} onValueChange={(next) => setQuoteId(String(next))}>
                    <SelectTrigger id="invoice-quote" className="w-full">
                      <SelectValue placeholder="Choose a quote">
                        {quote ? `${quote.reference} · ${quote.clientName}` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {quotes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.reference} · {item.clientName} · {formatMinor(item.totalMinor)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}

            {source === "milestones" && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">Finished milestones</legend>
                {milestones.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nothing is ready to bill. A milestone needs to be done, billable and have an
                    amount.
                  </p>
                )}
                {milestones.map((milestone) => {
                  const other = !!projectId && milestone.projectId !== projectId;
                  return (
                    <label
                      key={milestone.id}
                      className={`flex items-start gap-2 text-sm ${other ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={picked.includes(milestone.id)}
                        disabled={other}
                        onCheckedChange={(checked) =>
                          setPicked((current) =>
                            checked
                              ? [...current, milestone.id]
                              : current.filter((id) => id !== milestone.id),
                          )
                        }
                      />
                      <span>
                        {milestone.projectName}: {milestone.name}{" "}
                        <span className="text-muted-foreground tabular-nums">
                          {formatMinor(milestone.amountMinor)}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {error && <p className="text-destructive text-sm">{error}</p>}
              </fieldset>
            )}

            {source === "time" && (
              <>
                <Field id="invoice-project" label="Project" required error={error}>
                  {time.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No approved, billable time is waiting to be invoiced. Time shows up here once
                      a timesheet is approved.
                    </p>
                  ) : (
                    <Select
                      value={timeProjectId}
                      onValueChange={(next) => setTimeProjectId(String(next))}
                    >
                      <SelectTrigger id="invoice-project" className="w-full">
                        <SelectValue placeholder="Choose a project">
                          {timeProject?.projectName}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {time.map((item) => (
                          <SelectItem key={item.projectId} value={item.projectId}>
                            {item.projectName} · {hoursText(billableMilli(item.minutes))} h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
                {timeProject && (
                  <>
                    <Field
                      id="invoice-upto"
                      label="Time worked up to"
                      hint="Time after this day waits for the next invoice."
                    >
                      <DatePicker id="invoice-upto" value={upTo} onChange={setUpTo} />
                    </Field>
                    <ul className="divide-y rounded-lg border text-sm">
                      {timeProject.people.map((person) => (
                        <li
                          key={person.profileId}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{person.name}</span>
                            <span className="text-muted-foreground block text-xs">
                              {hoursText(billableMilli(person.minutes))} h
                              {person.source
                                ? " · " + RATE_SOURCE_LABEL[person.source].toLowerCase()
                                : ""}
                            </span>
                          </span>
                          <span className="tabular-nums">
                            {person.rateMinor === null ? (
                              <span className="text-destructive">No rate set</span>
                            ) : (
                              formatMinor(person.rateMinor) + " an hour"
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {missingRate && (
                      <p role="alert" className="text-destructive text-sm">
                        Set a rate for everyone listed before invoicing this time: a standard rate,
                        or one for the person or the project, under{" "}
                        <Link
                          className="underline underline-offset-4"
                          href="/dashboard/finance/settings"
                        >
                          Finance settings
                        </Link>
                        .
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {source === "blank" && (
              <Field id="invoice-client" label="Client name" required error={error}>
                <Input
                  id="invoice-client"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  aria-invalid={!!error}
                />
              </Field>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !ready}>
              {pending ? "Starting…" : "Start draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
