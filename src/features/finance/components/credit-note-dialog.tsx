"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor } from "@/lib/money";
import { issueCreditNote } from "../actions/invoices";

/**
 * Reduces what a client owes on an issued invoice (a discount, a returned item, an overcharge).
 * Controlled: it is opened from the invoice's More menu, which can't hold a dialog itself.
 */
export function CreditNoteDialog({
  open,
  onOpenChange,
  invoiceId,
  number,
  balanceMinor,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  number: string;
  balanceMinor: number;
  today: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollable>
        {open && (
          <CreditNoteForm
            invoiceId={invoiceId}
            number={number}
            balanceMinor={balanceMinor}
            today={today}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreditNoteForm({
  invoiceId,
  number,
  balanceMinor,
  today,
  onClose,
}: {
  invoiceId: string;
  number: string;
  balanceMinor: number;
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [date, setDate] = useState(today);
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        run(() => issueCreditNote({ invoiceId, issueDate: date, reason, subtotal, tax }), {
          success: (data) => `Issued ${data?.number ?? "the credit note"}.`,
          onSuccess: () => {
            onClose();
            router.refresh();
          },
          onFieldErrors: setErrors,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Credit note for {number}</DialogTitle>
        <DialogDescription>
          Takes money off what is owed. {formatMinor(balanceMinor)} is still owed, and a credit
          can&apos;t be more than that.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field id="cn-date" label="Date" required error={errors.issueDate}>
            <DatePicker id="cn-date" value={date} onChange={setDate} />
          </Field>
          <Field id="cn-subtotal" label="Amount before tax (₱)" required error={errors.subtotal}>
            <Input
              id="cn-subtotal"
              inputMode="decimal"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
              aria-invalid={!!errors.subtotal}
              className="tabular-nums"
            />
          </Field>
          <Field
            id="cn-tax"
            label="Tax in it (₱)"
            hint="Leave blank to follow the invoice's rate."
            error={errors.tax}
          >
            <Input
              id="cn-tax"
              inputMode="decimal"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              className="tabular-nums"
            />
          </Field>
        </div>
        <Field id="cn-reason" label="Why" required error={errors.reason}>
          <Textarea
            id="cn-reason"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={!!errors.reason}
          />
        </Field>
        {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !subtotal.trim() || !reason.trim()}>
          {pending ? "Issuing…" : "Issue credit note"}
        </Button>
      </DialogFooter>
    </form>
  );
}
