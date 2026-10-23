"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Banknote, BellRing, Download, ReceiptText } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { remindNow, voidInvoice } from "../actions/invoices";
import type { OpenInvoice } from "../invoice-types";
import { CreditNoteDialog } from "./credit-note-dialog";
import { SendInvoiceButton } from "./invoice-mail-buttons";
import { MoreActions, type MoreItem } from "./more-actions";
import { PaymentDialog } from "./payment-dialog";
import { ReasonDialog } from "./reason-dialog";

/**
 * What can be done with an invoice, laid out the way accounting packages do: the main next step
 * (record a payment) and the email are buttons; download, reminder, credit note and void live in
 * "More".
 */
export function InvoiceActions({
  invoice,
  accounts,
  today,
  canIssue,
  canSettle,
  overdue,
  hasEmail,
  sent,
  hasSettlements,
}: {
  invoice: OpenInvoice;
  accounts: { id: string; code: string; name: string; systemKey?: string }[];
  today: string;
  canIssue: boolean;
  canSettle: boolean;
  overdue: boolean;
  hasEmail: boolean;
  sent: boolean;
  /** Payments or credit notes stand against it, so it can't be voided. */
  hasSettlements: boolean;
}) {
  const router = useRouter();
  const { run } = useServerAction();
  const [credit, setCredit] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const owing = invoice.balanceMinor > 0;

  const items: MoreItem[] = [
    {
      kind: "link",
      label: "Download PDF",
      href: `/api/finance/invoices/${invoice.id}/pdf`,
      icon: Download,
      download: true,
    },
    ...(canIssue && overdue && hasEmail
      ? [
          {
            kind: "action" as const,
            label: "Send a reminder now",
            icon: BellRing,
            onSelect: () =>
              run(() => remindNow(invoice.id), {
                success: "Reminder sent.",
                onSuccess: () => router.refresh(),
              }),
          },
        ]
      : []),
    ...(canSettle && owing
      ? [
          {
            kind: "action" as const,
            label: "Issue a credit note",
            icon: ReceiptText,
            onSelect: () => setCredit(true),
          },
        ]
      : []),
    ...(canIssue && !hasSettlements
      ? [
          { kind: "separator" as const },
          {
            kind: "action" as const,
            label: "Void invoice",
            icon: Ban,
            destructive: true,
            onSelect: () => setVoiding(true),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSettle && owing && (
        <PaymentDialog
          invoices={[invoice]}
          accounts={accounts}
          today={today}
          focusInvoiceId={invoice.id}
          trigger={
            <Button>
              <Banknote aria-hidden="true" /> Record payment
            </Button>
          }
        />
      )}
      {canIssue && <SendInvoiceButton id={invoice.id} sent={sent} />}
      <MoreActions items={items} />

      <CreditNoteDialog
        open={credit}
        onOpenChange={setCredit}
        invoiceId={invoice.id}
        number={invoice.number}
        balanceMinor={invoice.balanceMinor}
        today={today}
      />
      <ReasonDialog
        open={voiding}
        onOpenChange={setVoiding}
        title={`Void ${invoice.number}?`}
        description={`${invoice.number} stays on record, marked void, and its posting is reversed in the books. Anything it billed becomes billable again. An invoice with payments or credit notes can't be voided: void those first.`}
        confirmLabel="Void invoice"
        success="Invoice voided."
        onConfirm={(reason) => voidInvoice({ id: invoice.id, reason })}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
