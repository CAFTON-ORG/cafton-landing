"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/dashboard/ui/button";
import { voidCreditNote, voidPayment } from "../actions/invoices";
import { ReasonDialog } from "./reason-dialog";

export function VoidPaymentButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ReasonDialog
      title={`Void ${number}?`}
      description="The payment is reversed in the books and the invoices it settled owe that money again."
      confirmLabel="Void payment"
      success="Payment voided."
      onConfirm={(reason) => voidPayment({ id, reason })}
      onDone={() => router.refresh()}
      trigger={(open) => (
        <Button size="sm" variant="ghost" onClick={open}>
          Void
        </Button>
      )}
    />
  );
}

export function VoidCreditNoteButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ReasonDialog
      title={`Void ${number}?`}
      description="The credit is reversed in the books and the invoice owes that money again."
      confirmLabel="Void credit note"
      success="Credit note voided."
      onConfirm={(reason) => voidCreditNote({ id, reason })}
      onDone={() => router.refresh()}
      trigger={(open) => (
        <Button size="sm" variant="ghost" onClick={open}>
          Void
        </Button>
      )}
    />
  );
}
