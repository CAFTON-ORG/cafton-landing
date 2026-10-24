"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Percent, Plus } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { saveTaxRate } from "../actions/books";
import { rateText } from "../rules/core";
import type { TaxRateView } from "../types/core";

const KIND_LABEL = {
  vat: "VAT",
  percentage: "Percentage tax",
  withholding: "Withholding",
} as const;
type Kind = keyof typeof KIND_LABEL;

interface Draft {
  id?: string;
  code: string;
  name: string;
  rate: string;
  kind: Kind;
  active: boolean;
}
const blank: Draft = { code: "", name: "", rate: "", kind: "vat", active: true };

/** The tax rates documents can use. This business is on the 8% income tax option, so VAT is off by default. */
export function TaxRatesView({ rates }: { rates: TaxRateView[] }) {
  const router = useRouter();
  const canManage = useCan("finance:manage");
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = (
    <Button
      onClick={() => {
        setErrors({});
        setDraft(blank);
      }}
    >
      <Plus aria-hidden="true" /> Add a rate
    </Button>
  );

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(() => saveTaxRate(draft), {
      success: draft.id ? "Rate updated." : "Rate added.",
      onSuccess: () => {
        setDraft(null);
        router.refresh();
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <>
      {canManage && rates.length > 0 && <div className="mb-4 flex justify-end">{add}</div>}
      <Card>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <EmptyState
              icon={Percent}
              title="No tax rates yet"
              description="Add the rates your documents can use."
              action={canManage ? add : undefined}
            />
          ) : (
            <ul className="divide-y">
              {rates.map((rate) => (
                <li key={rate.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="text-muted-foreground w-20 shrink-0 text-sm tabular-nums">
                    {rate.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {rate.name}
                      {!rate.active && <StatusBadge tone="neutral">Switched off</StatusBadge>}
                    </p>
                    <p className="text-muted-foreground text-xs">{KIND_LABEL[rate.kind]}</p>
                  </div>
                  <span className="text-sm tabular-nums">{rateText(rate.rateBp)}</span>
                  {canManage && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${rate.name}`}
                      onClick={() => {
                        setErrors({});
                        setDraft({
                          id: rate.id,
                          code: rate.code,
                          name: rate.name,
                          rate: String(rate.rateBp / 100),
                          kind: rate.kind,
                          active: rate.active,
                        });
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit tax rate" : "Add a tax rate"}</DialogTitle>
                <DialogDescription>
                  Documents that have already used a rate keep the amounts they were made with.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="rate-code" label="Code" required error={errors.code}>
                    <Input
                      id="rate-code"
                      value={draft.code}
                      onChange={(event) =>
                        setDraft({ ...draft, code: event.target.value.toUpperCase() })
                      }
                      aria-invalid={!!errors.code}
                      placeholder="VAT12"
                    />
                  </Field>
                  <Field id="rate-rate" label="Rate (%)" required error={errors.rate}>
                    <Input
                      id="rate-rate"
                      inputMode="decimal"
                      value={draft.rate}
                      onChange={(event) => setDraft({ ...draft, rate: event.target.value })}
                      aria-invalid={!!errors.rate}
                      placeholder="12"
                    />
                  </Field>
                </div>
                <Field id="rate-name" label="Name" required error={errors.name}>
                  <Input
                    id="rate-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    aria-invalid={!!errors.name}
                    autoComplete="off"
                  />
                </Field>
                <Field id="rate-kind" label="Kind">
                  <Select
                    value={draft.kind}
                    onValueChange={(next) => setDraft({ ...draft, kind: next as Kind })}
                  >
                    <SelectTrigger id="rate-kind" className="w-full">
                      <SelectValue>{(value: Kind) => KIND_LABEL[value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_LABEL) as Kind[]).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {KIND_LABEL[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={draft.active}
                    onCheckedChange={(checked) => setDraft({ ...draft, active: checked === true })}
                  />
                  Available on new documents
                </label>
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
                <Button
                  type="submit"
                  disabled={
                    pending || !draft.code.trim() || !draft.name.trim() || !draft.rate.trim()
                  }
                >
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
