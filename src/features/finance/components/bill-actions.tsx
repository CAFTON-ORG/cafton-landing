"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Banknote } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { voidBill } from "../actions/payables";
import type { BillAccount } from "../types/payables";
import { BillPaymentDialog } from "./bill-payment-dialog";
import { MoreActions, type MoreItem } from "./more-actions";
import { ReasonDialog } from "./reason-dialog";

/** What can be done with an approved bill: pay it (the main step), or void it from "More". */
export function BillActions({
  bill,
  accounts,
  today,
  canPay,
  canApprove,
  hasPayments,
}: {
  bill: { id: string; number: string; vendorName: string; balanceMinor: number };
  accounts: BillAccount[];
  today: string;
  canPay: boolean;
  canApprove: boolean;
  /** A payment stands against it, so it can't be voided. */
  hasPayments: boolean;
}) {
  const router = useRouter();
  const [voiding, setVoiding] = useState(false);
  const items: MoreItem[] =
    canApprove && !hasPayments
      ? [
          {
            kind: "action",
            label: "Void bill",
            icon: Ban,
            destructive: true,
            onSelect: () => setVoiding(true),
          },
        ]
      : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canPay && bill.balanceMinor > 0 && (
        <BillPaymentDialog
          billId={bill.id}
          number={bill.number}
          vendorName={bill.vendorName}
          balanceMinor={bill.balanceMinor}
          accounts={accounts}
          today={today}
          trigger={
            <Button>
              <Banknote aria-hidden="true" /> Record payment
            </Button>
          }
        />
      )}
      <MoreActions items={items} />
      <ReasonDialog
        open={voiding}
        onOpenChange={setVoiding}
        title={`Void ${bill.number}?`}
        description={`${bill.number} stays on record, marked void, and its posting is reversed in the books. A bill with payments can't be voided: void those first.`}
        confirmLabel="Void bill"
        success="Bill voided."
        onConfirm={(reason) => voidBill({ id: bill.id, reason })}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
