"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
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
import { Switch } from "@/components/dashboard/ui/switch";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor, minorToInput } from "@/lib/money";
import { deleteBillingRate, saveBillingRate, saveFinanceSettings } from "../actions/settings";
import type { FinanceSettingsView } from "../rules/settings";
import type { BillingRateView } from "../repository/settings";

interface Choices {
  people: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

/** The finance settings: how tax starts on a quote, the usual payment terms, and what an hour is billed at. */
export function FinanceSettingsView({
  settings,
  rates,
  choices,
}: {
  settings: FinanceSettingsView;
  rates: BillingRateView[];
  choices: Choices;
}) {
  const router = useRouter();
  const canManage = useCan("finance:manage");
  const { run, pending } = useServerAction();
  const [vatRegistered, setVatRegistered] = useState(settings.vatRegistered);
  const [vatRate, setVatRate] = useState(String(settings.vatRatePct));
  const [terms, setTerms] = useState(String(settings.paymentTermsDays));
  const [instructions, setInstructions] = useState(settings.paymentInstructions);
  const [hourly, setHourly] = useState(
    settings.defaultHourlyRateMinor === null ? "" : minorToInput(settings.defaultHourlyRateMinor),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty =
    vatRegistered !== settings.vatRegistered ||
    vatRate !== String(settings.vatRatePct) ||
    terms !== String(settings.paymentTermsDays) ||
    instructions !== settings.paymentInstructions ||
    hourly !==
      (settings.defaultHourlyRateMinor === null
        ? ""
        : minorToInput(settings.defaultHourlyRateMinor));

  function save(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(
      () =>
        saveFinanceSettings({
          vatRegistered,
          vatRatePct: Number(vatRate),
          paymentTermsDays: Number(terms),
          paymentInstructions: instructions,
          defaultHourlyRate: hourly,
        }),
      {
        success: "Settings saved.",
        onSuccess: () => router.refresh(),
        onFieldErrors: setErrors,
      },
    );
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={save} noValidate className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tax</CardTitle>
            <CardDescription>
              Whether the business charges VAT decides what a new quote starts with. You can still
              change the tax on any quote while it is a draft.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <label htmlFor="vat-registered" className="text-sm font-medium">
                  The business is VAT-registered
                </label>
                <p className="text-muted-foreground text-xs">
                  Leave this off on the 8% income tax option: no VAT is added to quotes or invoices.
                </p>
              </div>
              <Switch
                id="vat-registered"
                checked={vatRegistered}
                disabled={!canManage}
                onCheckedChange={setVatRegistered}
              />
            </div>
            {vatRegistered && (
              <Field id="vat-rate" label="VAT rate (%)" error={errors.vatRatePct}>
                <Input
                  id="vat-rate"
                  inputMode="numeric"
                  value={vatRate}
                  disabled={!canManage}
                  onChange={(event) => setVatRate(event.target.value)}
                  aria-invalid={!!errors.vatRatePct}
                  className="max-w-32 tabular-nums"
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>What a new invoice starts with.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field
              id="terms"
              label="Payment terms (days)"
              hint="Days from the invoice date to the due date."
              error={errors.paymentTermsDays}
            >
              <Input
                id="terms"
                inputMode="numeric"
                value={terms}
                disabled={!canManage}
                onChange={(event) => setTerms(event.target.value)}
                aria-invalid={!!errors.paymentTermsDays}
                className="max-w-32 tabular-nums"
              />
            </Field>
            <Field
              id="instructions"
              label="How to pay"
              hint="Bank details or a GCash number, printed on every new invoice."
            >
              <Textarea
                id="instructions"
                rows={3}
                value={instructions}
                disabled={!canManage}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standard hourly rate</CardTitle>
            <CardDescription>
              What an hour of approved time is billed at when no rate is set for the person or the
              project. Without one, time can only be invoiced for people who have their own rate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field id="hourly" label="Rate per hour (₱)" error={errors.defaultHourlyRate}>
              <Input
                id="hourly"
                inputMode="decimal"
                value={hourly}
                disabled={!canManage}
                onChange={(event) => setHourly(event.target.value)}
                aria-invalid={!!errors.defaultHourlyRate}
                className="max-w-40 tabular-nums"
                placeholder="1,500.00"
              />
            </Field>
          </CardContent>
        </Card>

        {canManage && (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !dirty}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </form>

      <RatesCard rates={rates} choices={choices} standard={settings.defaultHourlyRateMinor} />
    </div>
  );
}

function RatesCard({
  rates,
  choices,
  standard,
}: {
  rates: BillingRateView[];
  choices: Choices;
  standard: number | null;
}) {
  const router = useRouter();
  const canManage = useCan("finance:manage");
  const { run, pending } = useServerAction();
  const [editing, setEditing] = useState<{
    id?: string;
    profileId: string;
    projectId: string;
    rate: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const personName = (id: string) => choices.people.find((p) => p.id === id)?.name;
  const projectName = (id: string) => choices.projects.find((p) => p.id === id)?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rates for a person or a project</CardTitle>
        <CardDescription>
          The most specific one wins: a person on a project, then a project, then a person, then the
          standard rate. Changing a rate affects invoices made from now on, not ones already made.
        </CardDescription>
        {canManage && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setErrors({});
                setEditing({ profileId: "none", projectId: "none", rate: "" });
              }}
            >
              <Plus aria-hidden="true" /> Add a rate
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {rates.length === 0 ? (
          <EmptyState
            compact
            title="No specific rates"
            description={
              standard === null
                ? "Set the standard rate above, or add a rate for someone."
                : `Everyone is billed at the standard ${formatMinor(standard)} an hour.`
            }
          />
        ) : (
          <ul className="divide-y">
            {rates.map((rate) => (
              <li key={rate.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {rate.personName ?? "Everyone"}
                    {rate.projectName ? ` on ${rate.projectName}` : " on every project"}
                  </p>
                </div>
                <span className="tabular-nums">{formatMinor(rate.hourlyRateMinor)} an hour</span>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Change this rate"
                      onClick={() => {
                        setErrors({});
                        setEditing({
                          id: rate.id,
                          profileId: rate.profileId ?? "none",
                          projectId: rate.projectId ?? "none",
                          rate: minorToInput(rate.hourlyRateMinor),
                        });
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove this rate"
                      disabled={pending}
                      onClick={() =>
                        run(() => deleteBillingRate(rate.id), {
                          success: "Rate removed.",
                          onSuccess: () => router.refresh(),
                        })
                      }
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

      <Dialog
        open={editing !== null}
        onOpenChange={(next) => !next && !pending && setEditing(null)}
      >
        <DialogContent>
          {editing && (
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                setErrors({});
                run(
                  () =>
                    saveBillingRate({
                      id: editing.id,
                      profileId: editing.profileId,
                      projectId: editing.projectId,
                      rate: editing.rate,
                    }),
                  {
                    success: "Rate saved.",
                    onSuccess: () => {
                      setEditing(null);
                      router.refresh();
                    },
                    onFieldErrors: setErrors,
                  },
                );
              }}
            >
              <DialogHeader>
                <DialogTitle>{editing.id ? "Change a rate" : "Add a rate"}</DialogTitle>
                <DialogDescription>
                  Pick a person, a project, or both, and what an hour costs.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field id="rate-person" label="Person" error={errors.profileId}>
                  <Select
                    value={editing.profileId}
                    onValueChange={(next) => setEditing({ ...editing, profileId: String(next) })}
                  >
                    <SelectTrigger id="rate-person" className="w-full">
                      <SelectValue>
                        {editing.profileId === "none"
                          ? "Everyone"
                          : (personName(editing.profileId) ?? "Everyone")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Everyone</SelectItem>
                      {choices.people.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="rate-project" label="Project">
                  <Select
                    value={editing.projectId}
                    onValueChange={(next) => setEditing({ ...editing, projectId: String(next) })}
                  >
                    <SelectTrigger id="rate-project" className="w-full">
                      <SelectValue>
                        {editing.projectId === "none"
                          ? "Every project"
                          : (projectName(editing.projectId) ?? "Every project")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Every project</SelectItem>
                      {choices.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="rate-amount" label="Rate per hour (₱)" required error={errors.rate}>
                  <Input
                    id="rate-amount"
                    inputMode="decimal"
                    value={editing.rate}
                    onChange={(event) => setEditing({ ...editing, rate: event.target.value })}
                    aria-invalid={!!errors.rate}
                    className="tabular-nums"
                  />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !editing.rate.trim()}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
