"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSync, Pause, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogBody,
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
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor, minorToInput } from "@/lib/money";
import {
  deleteRecurring,
  runRecurringNow,
  saveRecurring,
  setRecurringActive,
} from "../actions/recurring";
import type { BillAccount } from "../types/payables";
import {
  FREQUENCIES,
  FREQUENCY_LABEL,
  RECURRING_KINDS,
  RECURRING_KIND_LABEL,
  type Frequency,
  type RecurringKind,
} from "../rules/recurring";
import type { RecurringItemView } from "../repository/recurring";

interface Draft {
  id?: string;
  kind: RecurringKind;
  name: string;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  vendorId: string;
  payee: string;
  description: string;
  accountId: string;
  amount: string;
  paidFromAccountId: string;
}

/** Rent, hosting and subscriptions that come round again: each makes a draft when its date arrives. */
export function RecurringView({
  items,
  vendors,
  costAccounts,
  paidFromAccounts,
  today,
}: {
  items: RecurringItemView[];
  vendors: { id: string; name: string }[];
  costAccounts: BillAccount[];
  paidFromAccounts: BillAccount[];
  today: string;
}) {
  const router = useRouter();
  const canEdit = useCan("payables:create");
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<RecurringItemView | null>(null);

  const blank = (): Draft => ({
    kind: "bill",
    name: "",
    frequency: "monthly",
    startDate: today,
    endDate: "",
    vendorId: "",
    payee: "",
    description: "",
    accountId: "",
    amount: "",
    paidFromAccountId:
      (paidFromAccounts.find((a) => a.systemKey === "bank") ?? paidFromAccounts[0])?.id ?? "",
  });

  const add = (
    <Button
      onClick={() => {
        setErrors({});
        setDraft(blank());
      }}
    >
      <Plus aria-hidden="true" /> New recurring item
    </Button>
  );

  const due = items.filter((item) => item.active && item.nextDate <= today).length;
  const costLabel = (id: string) => costAccounts.find((a) => a.id === id);
  const sourceLabel = (id: string) => paidFromAccounts.find((a) => a.id === id);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(
      () =>
        saveRecurring({
          id: draft.id,
          kind: draft.kind,
          name: draft.name,
          frequency: draft.frequency,
          startDate: draft.startDate,
          endDate: draft.endDate,
          vendorId: draft.vendorId || null,
          payee: draft.payee,
          description: draft.description,
          accountId: draft.accountId,
          amount: draft.amount,
          paidFromAccountId: draft.paidFromAccountId,
        }),
      {
        success: draft.id ? "Updated." : "Set up. It makes its first one on the date you chose.",
        onSuccess: () => {
          setDraft(null);
          router.refresh();
        },
        onFieldErrors: setErrors,
      },
    );
  }

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {due > 0 && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => runRecurringNow(), {
                  success: (data) =>
                    `Made ${data?.bills ?? 0} draft ${data?.bills === 1 ? "bill" : "bills"} and ${data?.expenses ?? 0} ${data?.expenses === 1 ? "expense" : "expenses"}.`,
                  onSuccess: () => router.refresh(),
                })
              }
            >
              <Zap aria-hidden="true" /> Make the {due} that {due === 1 ? "is" : "are"} due
            </Button>
          )}
          {items.length > 0 && add}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState
              icon={CalendarSync}
              title="Nothing recurring yet"
              description="Rent, hosting and subscriptions come round again. Set one up and a draft is made each time, ready for you to check."
              action={canEdit ? add : undefined}
            />
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {item.name}
                      <StatusBadge tone="info">{RECURRING_KIND_LABEL[item.kind]}</StatusBadge>
                      {!item.active && <StatusBadge tone="neutral">Paused</StatusBadge>}
                    </p>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {FREQUENCY_LABEL[item.frequency]} ·{" "}
                      {item.kind === "bill" ? item.vendorName : item.payee} · {item.accountName}
                      {item.active ? ` · next ${formatDate(item.nextDate)}` : ""}
                      {item.endDate ? ` · until ${formatDate(item.endDate)}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">{formatMinor(item.amountMinor)}</p>
                    <p className="text-muted-foreground text-xs">{item.createdCount} made</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => {
                          setErrors({});
                          setDraft({
                            id: item.id,
                            kind: item.kind,
                            name: item.name,
                            frequency: item.frequency,
                            startDate: item.nextDate,
                            endDate: item.endDate ?? "",
                            vendorId: item.vendorId ?? "",
                            payee: item.payee ?? "",
                            description: item.description,
                            accountId: item.accountId,
                            amount: minorToInput(item.amountMinor),
                            paidFromAccountId: item.paidFromAccountId ?? "",
                          });
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${item.active ? "Pause" : "Resume"} ${item.name}`}
                        disabled={pending}
                        onClick={() =>
                          run(() => setRecurringActive({ id: item.id, active: !item.active }), {
                            success: item.active ? "Paused." : "Resumed.",
                            onSuccess: () => router.refresh(),
                          })
                        }
                      >
                        {item.active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setRemoving(item)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        description="No more will be made. What it already made stays where it is."
        confirmLabel="Remove"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => deleteRecurring(removing.id), {
            success: "Removed.",
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          })
        }
      />

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable className="sm:max-w-xl">
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit recurring item" : "New recurring item"}</DialogTitle>
                <DialogDescription>
                  Each time its date arrives a draft is made for you to check. Nothing reaches the
                  books until someone approves it.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <Field id="rec-kind" label="What it makes">
                    <Select
                      value={draft.kind}
                      disabled={!!draft.id}
                      onValueChange={(next) => setDraft({ ...draft, kind: next as RecurringKind })}
                    >
                      <SelectTrigger id="rec-kind" className="w-full">
                        <SelectValue>
                          {(value: RecurringKind) => RECURRING_KIND_LABEL[value]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {RECURRING_KIND_LABEL[kind]}
                            {kind === "bill" ? " from a supplier" : " to approve"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="rec-name" label="Name" required error={errors.name}>
                    <Input
                      id="rec-name"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      aria-invalid={!!errors.name}
                      placeholder="Office rent"
                    />
                  </Field>
                  <Field id="rec-frequency" label="How often">
                    <Select
                      value={draft.frequency}
                      onValueChange={(next) => setDraft({ ...draft, frequency: next as Frequency })}
                    >
                      <SelectTrigger id="rec-frequency" className="w-full">
                        <SelectValue>{(value: Frequency) => FREQUENCY_LABEL[value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((frequency) => (
                          <SelectItem key={frequency} value={frequency}>
                            {FREQUENCY_LABEL[frequency]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="rec-amount" label="Amount (₱)" required error={errors.amount}>
                    <Input
                      id="rec-amount"
                      inputMode="decimal"
                      value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                      aria-invalid={!!errors.amount}
                      className="tabular-nums"
                    />
                  </Field>
                  <Field
                    id="rec-start"
                    label={draft.id ? "Next date" : "First date"}
                    required
                    error={errors.startDate}
                  >
                    <DatePicker
                      id="rec-start"
                      value={draft.startDate}
                      onChange={(value) => setDraft({ ...draft, startDate: value })}
                    />
                  </Field>
                  <Field
                    id="rec-end"
                    label="Last date"
                    hint="Leave empty to keep going."
                    error={errors.endDate}
                  >
                    <DatePicker
                      id="rec-end"
                      value={draft.endDate}
                      onChange={(value) => setDraft({ ...draft, endDate: value })}
                    />
                  </Field>
                </div>

                {draft.kind === "bill" ? (
                  <Field id="rec-vendor" label="Supplier" required error={errors.vendorId}>
                    <Select
                      value={draft.vendorId}
                      onValueChange={(next) => setDraft({ ...draft, vendorId: String(next) })}
                    >
                      <SelectTrigger id="rec-vendor" className="w-full">
                        <SelectValue placeholder="Choose a supplier">
                          {vendors.find((v) => v.id === draft.vendorId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <Field id="rec-payee" label="Paid to" required error={errors.payee}>
                      <Input
                        id="rec-payee"
                        value={draft.payee}
                        onChange={(event) => setDraft({ ...draft, payee: event.target.value })}
                        aria-invalid={!!errors.payee}
                      />
                    </Field>
                    <Field
                      id="rec-paid-from"
                      label="Paid from"
                      required
                      error={errors.paidFromAccountId}
                    >
                      <Select
                        value={draft.paidFromAccountId}
                        onValueChange={(next) =>
                          setDraft({ ...draft, paidFromAccountId: String(next) })
                        }
                      >
                        <SelectTrigger id="rec-paid-from" className="w-full">
                          <SelectValue placeholder="Where the money comes from">
                            {sourceLabel(draft.paidFromAccountId)
                              ? `${sourceLabel(draft.paidFromAccountId)!.code} ${sourceLabel(draft.paidFromAccountId)!.name}`
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {paidFromAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}

                <Field
                  id="rec-description"
                  label="What it is for"
                  required
                  error={errors.description}
                >
                  <Input
                    id="rec-description"
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    aria-invalid={!!errors.description}
                  />
                </Field>
                <Field id="rec-account" label="Category" required error={errors.accountId}>
                  <Select
                    value={draft.accountId}
                    onValueChange={(next) => setDraft({ ...draft, accountId: String(next) })}
                  >
                    <SelectTrigger id="rec-account" className="w-full">
                      <SelectValue placeholder="Choose a category">
                        {costLabel(draft.accountId)
                          ? `${costLabel(draft.accountId)!.code} ${costLabel(draft.accountId)!.name}`
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {costAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !draft.name.trim()}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
