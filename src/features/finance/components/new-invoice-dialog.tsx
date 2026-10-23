"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

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
import type { BillableMilestone } from "../invoice-types";

type Source = "quote" | "milestones" | "blank";

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
  blank: "A blank invoice",
};

/** Starts a draft from an accepted quote, finished milestones of one project, or nothing. */
export function NewInvoiceDialog({
  quotes,
  milestones,
  trigger,
}: {
  quotes: InvoiceableQuote[];
  milestones: BillableMilestone[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>(quotes.length ? "quote" : "blank");
  const [quoteId, setQuoteId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");

  const projectId = milestones.find((milestone) => milestone.id === picked[0])?.projectId;
  const quote = quotes.find((item) => item.id === quoteId);
  const ready =
    source === "quote"
      ? !!quoteId
      : source === "milestones"
        ? picked.length > 0
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
