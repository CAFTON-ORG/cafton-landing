import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { BillActions } from "@/features/finance/components/bill-actions";
import { BillEditor } from "@/features/finance/components/bill-editor";
import { VoidBillPaymentButton } from "@/features/finance/components/bill-void-buttons";
import { BillStateBadge } from "@/features/finance/components/bills-table";
import { DueHint } from "@/features/finance/components/due-hint";
import {
  ActivityTimeline,
  DocumentSummary,
  type ActivityItem,
} from "@/features/finance/components/document-summary";
import { Money } from "@/features/finance/components/money";
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

  const history: ActivityItem[] = [
    { at: bill.createdAt, text: "Draft started" },
    ...(bill.approvedAt
      ? [{ at: bill.approvedAt, text: `Approved as ${bill.number}`, tone: "success" as const }]
      : []),
    ...bill.payments.map((payment) => ({
      at: payment.paidDate,
      text:
        payment.status === "void"
          ? `Payment ${payment.number} was voided`
          : `Payment ${payment.number} of ${formatMinor(payment.amountMinor + payment.whtMinor)} made`,
      detail: `${PAYMENT_METHOD_LABEL[payment.method]} from ${payment.paidFromName}`,
      tone: payment.status === "void" ? ("danger" as const) : ("success" as const),
    })),
    ...(bill.voidedAt
      ? [
          {
            at: bill.voidedAt,
            text: "Voided",
            detail: bill.voidReason,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

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
          <BillActions
            bill={{
              id: bill.id,
              number: bill.number as string,
              vendorName: bill.vendorName,
              balanceMinor: bill.balanceMinor,
            }}
            accounts={payFrom.map((account) => ({
              id: account.id,
              code: account.code,
              name: account.name,
              systemKey: account.systemKey,
            }))}
            today={today}
            canPay={canPay}
            canApprove={canApprove}
            hasPayments={hasPayments}
          />
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
        <>
          {bill.status === "void" && (
            <Card className="mb-4">
              <CardContent className="text-sm">
                Voided {bill.voidedAt ? formatDate(bill.voidedAt) : ""}: {bill.voidReason}
              </CardContent>
            </Card>
          )}

          <DocumentSummary
            label={bill.state === "paid" ? "Paid in full" : "Still to pay"}
            amountMinor={isApproved ? bill.balanceMinor : 0}
            hint={
              <DueHint
                dueDate={bill.dueDate}
                today={today}
                owing={isApproved && bill.balanceMinor > 0}
              />
            }
            facts={[
              { label: "Bill date", value: formatDate(bill.billDate) },
              { label: "Due", value: formatDate(bill.dueDate) },
              { label: "Total", value: <Money minor={bill.totalMinor} /> },
              { label: "Paid so far", value: <Money minor={bill.paidMinor} /> },
            ]}
          />

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>What it was for</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-muted-foreground hidden grid-cols-[1fr_14rem_9rem] gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase sm:grid">
                  <span>Description</span>
                  <span>Booked to</span>
                  <span className="text-right">Amount</span>
                </div>
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
                      <span className="sm:text-right">
                        <Money minor={line.amountMinor} />
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
                          <Money minor={payment.amountMinor} />
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

            <ActivityTimeline items={history} />

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
        </>
      )}
    </>
  );
}
