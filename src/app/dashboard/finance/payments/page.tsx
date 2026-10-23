import type { Metadata } from "next";
import { Banknote, Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Money } from "@/features/finance/components/money";
import { PaymentDialog } from "@/features/finance/components/payment-dialog";
import { VoidPaymentButton } from "@/features/finance/components/void-buttons";
import { listOpenInvoices, listPayments } from "@/features/finance/invoice-repository";
import { PAYMENT_METHOD_LABEL } from "@/features/finance/invoicing";
import { listPostableAccounts } from "@/features/finance/repository";
import { manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const staff = await requirePageAccess("invoices:view");
  if (!staff) return <AccessDenied area="payments" />;

  const canSettle = can(staff, "invoices:settle");
  const [payments, open, accounts] = await Promise.all([
    listPayments(),
    canSettle ? listOpenInvoices() : [],
    canSettle ? listPostableAccounts() : [],
  ]);
  const assets = accounts.filter((account) => account.type === "asset");

  const record = canSettle ? (
    <PaymentDialog
      invoices={open}
      accounts={assets}
      today={manilaDate(new Date())}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> Record payment
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money received from clients, and which invoices it settled. What a payment brings in beyond its invoices is held as a customer deposit."
        action={record}
      />
      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No payments yet"
              description="Record a payment when a client pays, and the invoices it settles are marked paid."
              action={record}
            />
          ) : (
            <ul className="divide-y">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {payment.number} · {payment.clientName}
                      {payment.status === "void" && (
                        <StatusBadge tone="neutral" className="ml-2">
                          Void
                        </StatusBadge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(payment.receivedDate)} · {PAYMENT_METHOD_LABEL[payment.method]}
                      {payment.invoiceNumbers.length > 0 &&
                        ` · ${payment.invoiceNumbers.join(", ")}`}
                      {payment.unappliedMinor > 0 &&
                        ` · ${formatMinor(payment.unappliedMinor)} held as deposit`}
                      {payment.cwtMinor > 0 && ` · ${formatMinor(payment.cwtMinor)} withheld`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money minor={payment.amountMinor} />
                    {canSettle && payment.status === "recorded" && (
                      <VoidPaymentButton id={payment.id} number={payment.number} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
