"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Copy,
  Download,
  FilePlus2,
  Plus,
  Send,
  Trash2,
  Trophy,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { PresetSelect } from "@/components/dashboard/shared/preset-select";
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
import { quoteTaxChoices } from "@/features/finance/settings";
import { formatDate } from "@/lib/format";
import { formatMinor, minorToInput, parseMinor } from "@/lib/money";
import { addDays, manilaDate } from "@/features/schedule/slots";
import {
  approveQuote,
  deleteQuote,
  rejectQuote,
  renewQuoteLink,
  withdrawQuote,
  reviseQuote,
  saveQuote,
  sendQuote,
  submitQuote,
} from "../actions/quotes";
import {
  DEPOSITS,
  DISCOUNTS,
  PAYMENT_WORDINGS,
  UNITS,
  VALID_FOR_DAYS,
  discountLabel,
  type PaymentWording,
} from "../options";
import { lineTotal, parseQuantity, quantityText, quoteTotals } from "../pricing";
import { approvalReasons, canEdit, checkWithdraw } from "../rules";
import type { CatalogItemView, QuoteView } from "../types";
import { QuoteHistory } from "./quote-history";
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
export function QuoteEditor({
  quote,
  catalog,
  vatRatePct = 12,
}: {
  quote: QuoteView;
  catalog: CatalogItemView[];
  /** The VAT rate of the business, for the tax choice. */
  vatRatePct?: number;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const canUpdate = useCan("quotes:update");
  const canCreate = useCan("quotes:create");
  const canApprove = useCan("quotes:approve");
  const canSend = useCan("quotes:send");
  const canDelete = useCan("quotes:delete");

  const editable = canEdit(quote.status) && canUpdate && quote.isLatest;

  /** Fills the payment terms; asks first when that would overwrite what someone typed. */
  function applyWording(index: string) {
    const wording = PAYMENT_WORDINGS[Number(index)];
    if (!wording) return;
    const typed = values.paymentTerms.trim();
    if (typed && typed !== wording.text) setPendingWording(wording);
    else setValues((c) => ({ ...c, paymentTerms: wording.text }));
  }
  const initial = useMemo(
    () => ({
      title: quote.title,
      intro: quote.intro ?? "",
      terms: quote.terms ?? "",
      paymentTerms: quote.paymentTerms ?? "",
      depositPct: String(quote.depositPct),
      taxRatePct: String(quote.taxRatePct),
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
  const [pendingWording, setPendingWording] = useState<PaymentWording | null>(null);
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
    ? quoteTotals(shown as ReturnType<typeof priced>[], Number(values.taxRatePct) || 0)
    : {
        subtotalMinor: quote.subtotalMinor,
        taxMinor: quote.taxMinor,
        totalMinor: quote.totalMinor,
      };

  const shownTaxPct = editable ? Number(values.taxRatePct) || 0 : quote.taxRatePct;

  function save() {
    setErrors({});
    run(
      () =>
        saveQuote(quote.id, {
          title: values.title,
          intro: values.intro,
          terms: values.terms,
          paymentTerms: values.paymentTerms,
          depositPct: Number(values.depositPct) || 0,
          taxRatePct: Number(values.taxRatePct) || 0,
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

  // The same rules the server applies, so the person sees what will happen before they press.
  const reasons = approvalReasons({
    totalMinor: totals.totalMinor,
    maxDiscountPct: shown.reduce((max, line) => Math.max(max, line.discountPct), 0),
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
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
                      {reasons.length > 0 ? "Submit for approval" : "Finish and approve"}
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
                    {!checkWithdraw(next, "x") && canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setWithdrawing(true)}
                      >
                        <Ban aria-hidden="true" /> Withdraw this quote
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
                  {quote.status === "sent" && canSend && <NewLink quoteId={quote.id} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuoteHistory quote={quote} />
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
                Prices are in {quote.currency}.{" "}
                {shownTaxPct > 0
                  ? `VAT of ${shownTaxPct}% is added to the lines marked VAT.`
                  : "No VAT is charged on this quote."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-3">
              {(editable ? values.lines : []).map((line, index) => {
                const error = lineError(index);
                const label = "text-muted-foreground mb-1 block text-xs";
                return (
                  <div key={line.key} className="grid gap-3 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Textarea
                        rows={2}
                        className="min-w-0 flex-1"
                        aria-label={`Line ${index + 1} description`}
                        value={line.description}
                        aria-invalid={!!errors[`lines.${index}.description`]}
                        onChange={(event) => setLine(line.key, { description: event.target.value })}
                        placeholder="What is being sold"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
                      <label className="min-w-0">
                        <span className={label}>Qty</span>
                        <Input
                          inputMode="decimal"
                          value={line.quantity}
                          aria-invalid={!!errors[`lines.${index}.quantity`]}
                          onChange={(event) => setLine(line.key, { quantity: event.target.value })}
                        />
                      </label>
                      <label className="min-w-0">
                        <span className={label}>Unit</span>
                        <PresetSelect
                          label={`Line ${index + 1} unit`}
                          value={line.unitLabel}
                          options={UNITS}
                          onChange={(value) => setLine(line.key, { unitLabel: value })}
                        />
                      </label>
                      <label className="min-w-0">
                        <span className={label}>Price ({quote.currency})</span>
                        <Input
                          inputMode="decimal"
                          value={line.price}
                          placeholder="0.00"
                          aria-invalid={!!errors[`lines.${index}.price`]}
                          onChange={(event) => setLine(line.key, { price: event.target.value })}
                        />
                      </label>
                      <label className="min-w-0">
                        <span className={label}>Discount (%)</span>
                        <PresetSelect
                          label={`Line ${index + 1} discount`}
                          value={line.discountPct}
                          options={DISCOUNTS}
                          optionLabel={discountLabel}
                          onChange={(value) => setLine(line.key, { discountPct: value })}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
                      <label className="flex min-h-6 items-center gap-2">
                        <Checkbox
                          checked={line.taxable}
                          onCheckedChange={(checked) =>
                            setLine(line.key, { taxable: checked === true })
                          }
                        />
                        Add VAT
                      </label>
                      <span>
                        <span className="text-muted-foreground">Line total </span>
                        <span className="font-medium tabular-nums">
                          {formatMinor(lineTotal(priced(line)), quote.currency)}
                        </span>
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

              <div className="ml-auto grid w-full max-w-xs gap-2 border-t pt-3">
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatMinor(totals.subtotalMinor, quote.currency)}
                    </dd>
                  </div>
                  {shownTaxPct > 0 && (
                    <div className="flex justify-between">
                      <dt>VAT ({shownTaxPct}%)</dt>
                      <dd className="tabular-nums">
                        {formatMinor(totals.taxMinor, quote.currency)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 text-base font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">
                      {formatMinor(totals.totalMinor, quote.currency)}
                    </dd>
                  </div>
                </dl>
                {reasons.length > 0 && (
                  <p className="pt-1 text-xs text-amber-800 dark:text-amber-300">
                    A second person approves this before it can be sent. {reasons.join(" ")}
                  </p>
                )}
              </div>
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
                hint="What is included, and anything else the client should know."
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

          <Card>
            <CardHeader>
              <CardTitle>Payment and validity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div
                className={`grid items-start gap-4 ${editable ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
              >
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
                    <Input
                      id="quote-valid"
                      readOnly
                      value={quote.validUntil ? formatDate(quote.validUntil) : "No end date"}
                    />
                  )}
                </Field>
                {editable && (
                  <Field id="quote-valid-for" label="Or valid for" hint="Counted from today.">
                    <Select
                      value=""
                      onValueChange={(days) =>
                        days &&
                        setValues((c) => ({
                          ...c,
                          validUntil: addDays(manilaDate(new Date()), Number(days)),
                        }))
                      }
                    >
                      <SelectTrigger id="quote-valid-for" className="w-full">
                        <SelectValue placeholder="Pick a length…" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_FOR_DAYS.map((days) => (
                          <SelectItem key={days} value={String(days)}>
                            {days} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field id="quote-tax" label="Tax" hint="Add VAT, or charge none.">
                  {editable ? (
                    <Select
                      value={values.taxRatePct}
                      onValueChange={(value) =>
                        setValues((c) => ({ ...c, taxRatePct: String(value) }))
                      }
                    >
                      <SelectTrigger id="quote-tax" className="w-full">
                        <SelectValue>
                          {(value: string) =>
                            quoteTaxChoices(vatRatePct, quote.taxRatePct).find(
                              (choice) => String(choice.pct) === value,
                            )?.label ?? value
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {quoteTaxChoices(vatRatePct, quote.taxRatePct).map((choice) => (
                          <SelectItem key={choice.pct} value={String(choice.pct)}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="quote-tax"
                      readOnly
                      value={quote.taxRatePct > 0 ? `VAT ${quote.taxRatePct}% added` : "No VAT"}
                    />
                  )}
                </Field>
                <Field
                  id="quote-deposit"
                  label="Deposit (%)"
                  error={errors.depositPct}
                  hint="Due when it is accepted."
                >
                  {editable ? (
                    <PresetSelect
                      id="quote-deposit"
                      label="Deposit"
                      value={values.depositPct}
                      options={DEPOSITS}
                      onChange={(value) => setValues((c) => ({ ...c, depositPct: value }))}
                    />
                  ) : (
                    <Input id="quote-deposit" readOnly value={`${quote.depositPct}%`} />
                  )}
                </Field>
              </div>
              <Field id="quote-payment" label="Payment terms" error={errors.paymentTerms}>
                {editable && (
                  <Select value="" onValueChange={(index) => index && applyWording(String(index))}>
                    <SelectTrigger aria-label="Use a standard wording" className="w-full">
                      <SelectValue placeholder="Use a standard wording…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_WORDINGS.map(({ name }, index) => (
                        <SelectItem key={name} value={String(index)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Textarea
                  id="quote-payment"
                  rows={3}
                  value={editable ? values.paymentTerms : (quote.paymentTerms ?? "")}
                  readOnly={!editable}
                  onChange={(event) =>
                    setValues((c) => ({ ...c, paymentTerms: event.target.value }))
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </EditorLayout>
      </form>

      <Dialog open={withdrawing} onOpenChange={(open) => !pending && setWithdrawing(open)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => withdrawQuote(quote.id, withdrawReason), {
                success: "Withdrawn.",
                onSuccess: () => {
                  setWithdrawing(false);
                  setWithdrawReason("");
                  router.refresh();
                },
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Withdraw this quote?</DialogTitle>
              <DialogDescription>
                The client can no longer accept it, and their link says it was withdrawn. This
                can&apos;t be undone; make a new quote if you want to offer again.
              </DialogDescription>
            </DialogHeader>
            <Field id="withdraw-reason" label="Why?" required>
              <Textarea
                id="withdraw-reason"
                rows={3}
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawing(false)}
                disabled={pending}
              >
                Keep it
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || !withdrawReason.trim()}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
        open={pendingWording !== null}
        onOpenChange={(open) => !open && setPendingWording(null)}
        title="Replace the payment terms?"
        description={`What is written in the payment terms now will be replaced with "${pendingWording?.name ?? ""}". You can still edit it afterwards.`}
        confirmLabel="Replace"
        onConfirm={() => {
          if (pendingWording) setValues((c) => ({ ...c, paymentTerms: pendingWording.text }));
          setPendingWording(null);
        }}
      />

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

/**
 * Only a hash of the client's link is kept, so it can't be read back. This makes a new link, copies
 * it, and the old one stops working at once.
 */
function NewLink({ quoteId }: { quoteId: string }) {
  const { run, pending } = useServerAction();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      title="Makes a new link and copies it. The old link stops working."
      onClick={() =>
        run(() => renewQuoteLink(quoteId), {
          onSuccess: (data) => {
            if (data?.link)
              void navigator.clipboard
                .writeText(data.link)
                .then(() => toast.success("New link copied. The old one no longer works."));
          },
        })
      }
    >
      <Copy aria-hidden="true" /> Copy a new client link
    </Button>
  );
}
