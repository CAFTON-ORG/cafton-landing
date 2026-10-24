"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, RotateCcw, ThumbsDown, Trash2, Trophy } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { minorToInput } from "@/lib/money";
import { deleteDeal, loseDeal, reopenDeal, winDeal } from "../actions/deals";
import { checkDealDelete, checkReopenDeal } from "../rules/core";
import type { DealView, PersonRef } from "../types/core";
import { DealDialog } from "./deal-dialog";

export function DealActions({
  deal,
  contacts,
  organizations,
  people,
  winBlocked = null,
  reopenBlocked: reopenBlockedByContract = null,
}: {
  deal: DealView;
  contacts: PersonRef[];
  organizations: PersonRef[];
  people: PersonRef[];
  /** Why the deal can't be won yet (an offer is still out), or null. */
  winBlocked?: string | null;
  /** Why a closed deal can't be reopened (a signed contract), or null. */
  reopenBlocked?: string | null;
}) {
  const router = useRouter();
  const canUpdate = useCan("deals:update");
  const canClose = useCan("deals:close");
  const canDelete = useCan("deals:delete");
  const { run, pending } = useServerAction();

  const [dialog, setDialog] = useState<"win" | "lose" | "delete" | null>(null);
  const [amount, setAmount] = useState(minorToInput(deal.amountMinor, deal.currency));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const state = { stageKind: deal.stageKind, amountMinor: deal.amountMinor };
  const reopenBlocked = checkReopenDeal(state) ?? reopenBlockedByContract;
  const deleteBlocked = checkDealDelete(state);

  function close() {
    setDialog(null);
    setErrors({});
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canClose && deal.stageKind === "open" && (
          <>
            <Button disabled={pending || !!winBlocked} onClick={() => setDialog("win")}>
              <Trophy aria-hidden="true" /> Mark as won
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => setDialog("lose")}>
              <ThumbsDown aria-hidden="true" /> Mark as lost
            </Button>
          </>
        )}
        {canClose && deal.stageKind !== "open" && (
          <Button
            variant="outline"
            disabled={!!reopenBlocked || pending}
            title={reopenBlocked ?? undefined}
            onClick={() => run(() => reopenDeal(deal.id), { success: "Deal reopened." })}
          >
            <RotateCcw aria-hidden="true" /> Reopen
          </Button>
        )}
        {canUpdate && (
          <DealDialog
            deal={deal}
            contacts={contacts}
            organizations={organizations}
            people={people}
            trigger={
              <Button variant="outline">
                <Pencil aria-hidden="true" /> Edit
              </Button>
            }
          />
        )}
        {canDelete && (
          <Button
            variant="ghost"
            disabled={!!deleteBlocked || pending}
            title={deleteBlocked ?? undefined}
            onClick={() => setDialog("delete")}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        )}
      </div>

      {canClose && deal.stageKind === "open" && winBlocked && (
        <p className="text-muted-foreground mt-2 max-w-md text-sm">{winBlocked}</p>
      )}
      {canClose && deal.stageKind !== "open" && reopenBlocked && (
        <p className="text-muted-foreground mt-2 max-w-md text-sm">{reopenBlocked}</p>
      )}

      <Dialog open={dialog === "win"} onOpenChange={(open) => !open && !pending && close()}>
        <DialogContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              run(() => winDeal(deal.id, amount), {
                success: "Deal won. Congratulations!",
                onSuccess: close,
                onFieldErrors: setErrors,
              });
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>Mark as won</DialogTitle>
              <DialogDescription>
                Confirm the final value. It&rsquo;s locked once the deal is won.
              </DialogDescription>
            </DialogHeader>
            <Field
              id="win-amount"
              label="Final value (₱)"
              required
              error={errors.amount ?? errors.form}
            >
              <Input
                id="win-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={!!errors.amount}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Mark as won"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "lose"} onOpenChange={(open) => !open && !pending && close()}>
        <DialogContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              run(() => loseDeal(deal.id, reason), {
                success: "Deal marked as lost.",
                onSuccess: () => {
                  close();
                  setReason("");
                },
                onFieldErrors: setErrors,
              });
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>Mark as lost</DialogTitle>
              <DialogDescription>
                Open tasks on this deal are completed. You can reopen it later.
              </DialogDescription>
            </DialogHeader>
            <Field
              id="lose-reason"
              label="Why was it lost?"
              required
              error={errors.form ?? errors.reason}
            >
              <Textarea
                id="lose-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Chose a cheaper competitor"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Saving…" : "Mark as lost"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && close()}
        title="Delete this deal?"
        description={`${deal.reference} will be removed from the pipeline.`}
        confirmLabel="Delete deal"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => deleteDeal(deal.id), {
            success: "Deal deleted.",
            onSuccess: () => {
              close();
              router.push("/dashboard/crm/deals");
            },
          })
        }
      />
    </div>
  );
}
