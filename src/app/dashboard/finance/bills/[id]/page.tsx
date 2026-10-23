import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { BillEditor } from "@/features/finance/components/bill-editor";
import { BillPaymentDialog } from "@/features/finance/components/bill-payment-dialog";
import { BillStateBadge } from "@/features/finance/components/bills-table";
import {
  VoidBillButton,
  VoidBillPaymentButton,
} from "@/features/finance/components/bill-void-buttons";
import { PAYMENT_METHOD_LABEL } from "@/features/finance/invoicing";
import { getBill, listVendors } from "@/features/finance/payable-repository";
import { listPostableAccounts } from "@/features/finance/repository";
import { manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Bill" };

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("payables:view");
  if (!staff) return <AccessDenied area="bills" />;

  const { id } = await params;
  const today = manilaDate(new Date());
  const bill = await getBill(id, today);
  if (!bill) notFound();

  const canCreate = can(staff, "payables:create");
  const canApprove = can(staff, "payables:approve");
  const canPay = can(staff, "payables:pay");
  const isDraft = bill.status === "draft";
  const isApproved = bill.status === "approved";
  const [vendors, accounts] = await Promise.all([
    isDraft ? listVendors() : [],
    isDraft || (isApproved && canPay) ? listPostableAccounts() : [],
  ]);
  const costAccounts = accounts.filter(
    (account) => account.type === "expense" || account.type === "asset",
  );
  const payFrom = accounts.filter((account) => account.type === "asset");
  const hasPayments = bill.payments.some((payment) => payment.status === "recorded");

  return (
    <>
      <BackLink href="/dashboard/finance/bills">Bills</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{bill.number ?? "Draft bill"}</h1>
            <BillStateBadge state={bill.state} />
          </div>
          <p className="text-muted-foreground text-sm">
            {bill.vendorName}
            {bill.vendorRef && ` · their invoice ${bill.vendorRef}`}
          </p>
        </div>
        {isApproved && (
          <div className="flex flex-wrap gap-2">
            {canPay && bill.balanceMinor > 0 && (
              <BillPaymentDialog
                billId={bill.id}
                number={bill.number as string}
                vendorName={bill.vendorName}
                balanceMinor={bill.balanceMinor}
                accounts={payFrom}
                today={today}
                trigger={
                  <Button>
                    <Banknote aria-hidden="true" /> Record payment
                  </Button>
                }
              />
            )}
            {canApprove && !hasPayments && (
              <VoidBillButton id={bill.id} number={bill.number as string} />
            )}
          </div>
        )}
      </div>

      {isDraft ? (
        canCreate ? (
          <BillEditor
            bill={bill}
            vendors={vendors
              .filter((vendor) => vendor.active || vendor.id === bill.vendorId)
              .map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                termsDays: vendor.termsDays,
                defaultAccountId: vendor.defaultAccountId,
              }))}
            accounts={costAccounts}
            canApprove={canApprove}
          />
        ) : (
          <p className="text-muted-foreground text-sm">This bill is still a draft.</p>
        )
      ) : (
        <div className="grid gap-4">
          {bill.status === "void" && (
            <Card>
              <CardContent className="text-sm">
                Voided {bill.voidedAt ? formatDate(bill.voidedAt) : ""}: {bill.voidReason}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Bill date</p>
                <p>{formatDate(bill.billDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Due</p>
                <p>{formatDate(bill.dueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="tabular-nums">{formatMinor(bill.totalMinor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Still owed</p>
                <p className="font-semibold tabular-nums">
                  {formatMinor(isApproved ? bill.balanceMinor : 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What it was for</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {bill.lines.map((line) => (
                  <li
                    key={line.id}
                    className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_14rem_9rem] sm:gap-3"
                  >
                    <span>{line.description}</span>
                    <span className="text-muted-foreground">
                      {line.accountCode} {line.accountName}
                    </span>
                    <span className="tabular-nums sm:text-right">
                      {formatMinor(line.amountMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bill.payments.length === 0 ? (
                <p className="text-muted-foreground px-4 py-3 text-sm">Nothing paid yet.</p>
              ) : (
                <ul className="divide-y">
                  {bill.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {payment.number} · {formatDate(payment.paidDate)}
                          {payment.status === "void" && (
                            <StatusBadge tone="neutral" className="ml-2">
                              Void
                            </StatusBadge>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {PAYMENT_METHOD_LABEL[payment.method]} from {payment.paidFromName}
                          {payment.reference && ` · ${payment.reference}`}
                          {payment.whtMinor > 0 &&
                            ` · ${formatMinor(payment.whtMinor)} tax held back`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{formatMinor(payment.amountMinor)}</span>
                        {canPay && payment.status === "recorded" && (
                          <VoidBillPaymentButton id={payment.id} number={payment.number} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {bill.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-line">{bill.notes}</CardContent>
            </Card>
          )}

          {bill.journalEntryId && (
            <p className="text-muted-foreground text-sm">
              Posted to the books as{" "}
              <Link
                className="underline underline-offset-4"
                href={`/dashboard/finance/journal/${bill.journalEntryId}`}
              >
                a journal entry
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </>
  );
}
