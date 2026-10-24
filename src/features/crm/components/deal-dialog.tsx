"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { minorToInput } from "@/lib/money";
import { createDeal, updateDeal } from "../actions/deals";
import { checkEditAmount } from "../rules/core";
import type { DealView, PersonRef } from "../types";
import { PersonSelect } from "./owner-select";

/** Create (no `deal`) or edit a deal. */
export function DealDialog({
  deal,
  contacts,
  organizations,
  people,
  trigger,
  defaultContactId,
  pipelines = [],
  defaultPipelineId,
}: {
  deal?: DealView;
  contacts: PersonRef[];
  organizations: PersonRef[];
  people: PersonRef[];
  trigger: ReactNode;
  defaultContactId?: string;
  /** The pipelines to choose from when making a deal (only shown when there is more than one). */
  pipelines?: { id: string; name: string }[];
  defaultPipelineId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();
  const initial = {
    title: deal?.title ?? "",
    contactId: deal?.contactId ?? defaultContactId ?? "",
    organizationId: deal?.organizationId ?? "",
    ownerId: deal?.ownerId ?? "",
    pipelineId: defaultPipelineId ?? "",
    amount: minorToInput(deal?.amountMinor ?? null, deal?.currency),
    expectedCloseDate: deal?.expectedCloseDate ?? "",
    description: deal?.description ?? "",
  };
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof initial) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const input = (key: keyof typeof initial) => ({
    id: `deal-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(event.target.value),
    "aria-invalid": !!errors[key],
  });
  const amountLocked = deal
    ? checkEditAmount({ stageKind: deal.stageKind, amountMinor: deal.amountMinor })
    : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const payload = {
      ...values,
      organizationId: values.organizationId || "none",
      ownerId: values.ownerId || "none",
      pipelineId: values.pipelineId || "none",
    };
    run(() => (deal ? updateDeal(deal.id, payload) : createDeal(payload)), {
      success: deal ? "Deal updated." : "Deal created.",
      onSuccess: (data) => {
        setOpen(false);
        if (!deal) {
          setValues(initial);
          const created = data as { id: string } | undefined;
          if (created?.id) router.push(`/dashboard/crm/deals/${created.id}`);
        }
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setValues(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{deal ? "Edit deal" : "New deal"}</DialogTitle>
            <DialogDescription>
              {deal
                ? "Stage changes happen on the deal page."
                : "New deals start in the first stage of the pipeline."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="deal-title" label="Title" required error={errors.title}>
              <Input
                {...input("title")}
                autoComplete="off"
                placeholder="e.g. Inventory system for Acme"
              />
            </Field>
            {!deal && pipelines.length > 1 && (
              <Field
                id="deal-pipelineId"
                label="Pipeline"
                hint="Where the deal starts: the first stage of this pipeline."
              >
                <Select
                  value={values.pipelineId || pipelines[0].id}
                  onValueChange={(value) => set("pipelineId")(String(value))}
                >
                  <SelectTrigger id="deal-pipelineId" className="w-full">
                    <SelectValue>
                      {(value: string) => pipelines.find((p) => p.id === value)?.name ?? ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field id="deal-contactId" label="Contact" required error={errors.contactId}>
              <PersonSelect
                id="deal-contactId"
                value={values.contactId}
                onChange={set("contactId")}
                people={contacts}
                noneLabel="Choose a contact"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="deal-organizationId"
                label="Organization"
                hint="Defaults to the contact's."
              >
                <PersonSelect
                  id="deal-organizationId"
                  value={values.organizationId}
                  onChange={set("organizationId")}
                  people={organizations}
                  noneLabel="None"
                />
              </Field>
              <Field
                id="deal-ownerId"
                label="Owner"
                hint="The teammate who is responsible for winning this deal."
              >
                <PersonSelect
                  id="deal-ownerId"
                  value={values.ownerId}
                  onChange={set("ownerId")}
                  people={people}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="deal-amount"
                label="Value (₱)"
                error={errors.amount}
                hint={amountLocked ?? "Estimated now, final when the deal is won."}
              >
                <Input
                  {...input("amount")}
                  inputMode="decimal"
                  placeholder="e.g. 250,000"
                  disabled={!!amountLocked}
                />
              </Field>
              <Field
                id="deal-expectedCloseDate"
                label="Expected close"
                error={errors.expectedCloseDate}
              >
                <DatePicker
                  id="deal-expectedCloseDate"
                  value={values.expectedCloseDate}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, expectedCloseDate: value }))
                  }
                  clearable
                />
              </Field>
            </div>
            <Field id="deal-description" label="Description" error={errors.description}>
              <Textarea {...input("description")} rows={4} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : deal ? "Save changes" : "Create deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
