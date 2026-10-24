"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { minorToInput } from "@/lib/money";
import { saveExpense, uploadReceipt } from "../actions/expenses";
import { MAX_RECEIPTS, RECEIPT_ACCEPT, RECEIPT_REQUIRED_OVER_MINOR } from "../rules/expenses";
import type { ExpenseDetail } from "../types/expenses";
import type { BillAccount } from "../types/payables";

const label = (account?: BillAccount) => (account ? `${account.code} ${account.name}` : "");

/** Where the money came from, in words a person would use. */
const paidFromLabel = (account: BillAccount) =>
  account.systemKey === "reimbursable"
    ? "I paid for it myself (reimburse me)"
    : `${account.code} ${account.name}`;

/** Submits an expense for approval (or, with `expense`, edits one waiting or sent back), with its receipts. */
export function ExpenseDialog({
  today,
  costAccounts,
  paidFromAccounts,
  expense,
  trigger,
}: {
  today: string;
  costAccounts: BillAccount[];
  paidFromAccounts: BillAccount[];
  expense?: ExpenseDetail;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const files = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(today);
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidFromId, setPaidFromId] = useState("");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setDate(expense?.expenseDate ?? today);
    setPayee(expense?.payee ?? "");
    setDescription(expense?.description ?? "");
    setAccountId(expense?.accountId ?? "");
    setAmount(expense ? minorToInput(expense.amountMinor) : "");
    setPaidFromId(
      expense?.paidFromAccountId ??
        (paidFromAccounts.find((item) => item.systemKey === "cash") ?? paidFromAccounts[0])?.id ??
        "",
    );
    setNotes(expense?.notes ?? "");
    setPicked([]);
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(
      () =>
        saveExpense({
          id: expense?.id,
          expenseDate: date,
          payee,
          description,
          accountId,
          amount,
          paidFromAccountId: paidFromId,
          notes,
        }),
      {
        success: expense ? "Expense updated." : "Expense submitted.",
        onSuccess: async (data) => {
          const saved = data as { id: string } | undefined;
          if (saved && picked.length > 0) {
            setBusy(true);
            for (const file of picked) {
              const form = new FormData();
              form.set("expenseId", saved.id);
              form.set("file", file);
              const result = await uploadReceipt(form);
              if (!result.ok) toast.error(result.error);
            }
            setBusy(false);
          }
          setOpen(false);
          if (saved && !expense) router.push(`/dashboard/finance/expenses/${saved.id}`);
          else router.refresh();
        },
        onFieldErrors: setErrors,
      },
    );
  }

  const cost = costAccounts.find((item) => item.id === accountId);
  const paidFrom = paidFromAccounts.find((item) => item.id === paidFromId);
  const working = pending || busy;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (working) return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
            <DialogDescription>
              Something you paid for the business. It goes to an approver, and is added to the books
              once they approve it.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field id="exp-date" label="Date paid" required error={errors.expenseDate}>
                <DatePicker id="exp-date" value={date} onChange={setDate} />
              </Field>
              <Field id="exp-amount" label="Amount (₱)" required error={errors.amount}>
                <Input
                  id="exp-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={!!errors.amount}
                  className="tabular-nums"
                />
              </Field>
            </div>
            <Field id="exp-payee" label="Paid to" required error={errors.payee}>
              <Input
                id="exp-payee"
                value={payee}
                onChange={(event) => setPayee(event.target.value)}
                aria-invalid={!!errors.payee}
                placeholder="Shop or person"
                autoComplete="off"
              />
            </Field>
            <Field id="exp-description" label="What it was for" required error={errors.description}>
              <Input
                id="exp-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={!!errors.description}
              />
            </Field>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field id="exp-account" label="Category" required error={errors.accountId}>
                <Select value={accountId} onValueChange={(next) => setAccountId(String(next))}>
                  <SelectTrigger id="exp-account" className="w-full">
                    <SelectValue placeholder="Choose a category">{label(cost)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {costAccounts.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="exp-paid-from" label="Paid from" required error={errors.paidFromAccountId}>
                <Select value={paidFromId} onValueChange={(next) => setPaidFromId(String(next))}>
                  <SelectTrigger id="exp-paid-from" className="w-full">
                    <SelectValue placeholder="Where the money came from">
                      {paidFrom ? paidFromLabel(paidFrom) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paidFromAccounts.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {paidFromLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              id="exp-receipts"
              label="Receipts"
              hint={`A photo or PDF, up to 4 MB each. Needed above ₱${(RECEIPT_REQUIRED_OVER_MINOR / 100).toLocaleString("en-PH")}.${expense ? " Add more on the expense page." : ""}`}
            >
              {!expense && (
                <>
                  <input
                    ref={files}
                    id="exp-receipts"
                    type="file"
                    multiple
                    accept={RECEIPT_ACCEPT}
                    className="file:bg-muted file:text-foreground text-muted-foreground w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    onChange={(event) =>
                      setPicked(Array.from(event.target.files ?? []).slice(0, MAX_RECEIPTS))
                    }
                  />
                  {picked.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {picked.length} {picked.length === 1 ? "file" : "files"} ready to attach.
                    </p>
                  )}
                </>
              )}
            </Field>
            <Field id="exp-notes" label="Notes">
              <Textarea
                id="exp-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                working || !payee.trim() || !description.trim() || !accountId || !paidFromId
              }
            >
              {working ? "Saving…" : expense ? "Save" : "Submit expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
