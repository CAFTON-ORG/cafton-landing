"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flag, Pencil, Plus, Receipt, Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
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
import { Progress } from "@/components/dashboard/ui/progress";
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
import { formatMinor, minorToInput } from "@/lib/money";
import { deleteMilestone, saveMilestone, setMilestoneStatus } from "../actions/work";
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABEL,
  isOverdue,
  progressPercent,
  type MilestoneStatus,
} from "../rules";
import type { MilestoneView } from "../types";

interface Draft {
  id?: string;
  name: string;
  description: string;
  dueDate: string;
  billable: boolean;
  amount: string;
}
const blank: Draft = { name: "", description: "", dueDate: "", billable: false, amount: "" };

/** The stages of a project's delivery. A billable one, once done, is what the client gets invoiced for. */
export function MilestonesPanel({
  projectId,
  currency,
  milestones,
  today,
  open,
}: {
  projectId: string;
  currency: string;
  milestones: MilestoneView[];
  today: string;
  /** False when the project is closed: milestones can be read but not changed. */
  open: boolean;
}) {
  const router = useRouter();
  const canUpdate = useCan("projects:update") && open;
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<MilestoneView | null>(null);

  const billableTotal = milestones
    .filter((milestone) => milestone.billable)
    .reduce((sum, milestone) => sum + (milestone.amountMinor ?? 0), 0);

  function edit(milestone?: MilestoneView) {
    setErrors({});
    setDraft(
      milestone
        ? {
            id: milestone.id,
            name: milestone.name,
            description: milestone.description ?? "",
            dueDate: milestone.dueDate ?? "",
            billable: milestone.billable,
            amount: minorToInput(milestone.amountMinor ?? null, currency),
          }
        : blank,
    );
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(() => saveMilestone({ ...draft, projectId }), {
      success: draft.id ? "Milestone updated." : "Milestone added.",
      onSuccess: () => {
        setDraft(null);
        router.refresh();
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>
          Steps towards delivery.
          {billableTotal > 0 &&
            ` ${formatMinor(billableTotal, currency)} will be invoiced as they are finished.`}
        </CardDescription>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => edit()}>
              <Plus aria-hidden="true" /> Add milestone
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <EmptyState
            compact
            icon={Flag}
            title="No milestones yet"
            description="Break the project into steps the client can see, and mark the ones that trigger an invoice."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {milestones.map((milestone) => {
              const late = isOverdue(milestone.dueDate, today, milestone.status === "done");
              return (
                <li key={milestone.id} className="grid gap-2 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {milestone.name}
                        {milestone.billable && (
                          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-normal">
                            <Receipt className="size-3.5" aria-hidden="true" />
                            Invoices {formatMinor(milestone.amountMinor, currency)}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {milestone.dueDate ? (
                          <span className={late ? "text-destructive font-medium" : undefined}>
                            {late ? "Overdue · " : "Due "}
                            {formatDate(milestone.dueDate)}
                          </span>
                        ) : (
                          "No due date"
                        )}
                        {milestone.tasks.total > 0 &&
                          ` · ${milestone.tasks.done} of ${milestone.tasks.total} tasks done`}
                      </p>
                    </div>
                    {canUpdate ? (
                      <Select
                        value={milestone.status}
                        onValueChange={(next) =>
                          run(() => setMilestoneStatus(milestone.id, next as MilestoneStatus), {
                            onSuccess: () => router.refresh(),
                          })
                        }
                        disabled={pending}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Status of ${milestone.name}`}
                          className="w-36"
                        >
                          <SelectValue>
                            {(value: MilestoneStatus) => MILESTONE_STATUS_LABEL[value]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {MILESTONE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {MILESTONE_STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{MILESTONE_STATUS_LABEL[milestone.status]}</span>
                    )}
                    {canUpdate && (
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${milestone.name}`}
                          onClick={() => edit(milestone)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${milestone.name}`}
                          disabled={pending}
                          onClick={() => setRemoving(milestone)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {milestone.tasks.total > 0 && (
                    <Progress
                      value={progressPercent(milestone.tasks)}
                      aria-label={`${progressPercent(milestone.tasks)}% of ${milestone.name} done`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit milestone" : "Add a milestone"}</DialogTitle>
                <DialogDescription>
                  A billable milestone is what the client is invoiced for once it is done.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field id="milestone-name" label="Name" required error={errors.name}>
                  <Input
                    id="milestone-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    aria-invalid={!!errors.name}
                    autoComplete="off"
                  />
                </Field>
                <Field id="milestone-due" label="Due" error={errors.dueDate}>
                  <DatePicker
                    id="milestone-due"
                    value={draft.dueDate}
                    onChange={(value) => setDraft({ ...draft, dueDate: value })}
                    clearable
                  />
                </Field>
                <Field id="milestone-description" label="Description" error={errors.description}>
                  <Textarea
                    id="milestone-description"
                    rows={3}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox
                    checked={draft.billable}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, billable: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    Invoice the client when this is done
                    <span className="text-muted-foreground block text-xs">
                      The amounts of all billable milestones can&apos;t add up to more than the
                      price.
                    </span>
                  </span>
                </label>
                {draft.billable && (
                  <Field
                    id="milestone-amount"
                    label="Amount to invoice (₱)"
                    required
                    error={errors.amount}
                  >
                    <Input
                      id="milestone-amount"
                      inputMode="decimal"
                      value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                      aria-invalid={!!errors.amount}
                      placeholder="e.g. 50,000"
                    />
                  </Field>
                )}
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

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Delete ${removing?.name ?? "this milestone"}?`}
        description="Its tasks stay on the project, just not under a milestone."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => deleteMilestone(removing.id), {
            success: "Milestone deleted.",
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          })
        }
      />
    </Card>
  );
}
