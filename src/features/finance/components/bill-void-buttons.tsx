"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { voidBill, voidBillPayment } from "../actions/payables";
import { ReasonDialog } from "./reason-dialog";

export function VoidBillButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ReasonDialog
      title={`Void ${number}?`}
      description={`${number} stays on record, marked void, and its posting is reversed in the books. A bill with payments can't be voided: void those first.`}
      confirmLabel="Void bill"
      success="Bill voided."
      onConfirm={(reason) => voidBill({ id, reason })}
      onDone={() => router.refresh()}
      trigger={(open) => (
        <Button variant="outline" onClick={open}>
          <Ban aria-hidden="true" /> Void
        </Button>
      )}
    />
  );
}

export function VoidBillPaymentButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ReasonDialog
      title={`Void ${number}?`}
      description="The payment is reversed in the books and the bill is owed that money again."
      confirmLabel="Void payment"
      success="Payment voided."
      onConfirm={(reason) => voidBillPayment({ id, reason })}
      onDone={() => router.refresh()}
      trigger={(open) => (
        <Button size="sm" variant="ghost" onClick={open}>
          Void
        </Button>
      )}
    />
  );
}
