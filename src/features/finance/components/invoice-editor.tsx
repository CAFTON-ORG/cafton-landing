"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Send, Trash2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
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
import { formatMinor, minorToInput, parseMinor } from "@/lib/money";
import { parseQuantity, quantityText } from "@/features/sales/pricing";
import { deleteDraftInvoice, issueInvoice, saveInvoice } from "../actions/invoices";
import type { InvoiceDetail } from "../invoice-types";
import { MAX_LINES, invoiceTotals, lineAmount } from "../invoicing";
import type { TaxRateView } from "../types";

interface Line {
  description: string;
  quantity: string;
  unitLabel: string;
  price: string;
  taxable: boolean;
}

/** The draft: everything on it can change until it is issued. */
export function InvoiceEditor({
  invoice,
  taxRates,
  canIssue,
}: {
  invoice: InvoiceDetail;
  taxRates: TaxRateView[];
  canIssue: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [clientName, setClientName] = useState(invoice.clientName);
  const [clientEmail, setClientEmail] = useState(invoice.clientEmail ?? "");
  const [clientAddress, setClientAddress] = useState(invoice.clientAddress ?? "");
  const [clientTin, setClientTin] = useState(invoice.clientTin ?? "");
  const [issueDate, setIssueDate] = useState(invoice.issueDate ?? "");
  const [dueDate, setDueDate] = useState(invoice.dueDate ?? "");
  const [taxCode, setTaxCode] = useState(invoice.taxCode);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [instructions, setInstructions] = useState(invoice.paymentInstructions ?? "");
  const [lines, setLines] = useState<Line[]>(
    invoice.lines.map((line) => ({
      description: line.description,
      quantity: quantityText(line.quantityMilli),
      unitLabel: line.unitLabel,
      price: minorToInput(line.unitPriceMinor),
      taxable: line.taxable,
    })),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rate = taxRates.find((item) => item.code === taxCode);
  const totals = useMemo(
    () =>
      invoiceTotals(
        lines.map((line) => ({
          amountMinor: lineAmount(parseQuantity(line.quantity) ?? 0, parseMinor(line.price) ?? 0),
          taxable: line.taxable,
        })),
        rate?.rateBp ?? 0,
      ),
    [lines, rate],
  );

  const set = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));

  function payload() {
    return {
      id: invoice.id,
      organizationId: invoice.organizationId ?? null,
      contactId: invoice.contactId ?? null,
      clientName,
      clientEmail,
      clientAddress,
      clientTin,
      issueDate,
      dueDate,
      taxCode,
      notes,
      paymentInstructions: instructions,
      lines,
    };
  }

  function save(then?: () => void) {
    setErrors({});
    run(() => saveInvoice(payload()), {
      success: then ? undefined : "Draft saved.",
      onSuccess: () => (then ? then() : router.refresh()),
      onFieldErrors: setErrors,
    });
  }

  function issue() {
    save(() =>
      run(() => issueInvoice(invoice.id), {
        success: (data) => `Issued ${data?.number ?? "the invoice"}.`,
        onSuccess: () => router.refresh(),
      }),
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="inv-client" label="Name" required error={errors.clientName}>
            <Input
              id="inv-client"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              aria-invalid={!!errors.clientName}
            />
          </Field>
          <Field id="inv-email" label="Email" hint="Where the invoice is sent.">
            <Input
              id="inv-email"
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
            />
          </Field>
          <Field id="inv-address" label="Address">
            <Textarea
              id="inv-address"
              rows={2}
              value={clientAddress}
              onChange={(event) => setClientAddress(event.target.value)}
            />
          </Field>
          <Field id="inv-tin" label="Client TIN" hint="Shown on the invoice if they gave you one.">
            <Input
              id="inv-tin"
              value={clientTin}
              onChange={(event) => setClientTin(event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates and tax</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field id="inv-issue" label="Issue date" required error={errors.issueDate}>
            <DatePicker id="inv-issue" value={issueDate} onChange={setIssueDate} />
          </Field>
          <Field id="inv-due" label="Due date" required error={errors.dueDate}>
            <DatePicker id="inv-due" value={dueDate} onChange={setDueDate} />
          </Field>
          <Field id="inv-tax" label="Tax rate" hint="Applies to lines marked taxable.">
            <Select value={taxCode} onValueChange={(next) => setTaxCode(String(next))}>
              <SelectTrigger id="inv-tax" className="w-full">
                <SelectValue>{rate ? rate.name : taxCode}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {taxRates
                  .filter((item) => item.active || item.code === taxCode)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.code}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="text-muted-foreground hidden grid-cols-[1fr_5rem_6rem_8rem_4.5rem_2rem] gap-2 text-xs sm:grid">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span>Unit</span>
            <span className="text-right">Price (₱)</span>
            <span className="text-center">Taxable</span>
            <span />
          </div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_5rem_6rem_8rem_4.5rem_2rem] sm:items-start"
            >
              <div className="grid gap-1">
                <Input
                  aria-label={`Line ${index + 1} description`}
                  value={line.description}
                  onChange={(event) => set(index, { description: event.target.value })}
                />
                {errors[`line${index}`] && (
                  <p className="text-destructive text-xs">{errors[`line${index}`]}</p>
                )}
              </div>
              <Input
                aria-label={`Line ${index + 1} quantity`}
                inputMode="decimal"
                value={line.quantity}
                onChange={(event) => set(index, { quantity: event.target.value })}
                className="text-right tabular-nums"
              />
              <Input
                aria-label={`Line ${index + 1} unit`}
                value={line.unitLabel}
                onChange={(event) => set(index, { unitLabel: event.target.value })}
              />
              <Input
                aria-label={`Line ${index + 1} price`}
                inputMode="decimal"
                value={line.price}
                onChange={(event) => set(index, { price: event.target.value })}
                className="text-right tabular-nums"
              />
              <div className="flex h-9 items-center sm:justify-center">
                <Checkbox
                  aria-label={`Line ${index + 1} taxable`}
                  checked={line.taxable}
                  onCheckedChange={(checked) => set(index, { taxable: checked === true })}
                />
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove line ${index + 1}`}
                onClick={() => setLines((current) => current.filter((_, at) => at !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
          {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={lines.length >= MAX_LINES}
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { description: "", quantity: "1", unitLabel: "item", price: "", taxable: false },
                ])
              }
            >
              <Plus aria-hidden="true" /> Add a line
            </Button>
          </div>
          <dl className="ml-auto grid w-full max-w-xs gap-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatMinor(totals.subtotalMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{formatMinor(totals.taxMinor)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMinor(totals.totalMinor)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="inv-notes" label="Notes to the client">
            <Textarea
              id="inv-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <Field
            id="inv-instructions"
            label="How to pay"
            hint="Bank details or a link, printed on the invoice."
          >
            <Textarea
              id="inv-instructions"
              rows={3}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" disabled={pending} onClick={() => setConfirmDelete(true)}>
          <Trash2 aria-hidden="true" /> Delete draft
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this draft?"
          description="A draft has no number and nothing posted, so it can be deleted. Issued invoices are voided instead."
          confirmLabel="Delete draft"
          destructive
          pending={pending}
          onConfirm={() =>
            run(() => deleteDraftInvoice(invoice.id), {
              success: "Draft deleted.",
              onSuccess: () => router.push("/dashboard/finance/invoices"),
            })
          }
        />
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save()}>
            Save draft
          </Button>
          {canIssue && (
            <Button disabled={pending} onClick={issue}>
              <Send aria-hidden="true" /> Issue invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
