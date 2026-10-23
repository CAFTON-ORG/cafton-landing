"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/dashboard/ui/button";
import { voidBillPayment } from "../actions/payables";
import { ReasonDialog } from "./reason-dialog";

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
