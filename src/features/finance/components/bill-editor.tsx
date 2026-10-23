"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
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
import { addDays } from "@/features/schedule/slots";
import { approveBill, deleteDraftBill, saveBill } from "../actions/payables";
import { MAX_LINES } from "../invoicing";
import type { BillAccount, BillDetail } from "../payable-types";

interface Line {
  description: string;
  accountId: string;
  amount: string;
}

export interface EditorVendor {
  id: string;
  name: string;
  termsDays: number;
  defaultAccountId?: string;
}

/** The draft bill: everything on it can change until it is approved. */
export function BillEditor({
  bill,
  vendors,
  accounts,
  canApprove,
}: {
  bill: BillDetail;
  vendors: EditorVendor[];
  accounts: BillAccount[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [vendorId, setVendorId] = useState(bill.vendorId);
  const [vendorRef, setVendorRef] = useState(bill.vendorRef ?? "");
  const [billDate, setBillDate] = useState(bill.billDate);
  const [dueDate, setDueDate] = useState(bill.dueDate);
  const [notes, setNotes] = useState(bill.notes ?? "");
  const [lines, setLines] = useState<Line[]>(
    bill.lines.map((line) => ({
      description: line.description,
      accountId: line.accountId,
      amount: minorToInput(line.amountMinor),
    })),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const vendor = vendors.find((item) => item.id === vendorId);
  const accountLabel = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    return account ? `${account.code} ${account.name}` : "Choose an account";
  };
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (parseMinor(line.amount) ?? 0), 0),
    [lines],
  );

  const set = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));

  function payload() {
    return { id: bill.id, vendorId, vendorRef, billDate, dueDate, notes, lines };
  }

  function save(then?: () => void) {
    setErrors({});
    run(() => saveBill(payload()), {
      success: then ? undefined : "Draft saved.",
      onSuccess: () => (then ? then() : router.refresh()),
      onFieldErrors: setErrors,
    });
  }

  function approve() {
    save(() =>
      run(() => approveBill(bill.id), {
        success: (data) => `Approved ${data?.number ?? "the bill"}.`,
        onSuccess: () => router.refresh(),
      }),
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Bill details</CardTitle>
        </CardHeader>
        <CardContent className="grid items-start gap-4 sm:grid-cols-2">
          <Field id="bill-vendor" label="Supplier" required error={errors.vendorId}>
            <Select
              value={vendorId}
              onValueChange={(next) => {
                const picked = vendors.find((item) => item.id === next);
                setVendorId(String(next));
                if (picked) setDueDate(addDays(billDate, picked.termsDays));
              }}
            >
              <SelectTrigger id="bill-vendor" className="w-full">
                <SelectValue>{vendor?.name ?? bill.vendorName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {vendors.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="bill-ref"
            label="Their invoice number"
            hint="The number printed on the supplier's bill."
          >
            <Input
              id="bill-ref"
              value={vendorRef}
              onChange={(event) => setVendorRef(event.target.value)}
            />
          </Field>
          <Field id="bill-date" label="Bill date" required error={errors.billDate}>
            <DatePicker id="bill-date" value={billDate} onChange={setBillDate} />
          </Field>
          <Field id="bill-due" label="Due date" required error={errors.dueDate}>
            <DatePicker id="bill-due" value={dueDate} onChange={setDueDate} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What it was for</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="text-muted-foreground hidden grid-cols-[1fr_16rem_9rem_2rem] gap-2 text-xs sm:grid">
            <span>Description</span>
            <span>Booked to</span>
            <span className="text-right">Amount (₱)</span>
            <span />
          </div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_16rem_9rem_2rem] sm:items-start"
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
              <Select
                value={line.accountId}
                onValueChange={(next) => set(index, { accountId: String(next) })}
              >
                <SelectTrigger aria-label={`Line ${index + 1} account`} className="w-full">
                  <SelectValue placeholder="Choose an account">
                    {accountLabel(line.accountId)}
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
              <Input
                aria-label={`Line ${index + 1} amount`}
                inputMode="decimal"
                value={line.amount}
                onChange={(event) => set(index, { amount: event.target.value })}
                className="text-right tabular-nums"
              />
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
                  { description: "", accountId: vendor?.defaultAccountId ?? "", amount: "" },
                ])
              }
            >
              <Plus aria-hidden="true" /> Add a line
            </Button>
          </div>
          <dl className="ml-auto flex w-full max-w-xs justify-between border-t pt-3 text-sm font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMinor(total)}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="bill-notes"
            label="Notes"
            hint="For your own records; the supplier doesn't see these."
          >
            <Textarea
              id="bill-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
          description="A draft has no number and nothing posted, so it can be deleted. Approved bills are voided instead."
          confirmLabel="Delete draft"
          destructive
          pending={pending}
          onConfirm={() =>
            run(() => deleteDraftBill(bill.id), {
              success: "Draft deleted.",
              onSuccess: () => router.push("/dashboard/finance/bills"),
            })
          }
        />
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save()}>
            Save draft
          </Button>
          {canApprove && (
            <Button disabled={pending} onClick={approve}>
              <Check aria-hidden="true" /> Approve bill
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
