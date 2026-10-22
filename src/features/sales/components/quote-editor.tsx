"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FilePlus2, Plus, Send, Trash2, Trophy, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor, minorToInput, parseMinor } from "@/lib/money";
import {
  approveQuote,
  deleteQuote,
  rejectQuote,
  quoteLinkFor,
  reviseQuote,
  saveQuote,
  sendQuote,
  submitQuote,
} from "../actions/quotes";
import { lineTotal, parseQuantity, quantityText, quoteTotals } from "../pricing";
import { canEdit, needsApproval } from "../rules";
import type { CatalogItemView, QuoteView } from "../types";
import { QuoteStatusBadge } from "./quote-status-badge";

interface LineState {
  key: string;
  catalogItemId: string;
  description: string;
  quantity: string;
  unitLabel: string;
  price: string;
  discountPct: string;
  taxable: boolean;
}

const blank = (): LineState => ({
  key: crypto.randomUUID(),
  catalogItemId: "",
  description: "",
  quantity: "1",
  unitLabel: "project",
  price: "",
  discountPct: "0",
  taxable: true,
});

const fromQuote = (quote: QuoteView): LineState[] =>
  quote.lines.map((line) => ({
    key: line.id,
    catalogItemId: line.catalogItemId ?? "",
    description: line.description,
    quantity: quantityText(line.quantityMilli),
    unitLabel: line.unitLabel,
    price: minorToInput(line.unitPriceMinor, quote.currency),
    discountPct: String(line.discountPct),
    taxable: line.taxable,
  }));

/** What the numbers in the boxes mean, ignoring anything half-typed: used for the live totals. */
function priced(line: LineState) {
  const unitPriceMinor = parseMinor(line.price) ?? 0;
  const quantityMilli = parseQuantity(line.quantity) ?? 0;
  const discountPct = Math.min(100, Math.max(0, Math.round(Number(line.discountPct) || 0)));
  return { unitPriceMinor, quantityMilli, discountPct, taxable: line.taxable };
}

/**
 * The quote builder. A draft is edited here (lines, wording, validity) with live totals; every
 * other status shows the same page read-only, with the next step in the rail: submit, approve,
 * send, make a new version, download the PDF, copy the client's link.
 */
export function QuoteEditor({ quote, catalog }: { quote: QuoteView; catalog: CatalogItemView[] }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const canUpdate = useCan("quotes:update");
  const canCreate = useCan("quotes:create");
  const canApprove = useCan("quotes:approve");
  const canSend = useCan("quotes:send");
  const canDelete = useCan("quotes:delete");

  const editable = canEdit(quote.status) && canUpdate && quote.isLatest;
  const initial = useMemo(
    () => ({
      title: quote.title,
      intro: quote.intro ?? "",
      terms: quote.terms ?? "",
      validUntil: quote.validUntil ?? "",
      lines: fromQuote(quote),
    }),
    [quote],
  );
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const dirty = editable && JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setLine = (key: string, patch: Partial<LineState>) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));

  const shown = editable ? values.lines.map(priced) : quote.lines;
  const totals = editable
    ? quoteTotals(shown as ReturnType<typeof priced>[], quote.taxRatePct)
    : {
        subtotalMinor: quote.subtotalMinor,
        taxMinor: quote.taxMinor,
        totalMinor: quote.totalMinor,
      };

  function save() {
    setErrors({});
    run(
      () =>
        saveQuote(quote.id, {
          title: values.title,
          intro: values.intro,
          terms: values.terms,
          validUntil: values.validUntil,
          lines: values.lines.map((line) => ({
            catalogItemId: line.catalogItemId || undefined,
            description: line.description,
            quantity: line.quantity,
            unitLabel: line.unitLabel,
            price: line.price,
            discountPct: Number(line.discountPct) || 0,
            taxable: line.taxable,
          })),
        }),
      {
        success: "Saved.",
        onSuccess: () => router.refresh(),
        onFieldErrors: setErrors,
      },
    );
  }

  function addFromCatalog(id: string) {
    const item = catalog.find((entry) => entry.id === id);
    if (!item) return;
    setValues((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          ...blank(),
          catalogItemId: item.id,
          description: item.description ? `${item.name}: ${item.description}` : item.name,
          unitLabel: item.unitLabel,
          price: minorToInput(item.unitPriceMinor, quote.currency),
          taxable: item.taxable,
        },
      ],
    }));
  }

  const lineError = (index: number) =>
    Object.entries(errors)
      .filter(([key]) => key.startsWith(`lines.${index}.`))
      .map(([, message]) => message)[0];

  const submitDisabled = pending || dirty || values.lines.length === 0;
  const next = quote.status;

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (editable) save();
        }}
        noValidate
      >
        <EditorLayout
          rail={
            <>
              {editable ? (
                <FormActions
                  title="Quote"
                  badge={<QuoteStatusBadge status={quote.status} />}
                  dirty={dirty}
                  pending={pending}
                  onDiscard={() => {
                    setValues(initial);
                    setErrors({});
                  }}
                  error={Object.keys(errors).length ? "Some lines need a look." : undefined}
                  secondary={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitDisabled}
                      title={dirty ? "Save your changes first" : undefined}
                      onClick={() =>
                        run(() => submitQuote(quote.id), {
                          success: (data) =>
                            data?.status === "pending_approval"
                              ? "Sent for approval."
                              : "Approved. You can send it now.",
                          onSuccess: () => router.refresh(),
                        })
                      }
                    >
                      <Check aria-hidden="true" />{" "}
                      {needsApproval(totals.totalMinor)
                        ? "Submit for approval"
                        : "Finish and approve"}
                    </Button>
                  }
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Quote <QuoteStatusBadge status={quote.status} />
                    </CardTitle>
                    <CardDescription>
                      {!quote.isLatest
                        ? "An older version. Open the newest one to work on it."
                        : next === "pending_approval"
                          ? "It is over the approval limit and needs a second person."
                          : next === "approved"
                            ? "Approved. Send it to the client when you are ready."
                            : next === "sent"
                              ? "Waiting for the client's answer."
                              : next === "accepted"
                                ? "Accepted. This is now an agreement and can't be changed."
                                : "Make a new version to change it."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 [&>*]:w-full">
                    {next === "pending_approval" && canApprove && (
                      <>
                        <Button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() => approveQuote(quote.id), {
                              success: "Approved.",
                              onSuccess: () => router.refresh(),
                            })
                          }
                        >
                          <Check aria-hidden="true" /> Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={pending}
                          onClick={() => setRejecting(true)}
                        >
                          <Undo2 aria-hidden="true" /> Send back with a note
                        </Button>
                      </>
                    )}
                    {(next === "approved" || next === "sent") && canSend && quote.isLatest && (
                      <Button type="button" disabled={pending} onClick={() => setSending(true)}>
                        <Send aria-hidden="true" />{" "}
                        {next === "sent" ? "Send again" : `Send to ${quote.contactName}`}
                      </Button>
                    )}
                    {next === "accepted" && (
                      <Button
                        type="button"
                        nativeButton={false}
                        render={<Link href={`/dashboard/crm/deals/${quote.dealId}`} />}
                      >
                        <Trophy aria-hidden="true" /> Go to the deal and mark it won
                      </Button>
                    )}
                    {next !== "accepted" && next !== "superseded" && canCreate && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          run(() => reviseQuote(quote.id), {
                            success: "New version started.",
                            onSuccess: (data) =>
                              data && router.push(`/dashboard/sales/quotes/${data.id}`),
                          })
                        }
                      >
                        <FilePlus2 aria-hidden="true" /> Make a new version
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Share</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 [&>*]:w-full">
                  <Button
                    type="button"
                    variant="outline"
                    nativeButton={false}
                    render={<a href={`/api/crm/quotes/${quote.id}/pdf`} download />}
                  >
                    <Download aria-hidden="true" /> Download the PDF
                  </Button>
                  {quote.hasLink && <CopyLink quoteId={quote.id} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="grid gap-2 text-sm">
                    <li>
                      Started {formatDate(quote.createdAt)}
                      {quote.createdByName && ` by ${quote.createdByName}`}
                    </li>
                    {quote.approvedAt && (
                      <li>
                        Approved {formatDate(quote.approvedAt)}
                        {quote.approvedByName
                          ? ` by ${quote.approvedByName}`
                          : " (under the approval limit)"}
                      </li>
                    )}
                    {quote.sentAt && (
                      <li>
                        Sent to {quote.sentTo} on{" "}
                        {formatDate(quote.sentAt, { dateStyle: "medium", timeStyle: "short" })}
                      </li>
                    )}
                    {quote.viewedAt && (
                      <li>
                        Opened by the client{" "}
                        {formatDate(quote.viewedAt, { dateStyle: "medium", timeStyle: "short" })}
                      </li>
                    )}
                    {quote.acceptedAt && (
                      <li className="font-medium text-emerald-800 dark:text-emerald-300">
                        Accepted by {quote.acceptedByName} on{" "}
                        {formatDate(quote.acceptedAt, { dateStyle: "medium", timeStyle: "short" })}
                      </li>
                    )}
                    {quote.declinedAt && (
                      <li>
                        Declined {formatDate(quote.declinedAt)}: {quote.declinedReason}
                      </li>
                    )}
                  </ol>
                </CardContent>
              </Card>

              {canDelete && quote.status === "draft" && !quote.hasLink && (
                <Button type="button" variant="ghost" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden="true" /> Delete this draft
                </Button>
              )}
            </>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              For{" "}
              <Link
                href={`/dashboard/crm/deals/${quote.dealId}`}
                className="underline underline-offset-4"
              >
                {quote.dealTitle}
              </Link>{" "}
              · {quote.contactName}
              {quote.contactEmail ? ` <${quote.contactEmail}>` : " (no email address)"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lines</CardTitle>
              <CardDescription>
                Prices are in {quote.currency}. VAT of {quote.taxRatePct}% is added to the lines
                marked VAT.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(editable ? values.lines : []).map((line, index) => {
                const error = lineError(index);
                const label = "text-muted-foreground mb-1 block text-xs";
                return (
                  <div key={line.key} className="grid gap-3 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Textarea
                        rows={2}
                        aria-label={`Line ${index + 1} description`}
                        value={line.description}
                        aria-invalid={!!errors[`lines.${index}.description`]}
                        onChange={(event) => setLine(line.key, { description: event.target.value })}
                        placeholder="What is being sold"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove line ${index + 1}`}
                        onClick={() =>
                          setValues((c) => ({
                            ...c,
                            lines: c.lines.filter((l) => l.key !== line.key),
                          }))
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[4.5rem_5.5rem_minmax(8rem,1fr)_4.5rem_auto_auto]">
                      <label>
                        <span className={label}>Qty</span>
                        <Input
                          inputMode="decimal"
                          value={line.quantity}
                          aria-invalid={!!errors[`lines.${index}.quantity`]}
                          onChange={(event) => setLine(line.key, { quantity: event.target.value })}
                        />
                      </label>
                      <label>
                        <span className={label}>Unit</span>
                        <Input
                          value={line.unitLabel}
                          onChange={(event) => setLine(line.key, { unitLabel: event.target.value })}
                        />
                      </label>
                      <label>
                        <span className={label}>Price (PHP)</span>
                        <Input
                          inputMode="decimal"
                          value={line.price}
                          placeholder="0.00"
                          aria-invalid={!!errors[`lines.${index}.price`]}
                          onChange={(event) => setLine(line.key, { price: event.target.value })}
                        />
                      </label>
                      <label>
                        <span className={label}>Disc. %</span>
                        <Input
                          inputMode="numeric"
                          value={line.discountPct}
                          onChange={(event) =>
                            setLine(line.key, { discountPct: event.target.value })
                          }
                        />
                      </label>
                      <span className="flex h-9 items-center gap-2 text-sm">
                        <Checkbox
                          aria-label={`Line ${index + 1} has VAT`}
                          checked={line.taxable}
                          onCheckedChange={(checked) =>
                            setLine(line.key, { taxable: checked === true })
                          }
                        />
                        VAT
                      </span>
                      <span className="text-right text-sm font-medium tabular-nums sm:pb-2">
                        {formatMinor(lineTotal(priced(line)), quote.currency)}
                      </span>
                    </div>
                    {error && (
                      <p role="alert" className="text-destructive text-xs">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}

              {!editable && (
                <ul className="divide-y rounded-lg border">
                  {quote.lines.map((line) => (
                    <li
                      key={line.id}
                      className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[1fr_auto] sm:gap-4"
                    >
                      <span className="whitespace-pre-wrap">{line.description}</span>
                      <span className="text-muted-foreground tabular-nums sm:text-right">
                        {quantityText(line.quantityMilli)} {line.unitLabel} ×{" "}
                        {formatMinor(line.unitPriceMinor, quote.currency)}
                        {line.discountPct > 0 && ` − ${line.discountPct}%`}
                        <span className="text-foreground block font-medium">
                          {formatMinor(line.totalMinor, quote.currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {editable && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValues((c) => ({ ...c, lines: [...c.lines, blank()] }))}
                  >
                    <Plus aria-hidden="true" /> Add a line
                  </Button>
                  {catalog.length > 0 && (
                    <Select value="" onValueChange={(id) => id && addFromCatalog(String(id))}>
                      <SelectTrigger size="sm" aria-label="Add from the catalog" className="w-56">
                        <SelectValue placeholder="Add from the catalog…" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} · {formatMinor(item.unitPriceMinor)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              {editable && values.lines.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No lines yet. Add one, or pick from the catalog.
                </p>
              )}

              <dl className="ml-auto grid w-full max-w-xs gap-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatMinor(totals.subtotalMinor, quote.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>VAT ({quote.taxRatePct}%)</dt>
                  <dd className="tabular-nums">{formatMinor(totals.taxMinor, quote.currency)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMinor(totals.totalMinor, quote.currency)}</dd>
                </div>
                {needsApproval(totals.totalMinor) && (
                  <p className="text-muted-foreground pt-1 text-xs">
                    Over the approval limit: a second person approves it before it can be sent.
                  </p>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wording</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="quote-title" label="Title" required error={errors.title}>
                <Input
                  id="quote-title"
                  value={editable ? values.title : quote.title}
                  readOnly={!editable}
                  aria-invalid={!!errors.title}
                  onChange={(event) => setValues((c) => ({ ...c, title: event.target.value }))}
                />
              </Field>
              <Field
                id="quote-valid"
                label="Valid until"
                error={errors.validUntil}
                hint="After this date the client can no longer accept it."
              >
                {editable ? (
                  <DatePicker
                    id="quote-valid"
                    value={values.validUntil}
                    onChange={(value) => setValues((c) => ({ ...c, validUntil: value }))}
                    clearable
                  />
                ) : (
                  <p className="text-sm">
                    {quote.validUntil ? formatDate(quote.validUntil) : "No end date"}
                  </p>
                )}
              </Field>
              <Field id="quote-intro" label="Introduction" error={errors.intro}>
                <Textarea
                  id="quote-intro"
                  rows={3}
                  value={editable ? values.intro : (quote.intro ?? "")}
                  readOnly={!editable}
                  onChange={(event) => setValues((c) => ({ ...c, intro: event.target.value }))}
                />
              </Field>
              <Field
                id="quote-terms"
                label="Terms"
                error={errors.terms}
                hint="Payment, what is included, how long it is valid."
              >
                <Textarea
                  id="quote-terms"
                  rows={6}
                  value={editable ? values.terms : (quote.terms ?? "")}
                  readOnly={!editable}
                  onChange={(event) => setValues((c) => ({ ...c, terms: event.target.value }))}
                />
              </Field>
            </CardContent>
          </Card>
        </EditorLayout>
      </form>

      <Dialog open={rejecting} onOpenChange={(open) => !pending && setRejecting(open)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => rejectQuote(quote.id, reason), {
                success: "Sent back.",
                onSuccess: () => {
                  setRejecting(false);
                  setReason("");
                  router.refresh();
                },
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Send this quote back?</DialogTitle>
              <DialogDescription>
                It returns to a draft and its writer is told what to change.
              </DialogDescription>
            </DialogHeader>
            <Field id="reject-reason" label="What should change?" required>
              <Textarea
                id="reject-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejecting(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !reason.trim()}>
                Send back
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={sending}
        onOpenChange={setSending}
        title={`Send ${quote.reference} to ${quote.contactName}?`}
        description={`It is emailed to ${quote.contactEmail ?? "the contact"} with the PDF and a link to review and accept it. Once sent, the figures are fixed: to change them you make a new version.`}
        confirmLabel="Send the quote"
        pending={pending}
        onConfirm={() =>
          run(() => sendQuote(quote.id), {
            success: (data) =>
              data?.emailed
                ? "Sent."
                : "Marked as sent, but the email could not be sent. Copy the link and send it yourself.",
            onSuccess: () => {
              setSending(false);
              router.refresh();
            },
          })
        }
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this draft?"
        description="It was never sent, so nothing is lost but the draft."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => deleteQuote(quote.id), {
            success: "Deleted.",
            onSuccess: () => router.push(`/dashboard/crm/deals/${quote.dealId}`),
          })
        }
      />
    </>
  );
}

/** The client's private link. It is only shown to staff who may send quotes. */
function CopyLink({ quoteId }: { quoteId: string }) {
  const canSend = useCan("quotes:send");
  const { run, pending } = useServerAction();
  if (!canSend) return null;
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => quoteLinkFor(quoteId), {
          onSuccess: (data) => {
            if (data?.link)
              void navigator.clipboard
                .writeText(data.link)
                .then(() => toast.success("Link copied."));
          },
        })
      }
    >
      <Copy aria-hidden="true" /> Copy the client&apos;s link
    </Button>
  );
}
