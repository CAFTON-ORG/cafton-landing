"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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
import { recordPayment } from "../actions/invoices";
import type { OpenInvoice } from "../invoice-types";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type PaymentMethod } from "../invoicing";

const minor = (text: string) => (text.trim() ? (parseMinor(text) ?? 0) : 0);

/** Records money received and puts it against invoices; whatever is left over is held as a deposit. */
export function PaymentDialog({
  invoices,
  accounts,
  today,
  focusInvoiceId,
  trigger,
}: {
  invoices: OpenInvoice[];
  /** Asset accounts the money can land in (cash, bank, e-wallets). */
  accounts: { id: string; code: string; name: string; systemKey?: string }[];
  today: string;
  /** Put against this invoice first. */
  focusInvoiceId?: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [cwt, setCwt] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [clientName, setClientName] = useState("");
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Oldest due first, with the focused invoice at the front.
  const ordered = useMemo(
    () =>
      [...invoices].sort(
        (a, b) =>
          Number(b.id === focusInvoiceId) - Number(a.id === focusInvoiceId) ||
          a.dueDate.localeCompare(b.dueDate),
      ),
    [invoices, focusInvoiceId],
  );

  const total = minor(amount) + minor(cwt);
  // Until someone types an allocation, the money fills invoices in order.
  const auto = useMemo(() => {
    let left = total;
    const map: Record<string, string> = {};
    for (const invoice of ordered) {
      const take = Math.min(left, invoice.balanceMinor);
      if (take > 0) map[invoice.id] = minorToInput(take);
      left -= take;
    }
    return map;
  }, [ordered, total]);
  const allocation = (id: string) => (touched ? (typed[id] ?? "") : (auto[id] ?? ""));
  const applied = ordered.reduce((sum, invoice) => sum + minor(allocation(invoice.id)), 0);
  const unapplied = total - applied;
  const account = accounts.find((item) => item.id === accountId);
  const ready = minor(amount) > 0 && !!accountId && unapplied >= 0;

  function reset() {
    setDate(today);
    setAmount("");
    setCwt("");
    setMethod("bank_transfer");
    setReference("");
    setAccountId((accounts.find((item) => item.systemKey === "bank") ?? accounts[0])?.id ?? "");
    setNote("");
    setClientName("");
    setTyped({});
    setTouched(false);
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const allocations = ordered
      .filter((invoice) => minor(allocation(invoice.id)) > 0)
      .map((invoice) => ({ invoiceId: invoice.id, amount: allocation(invoice.id) }));
    run(
      () =>
        recordPayment({
          receivedDate: date,
          amount,
          cwt,
          method,
          reference,
          depositAccountId: accountId,
          note,
          clientName,
          allocations,
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
      <DialogContent scrollable className="sm:max-w-2xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Money that came in. It settles the invoices below; anything left over is kept as a
              customer deposit until it is used.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pay-date" label="Received on" required error={errors.receivedDate}>
                <DatePicker id="pay-date" value={date} onChange={setDate} />
              </Field>
              <Field id="pay-account" label="Into" required error={errors.depositAccountId}>
                <Select value={accountId} onValueChange={(next) => setAccountId(String(next))}>
                  <SelectTrigger id="pay-account" className="w-full">
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
              <Field id="pay-amount" label="Amount received (₱)" required error={errors.amount}>
                <Input
                  id="pay-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={!!errors.amount}
                  className="tabular-nums"
                />
              </Field>
              <Field
                id="pay-cwt"
                label="Tax the client withheld (₱)"
                hint="Creditable withholding tax, if they gave you a certificate (form 2307)."
                error={errors.cwt}
              >
                <Input
                  id="pay-cwt"
                  inputMode="decimal"
                  value={cwt}
                  onChange={(event) => setCwt(event.target.value)}
                  aria-invalid={!!errors.cwt}
                  className="tabular-nums"
                />
              </Field>
              <Field id="pay-method" label="How">
                <Select value={method} onValueChange={(next) => setMethod(next as PaymentMethod)}>
                  <SelectTrigger id="pay-method" className="w-full">
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
              <Field id="pay-reference" label="Reference">
                <Input
                  id="pay-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Transfer or cheque number"
                />
              </Field>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Put against</legend>
              {ordered.length === 0 ? (
                <div className="grid gap-2">
                  <p className="text-muted-foreground text-sm">
                    Nothing is waiting for payment, so this will be kept as a deposit.
                  </p>
                  <Field id="pay-client" label="Who paid" required error={errors.clientName}>
                    <Input
                      id="pay-client"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                ordered.map((invoice) => (
                  <div key={invoice.id} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem]">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        {invoice.number} · {invoice.clientName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatMinor(invoice.balanceMinor)} still owed
                      </p>
                    </div>
                    <Input
                      aria-label={`Amount for ${invoice.number}`}
                      inputMode="decimal"
                      value={allocation(invoice.id)}
                      onChange={(event) => {
                        if (!touched) {
                          setTyped(auto);
                          setTouched(true);
                        }
                        setTyped((current) => ({
                          ...(touched ? current : auto),
                          [invoice.id]: event.target.value,
                        }));
                      }}
                      aria-invalid={!!errors[`allocation:${invoice.id}`]}
                      className="text-right tabular-nums"
                      placeholder="0.00"
                    />
                    {errors[`allocation:${invoice.id}`] && (
                      <p className="text-destructive text-xs sm:col-span-2">
                        {errors[`allocation:${invoice.id}`]}
                      </p>
                    )}
                  </div>
                ))
              )}
            </fieldset>

            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                unapplied < 0 ? "border-destructive/40 bg-destructive/10" : "bg-muted/40"
              }`}
            >
              {unapplied < 0
                ? `${formatMinor(-unapplied)} more is applied than was received.`
                : unapplied === 0
                  ? "Everything is put against invoices."
                  : `${formatMinor(unapplied)} will be kept as a customer deposit.`}
            </p>

            <Field id="pay-note" label="Note">
              <Textarea
                id="pay-note"
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
            <Button type="submit" disabled={pending || !ready}>
              {pending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
