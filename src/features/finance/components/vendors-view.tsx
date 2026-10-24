"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Store } from "lucide-react";

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
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { saveVendor, setVendorActive } from "../actions/payables";
import type { BillAccount, VendorView } from "../types/payables";
import { Money } from "./money";
import { DEFAULT_VENDOR_TERMS_DAYS } from "../rules/payables";

interface Draft {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tin: string;
  termsDays: string;
  defaultAccountId: string;
  notes: string;
}

const blank: Draft = {
  name: "",
  email: "",
  phone: "",
  address: "",
  tin: "",
  termsDays: String(DEFAULT_VENDOR_TERMS_DAYS),
  defaultAccountId: "none",
  notes: "",
};

/** The suppliers the business buys from, and what is owed to each. */
export function VendorsView({
  vendors,
  accounts,
}: {
  vendors: VendorView[];
  accounts: BillAccount[];
}) {
  const router = useRouter();
  const canEdit = useCan("payables:create");
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);

  const visible = vendors.filter((vendor) => vendor.active || showArchived);
  const archivedCount = vendors.filter((vendor) => !vendor.active).length;
  const accountLabel = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    return account ? `${account.code} ${account.name}` : "No usual account";
  };

  const add = (
    <Button
      onClick={() => {
        setErrors({});
        setDraft(blank);
      }}
    >
      <Plus aria-hidden="true" /> New supplier
    </Button>
  );

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(
      () =>
        saveVendor({
          id: draft.id,
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          tin: draft.tin,
          termsDays: Number(draft.termsDays),
          defaultAccountId: draft.defaultAccountId,
          notes: draft.notes,
        }),
      {
        success: draft.id ? "Supplier updated." : "Supplier added.",
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
      {canEdit && vendors.length > 0 && <div className="mb-4 flex justify-end">{add}</div>}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No suppliers yet"
              description="Add the people and companies you buy from, then enter their bills against them."
              action={canEdit ? add : undefined}
            />
          ) : (
            <ul className="divide-y">
              {visible.map((vendor) => (
                <li key={vendor.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {vendor.name}
                      {!vendor.active && <StatusBadge tone="neutral">Archived</StatusBadge>}
                    </p>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {[
                        vendor.email,
                        vendor.tin ? `TIN ${vendor.tin}` : null,
                        `${vendor.termsDays} day terms`,
                        vendor.defaultAccountName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      <Money minor={vendor.owedMinor} muteZero />
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {vendor.billCount} {vendor.billCount === 1 ? "bill" : "bills"}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${vendor.name}`}
                        onClick={() => {
                          setErrors({});
                          setDraft({
                            id: vendor.id,
                            name: vendor.name,
                            email: vendor.email ?? "",
                            phone: vendor.phone ?? "",
                            address: vendor.address ?? "",
                            tin: vendor.tin ?? "",
                            termsDays: String(vendor.termsDays),
                            defaultAccountId: vendor.defaultAccountId ?? "none",
                            notes: vendor.notes ?? "",
                          });
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${vendor.active ? "Archive" : "Restore"} ${vendor.name}`}
                        disabled={pending}
                        onClick={() =>
                          run(() => setVendorActive({ id: vendor.id, active: !vendor.active }), {
                            success: vendor.active ? "Supplier archived." : "Supplier restored.",
                            onSuccess: () => router.refresh(),
                          })
                        }
                      >
                        {vendor.active ? (
                          <Archive aria-hidden="true" />
                        ) : (
                          <ArchiveRestore aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {archivedCount > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          Show {archivedCount} archived
        </label>
      )}

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit supplier" : "New supplier"}</DialogTitle>
                <DialogDescription>
                  Their usual account and terms are filled in when you enter a bill from them.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field id="vendor-name" label="Name" required error={errors.name}>
                  <Input
                    id="vendor-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    aria-invalid={!!errors.name}
                    autoComplete="off"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vendor-email" label="Email" error={errors.email}>
                    <Input
                      id="vendor-email"
                      type="email"
                      value={draft.email}
                      onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                      aria-invalid={!!errors.email}
                    />
                  </Field>
                  <Field id="vendor-phone" label="Phone">
                    <Input
                      id="vendor-phone"
                      value={draft.phone}
                      onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                    />
                  </Field>
                  <Field id="vendor-tin" label="TIN" hint="Needed on the bill for tax records.">
                    <Input
                      id="vendor-tin"
                      value={draft.tin}
                      onChange={(event) => setDraft({ ...draft, tin: event.target.value })}
                    />
                  </Field>
                  <Field id="vendor-terms" label="Payment terms (days)" error={errors.termsDays}>
                    <Input
                      id="vendor-terms"
                      inputMode="numeric"
                      value={draft.termsDays}
                      onChange={(event) => setDraft({ ...draft, termsDays: event.target.value })}
                      aria-invalid={!!errors.termsDays}
                    />
                  </Field>
                </div>
                <Field id="vendor-account" label="Usual account">
                  <Select
                    value={draft.defaultAccountId}
                    onValueChange={(next) => setDraft({ ...draft, defaultAccountId: String(next) })}
                  >
                    <SelectTrigger id="vendor-account" className="w-full">
                      <SelectValue>{accountLabel(draft.defaultAccountId)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No usual account</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="vendor-address" label="Address">
                  <Textarea
                    id="vendor-address"
                    rows={2}
                    value={draft.address}
                    onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                  />
                </Field>
                <Field id="vendor-notes" label="Notes">
                  <Textarea
                    id="vendor-notes"
                    rows={2}
                    value={draft.notes}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  />
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
