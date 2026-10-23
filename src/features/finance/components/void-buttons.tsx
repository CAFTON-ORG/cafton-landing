"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { voidCreditNote, voidInvoice, voidPayment } from "../actions/invoices";
import { ReasonDialog } from "./reason-dialog";

export function VoidInvoiceButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ReasonDialog
      title={`Void ${number}?`}
      description={`${number} stays on record, marked void, and its posting is reversed in the books. Anything it billed becomes billable again. An invoice with payments or credit notes can't be voided: void those first.`}
      confirmLabel="Void invoice"
      success="Invoice voided."
      onConfirm={(reason) => voidInvoice({ id, reason })}
      onDone={() => router.refresh()}
      trigger={(open) => (
        <Button variant="outline" onClick={open}>
          <Ban aria-hidden="true" /> Void
        </Button>
      )}
    />
  );
}

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
