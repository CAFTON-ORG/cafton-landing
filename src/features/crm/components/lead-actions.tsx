"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CircleCheck, CircleX, RotateCcw, Trash2 } from "lucide-react";

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
import {
  assignLead,
  convertLead,
  deleteLead,
  disqualifyLead,
  qualifyLead,
  reopenLead,
} from "../actions/leads";
import {
  checkConvert,
  checkDisqualify,
  checkLeadDelete,
  checkQualify,
  checkReopenLead,
} from "../rules/core";
import type { LeadView, PersonRef } from "../types/core";
import { Person } from "@/components/dashboard/shared/person";
import { PersonSelect } from "./owner-select";

export function LeadActions({ lead }: { lead: LeadView }) {
  const router = useRouter();
  const canUpdate = useCan("leads:update");
  const canConvert = useCan("leads:convert");
  const canDelete = useCan("leads:delete");
  const { run, pending } = useServerAction();

  const [dialog, setDialog] = useState<"disqualify" | "convert" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const qualifyBlocked = checkQualify(lead);
  const convertBlocked = checkConvert(lead);
  const reopenBlocked = checkReopenLead(lead);
  const deleteBlocked = checkLeadDelete(lead);

  function close() {
    setDialog(null);
    setErrors({});
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canConvert && (
          <Button
            disabled={!!convertBlocked || pending}
            title={convertBlocked ?? undefined}
            onClick={() => setDialog("convert")}
          >
            <ArrowRight aria-hidden="true" /> Convert to deal
          </Button>
        )}
        {canUpdate && (
          <>
            <Button
              variant="outline"
              disabled={!!qualifyBlocked || pending}
              title={qualifyBlocked ?? undefined}
              onClick={() => run(() => qualifyLead(lead.id), { success: "Lead qualified." })}
            >
              <CircleCheck aria-hidden="true" /> Qualify
            </Button>
            {lead.status === "disqualified" ? (
              <Button
                variant="outline"
                disabled={!!reopenBlocked || pending}
                onClick={() => run(() => reopenLead(lead.id), { success: "Lead reopened." })}
              >
                <RotateCcw aria-hidden="true" /> Reopen
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={!!checkDisqualify(lead, "x") || pending}
                title={checkDisqualify(lead, "x") ?? undefined}
                onClick={() => setDialog("disqualify")}
              >
                <CircleX aria-hidden="true" /> Disqualify
              </Button>
            )}
          </>
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

      <Dialog open={dialog === "disqualify"} onOpenChange={(open) => !open && !pending && close()}>
        <DialogContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              run(() => disqualifyLead(lead.id, reason), {
                success: "Lead disqualified.",
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
              <DialogTitle>Disqualify this lead?</DialogTitle>
              <DialogDescription>
                It stays in the list for reference. Open follow-ups are completed.
              </DialogDescription>
            </DialogHeader>
            <Field id="dq-reason" label="Reason" required error={errors.form ?? errors.reason}>
              <Textarea
                id="dq-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Budget far below our minimum"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Saving…" : "Disqualify"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "convert"} onOpenChange={(open) => !open && !pending && close()}>
        <DialogContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              run(() => convertLead(lead.id, { title, amount }), {
                success: "Lead converted. Opening the deal…",
                onSuccess: (data) => {
                  close();
                  if (data?.dealId) router.push(`/dashboard/crm/deals/${data.dealId}`);
                },
                onFieldErrors: setErrors,
              });
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>Convert to a deal</DialogTitle>
              <DialogDescription>
                Creates a contact{lead.businessName ? " and an organization" : ""} from this enquiry
                (an existing contact with the same email is reused) and opens a deal in the
                pipeline.
              </DialogDescription>
            </DialogHeader>
            <Field
              id="cv-title"
              label="Deal title"
              hint="Leave blank to use the business and area of interest."
              error={errors.title}
            >
              <Input
                id="cv-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field
              id="cv-amount"
              label="Estimated value (₱)"
              hint="Optional. You can set it later."
              error={errors.amount}
            >
              <Input
                id="cv-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 250,000"
                aria-invalid={!!errors.amount}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Converting…" : "Convert"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && close()}
        title="Delete this lead?"
        description={`${lead.reference} will be removed from the list.`}
        confirmLabel="Delete lead"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => deleteLead(lead.id), {
            success: "Lead deleted.",
            onSuccess: () => {
              close();
              router.push("/dashboard/crm/leads");
            },
          })
        }
      />
    </div>
  );
}

/** Who is responsible for the next step. Changing it saves straight away. */
export function LeadOwner({ lead, people }: { lead: LeadView; people: PersonRef[] }) {
  const canUpdate = useCan("leads:update");
  const { run, pending } = useServerAction();
  if (!canUpdate) {
    return <Person name={lead.ownerName} avatarUrl={lead.ownerAvatar} />;
  }
  return (
    <PersonSelect
      id="lead-owner"
      value={lead.ownerId ?? ""}
      people={people}
      disabled={pending}
      size="sm"
      aria-label="Owner"
      onChange={(ownerId) =>
        run(() => assignLead(lead.id, ownerId || null), { success: "Owner updated." })
      }
    />
  );
}
