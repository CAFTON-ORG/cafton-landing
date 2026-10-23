import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Download } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { CreditNoteDialog } from "@/features/finance/components/credit-note-dialog";
import { InvoiceEditor } from "@/features/finance/components/invoice-editor";
import { InvoiceStateBadge } from "@/features/finance/components/invoice-state-badge";
import {
  RemindButton,
  SendInvoiceButton,
} from "@/features/finance/components/invoice-mail-buttons";
import { PaymentDialog } from "@/features/finance/components/payment-dialog";
import {
  VoidCreditNoteButton,
  VoidInvoiceButton,
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
  const assets = accounts.filter((account) => account.type === "asset");
  const hasSettlements =
    invoice.payments.some((payment) => payment.status === "recorded") ||
    invoice.creditNotes.some((note) => note.status === "issued");

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
        {!isDraft && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/api/finance/invoices/${invoice.id}/pdf`} download />}
            >
              <Download aria-hidden="true" /> PDF
            </Button>
            {isIssued && canIssue && <SendInvoiceButton id={invoice.id} sent={!!invoice.sentAt} />}
            {isIssued && canIssue && invoice.state === "overdue" && invoice.clientEmail && (
              <RemindButton id={invoice.id} />
            )}
          </div>
        )}
        {isIssued && (
          <div className="flex flex-wrap gap-2">
            {canSettle && invoice.balanceMinor > 0 && (
              <PaymentDialog
                invoices={[
                  {
                    id: invoice.id,
                    number: invoice.number as string,
                    clientName: invoice.clientName,
                    organizationId: invoice.organizationId,
                    dueDate: invoice.dueDate as string,
                    totalMinor: invoice.totalMinor,
                    balanceMinor: invoice.balanceMinor,
                  },
                ]}
                accounts={assets}
                today={today}
                focusInvoiceId={invoice.id}
                trigger={
                  <Button>
                    <Banknote aria-hidden="true" /> Record payment
                  </Button>
                }
              />
            )}
            {canSettle && invoice.balanceMinor > 0 && (
              <CreditNoteDialog
                invoiceId={invoice.id}
                number={invoice.number as string}
                balanceMinor={invoice.balanceMinor}
                today={today}
              />
            )}
            {canIssue && !hasSettlements && (
              <VoidInvoiceButton id={invoice.id} number={invoice.number as string} />
            )}
          </div>
        )}
      </div>

      {isDraft ? (
        canCreate ? (
          <InvoiceEditor invoice={invoice} taxRates={taxRates} canIssue={canIssue} />
        ) : (
          <p className="text-muted-foreground text-sm">This invoice is still a draft.</p>
        )
      ) : (
        <div className="grid gap-4">
          {invoice.status === "void" && (
            <Card>
              <CardContent className="text-sm">
                Voided {invoice.voidedAt ? formatDate(invoice.voidedAt) : ""}: {invoice.voidReason}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Issued</p>
                <p>{invoice.issueDate ? formatDate(invoice.issueDate) : "None"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Due</p>
                <p>{invoice.dueDate ? formatDate(invoice.dueDate) : "None"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="tabular-nums">{formatMinor(invoice.totalMinor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Still owed</p>
                <p className="font-semibold tabular-nums">
                  {isIssued ? formatMinor(invoice.balanceMinor) : formatMinor(0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    <span className="tabular-nums sm:text-right">
                      {formatMinor(line.amountMinor)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="ml-auto grid max-w-xs gap-1 border-t px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatMinor(invoice.subtotalMinor)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums">{formatMinor(invoice.taxMinor)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMinor(invoice.totalMinor)}</dd>
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
                        <span className="tabular-nums">
                          {formatMinor(payment.appliedMinor ?? 0)}
                        </span>
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
                        <span className="tabular-nums">{formatMinor(note.totalMinor)}</span>
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
      )}
    </>
  );
}
