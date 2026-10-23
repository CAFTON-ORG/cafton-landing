"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
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
import { payBill } from "../actions/payables";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type PaymentMethod } from "../invoicing";
import type { BillAccount } from "../payable-types";

const minor = (text: string) => (text.trim() ? (parseMinor(text) ?? 0) : 0);

/** Records money paid to a supplier. Tax held back from them settles the bill but never leaves as cash. */
export function BillPaymentDialog({
  billId,
  number,
  vendorName,
  balanceMinor,
  accounts,
  today,
  trigger,
}: {
  billId: string;
  number: string;
  vendorName: string;
  balanceMinor: number;
  /** Asset accounts the money can leave (cash, bank, e-wallets). */
  accounts: BillAccount[];
  today: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [wht, setWht] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const account = accounts.find((item) => item.id === accountId);
  const settles = minor(amount) + minor(wht);
  const left = balanceMinor - settles;

  function reset() {
    setDate(today);
    setAmount(minorToInput(balanceMinor));
    setWht("");
    setMethod("bank_transfer");
    setReference("");
    setAccountId((accounts.find((item) => item.systemKey === "bank") ?? accounts[0])?.id ?? "");
    setNote("");
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(
      () =>
        payBill({
          billId,
          paidDate: date,
          amount,
          wht,
          method,
          reference,
          paidFromAccountId: accountId,
          note,
        }),
      {
        success: (data) => `Recorded ${data?.number ?? "the payment"}.`,
        onSuccess: () => {
          setOpen(false);
          router.refresh();
        },
        onFieldErrors: setErrors,
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
      <DialogContent scrollable>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Pay {vendorName}</DialogTitle>
            <DialogDescription>
              {number} is still owed {formatMinor(balanceMinor)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="bpay-date" label="Paid on" required error={errors.paidDate}>
                <DatePicker id="bpay-date" value={date} onChange={setDate} />
              </Field>
              <Field id="bpay-account" label="Paid from" required error={errors.paidFromAccountId}>
                <Select value={accountId} onValueChange={(next) => setAccountId(String(next))}>
                  <SelectTrigger id="bpay-account" className="w-full">
                    <SelectValue placeholder="Cash or bank account">
                      {account ? `${account.code} ${account.name}` : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="bpay-amount" label="Amount paid (₱)" required error={errors.amount}>
                <Input
                  id="bpay-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={!!errors.amount}
                  className="tabular-nums"
                />
              </Field>
              <Field
                id="bpay-wht"
                label="Tax you held back (₱)"
                hint="Withholding tax kept from the supplier, to remit to the BIR."
                error={errors.wht}
              >
                <Input
                  id="bpay-wht"
                  inputMode="decimal"
                  value={wht}
                  onChange={(event) => setWht(event.target.value)}
                  aria-invalid={!!errors.wht}
                  className="tabular-nums"
                />
              </Field>
              <Field id="bpay-method" label="How">
                <Select value={method} onValueChange={(next) => setMethod(next as PaymentMethod)}>
                  <SelectTrigger id="bpay-method" className="w-full">
                    <SelectValue>{PAYMENT_METHOD_LABEL[method]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {PAYMENT_METHOD_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="bpay-reference" label="Reference">
                <Input
                  id="bpay-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Transfer or cheque number"
                />
              </Field>
            </div>
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                left < 0 ? "border-destructive/40 bg-destructive/10" : "bg-muted/40"
              }`}
            >
              {left < 0
                ? `That is ${formatMinor(-left)} more than is owed.`
                : left === 0
                  ? "This settles the bill."
                  : `${formatMinor(left)} will still be owed.`}
            </p>
            <Field id="bpay-note" label="Note">
              <Textarea
                id="bpay-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}
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
            <Button
              type="submit"
              disabled={pending || minor(amount) <= 0 || !accountId || left < 0}
            >
              {pending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
