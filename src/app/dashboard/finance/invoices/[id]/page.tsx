import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { DueHint } from "@/features/finance/components/due-hint";
import {
  ActivityTimeline,
  DocumentSummary,
  type ActivityItem,
} from "@/features/finance/components/document-summary";
import { InvoiceActions } from "@/features/finance/components/invoice-actions";
import { InvoiceEditor } from "@/features/finance/components/invoice-editor";
import { InvoiceStateBadge } from "@/features/finance/components/invoice-state-badge";
import { Money } from "@/features/finance/components/money";
import {
  VoidCreditNoteButton,
  VoidPaymentButton,
} from "@/features/finance/components/void-buttons";
import { getInvoice } from "@/features/finance/invoice-repository";
import { PAYMENT_METHOD_LABEL } from "@/features/finance/invoicing";
import { listPostableAccounts, listTaxRates } from "@/features/finance/repository";
import { quantityText } from "@/features/sales/pricing";
import { manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("invoices:view");
  if (!staff) return <AccessDenied area="invoices" />;

  const { id } = await params;
  const today = manilaDate(new Date());
  const invoice = await getInvoice(id, today);
  if (!invoice) notFound();

  const canCreate = can(staff, "invoices:create");
  const canIssue = can(staff, "invoices:issue");
  const canSettle = can(staff, "invoices:settle");
  const isDraft = invoice.status === "draft";
  const isIssued = invoice.status === "issued";
  const [taxRates, accounts] = await Promise.all([
    isDraft ? listTaxRates() : [],
    isIssued && canSettle ? listPostableAccounts() : [],
  ]);
  const hasSettlements =
    invoice.payments.some((payment) => payment.status === "recorded") ||
    invoice.creditNotes.some((note) => note.status === "issued");

  const history: ActivityItem[] = [
    { at: invoice.createdAt, text: "Draft started" },
    ...(invoice.issueDate && invoice.status !== "draft"
      ? [{ at: invoice.issueDate, text: `Issued as ${invoice.number}`, tone: "success" as const }]
      : []),
    ...(invoice.sentAt
      ? [{ at: invoice.sentAt, text: "Emailed to the client", detail: invoice.sentTo }]
      : []),
    ...(invoice.lastReminderAt
      ? [
          {
            at: invoice.lastReminderAt,
            text: `Reminded about it (${invoice.reminderCount} in all)`,
          },
        ]
      : []),
    ...invoice.payments.map((payment) => ({
      at: payment.receivedDate,
      text:
        payment.status === "void"
          ? `Payment ${payment.number} was voided`
          : `Payment ${payment.number} of ${formatMinor(payment.appliedMinor ?? 0)} received`,
      detail: PAYMENT_METHOD_LABEL[payment.method],
      tone: payment.status === "void" ? ("danger" as const) : ("success" as const),
    })),
    ...invoice.creditNotes.map((note) => ({
      at: note.issueDate,
      text:
        note.status === "void"
          ? `Credit note ${note.number} was voided`
          : `Credit note ${note.number} for ${formatMinor(note.totalMinor)}`,
      detail: note.reason,
      tone: note.status === "void" ? ("danger" as const) : ("neutral" as const),
    })),
    ...(invoice.voidedAt
      ? [
          {
            at: invoice.voidedAt,
            text: "Voided",
            detail: invoice.voidReason,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <BackLink href="/dashboard/finance/invoices">Invoices</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.number ?? "Draft invoice"}
            </h1>
            <InvoiceStateBadge state={invoice.state} />
          </div>
          <p className="text-muted-foreground text-sm">
            {invoice.clientName}
            {invoice.projectId && invoice.projectName && (
              <>
                {" · "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/projects/${invoice.projectId}`}
                >
                  {invoice.projectName}
                </Link>
              </>
            )}
            {invoice.quoteReference && ` · from quote ${invoice.quoteReference}`}
          </p>
        </div>
        {isIssued && (
          <InvoiceActions
            invoice={{
              id: invoice.id,
              number: invoice.number as string,
              clientName: invoice.clientName,
              organizationId: invoice.organizationId,
              dueDate: invoice.dueDate as string,
              totalMinor: invoice.totalMinor,
              balanceMinor: invoice.balanceMinor,
            }}
            accounts={accounts
              .filter((account) => account.type === "asset")
              .map((account) => ({
                id: account.id,
                code: account.code,
                name: account.name,
                systemKey: account.systemKey,
              }))}
            today={today}
            canIssue={canIssue}
            canSettle={canSettle}
            overdue={invoice.state === "overdue"}
            hasEmail={Boolean(invoice.clientEmail)}
            sent={Boolean(invoice.sentAt)}
            hasSettlements={hasSettlements}
          />
        )}
      </div>

      {isDraft ? (
        canCreate ? (
          <InvoiceEditor invoice={invoice} taxRates={taxRates} canIssue={canIssue} />
        ) : (
          <p className="text-muted-foreground text-sm">This invoice is still a draft.</p>
        )
      ) : (
        <>
          {invoice.status === "void" && (
            <Card className="mb-4">
              <CardContent className="text-sm">
                Voided {invoice.voidedAt ? formatDate(invoice.voidedAt) : ""}: {invoice.voidReason}
              </CardContent>
            </Card>
          )}

          <DocumentSummary
            label={invoice.state === "paid" ? "Paid in full" : "Balance due"}
            amountMinor={isIssued ? invoice.balanceMinor : 0}
            hint={
              invoice.dueDate ? (
                <DueHint
                  dueDate={invoice.dueDate}
                  today={today}
                  owing={isIssued && invoice.balanceMinor > 0}
                />
              ) : undefined
            }
            facts={[
              {
                label: "Issued",
                value: invoice.issueDate ? formatDate(invoice.issueDate) : "None",
              },
              { label: "Due", value: invoice.dueDate ? formatDate(invoice.dueDate) : "None" },
              { label: "Total", value: <Money minor={invoice.totalMinor} /> },
              {
                label: "Paid and credited",
                value: <Money minor={invoice.settledMinor + invoice.creditedMinor} />,
              },
            ]}
          />

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lines</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-muted-foreground hidden grid-cols-[1fr_10rem_9rem] gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase sm:grid">
                  <span>Description</span>
                  <span className="text-right">Quantity and price</span>
                  <span className="text-right">Amount</span>
                </div>
                <ul className="divide-y">
                  {invoice.lines.map((line) => (
                    <li
                      key={line.id}
                      className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_10rem_9rem] sm:gap-3"
                    >
                      <span>
                        {line.description}
                        {line.taxable && <span className="text-muted-foreground"> · taxable</span>}
                      </span>
                      <span className="text-muted-foreground tabular-nums sm:text-right">
                        {quantityText(line.quantityMilli)} {line.unitLabel} ×{" "}
                        {formatMinor(line.unitPriceMinor)}
                      </span>
                      <span className="sm:text-right">
                        <Money minor={line.amountMinor} />
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="ml-auto grid max-w-xs gap-1 border-t px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>
                      <Money minor={invoice.subtotalMinor} />
                    </dd>
                  </div>
                  {invoice.taxMinor > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tax</dt>
                      <dd>
                        <Money minor={invoice.taxMinor} />
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <dt>Total</dt>
                    <dd>
                      <Money minor={invoice.totalMinor} />
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoice.payments.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-3 text-sm">Nothing paid yet.</p>
                ) : (
                  <ul className="divide-y">
                    {invoice.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {payment.number} · {formatDate(payment.receivedDate)}
                            {payment.status === "void" && (
                              <StatusBadge tone="neutral" className="ml-2">
                                Void
                              </StatusBadge>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {PAYMENT_METHOD_LABEL[payment.method]}
                            {payment.reference && ` · ${payment.reference}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Money minor={payment.appliedMinor ?? 0} />
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

            {invoice.creditNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Credit notes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {invoice.creditNotes.map((note) => (
                      <li
                        key={note.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {note.number} · {formatDate(note.issueDate)}
                            {note.status === "void" && (
                              <StatusBadge tone="neutral" className="ml-2">
                                Void
                              </StatusBadge>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">{note.reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Money minor={note.totalMinor} />
                          {canSettle && note.status === "issued" && (
                            <VoidCreditNoteButton id={note.id} number={note.number} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(invoice.notes || invoice.paymentInstructions) && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm whitespace-pre-line">
                  {invoice.paymentInstructions && (
                    <div>
                      <p className="text-muted-foreground text-xs">How to pay</p>
                      {invoice.paymentInstructions}
                    </div>
                  )}
                  {invoice.notes && (
                    <div>
                      <p className="text-muted-foreground text-xs">Notes to the client</p>
                      {invoice.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <ActivityTimeline items={history} />

            {invoice.journalEntryId && (
              <p className="text-muted-foreground text-sm">
                Posted to the books as{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/finance/journal/${invoice.journalEntryId}`}
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
