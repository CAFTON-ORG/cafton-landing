"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { PresetSelect } from "@/components/dashboard/shared/preset-select";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Badge } from "@/components/dashboard/ui/badge";
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
import { Label } from "@/components/dashboard/ui/label";
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
import { deleteCatalogItem, saveCatalogItem } from "../actions/catalog";
import { UNITS } from "../options";
import {
  DEFAULT_UNIT,
  PRICING_MODELS,
  PRICING_MODEL_LABEL,
  type CatalogItemView,
  type PricingModel,
} from "../types";

/** The price list: what Cafton sells and how it is charged. Quotes pick from it. */
export function CatalogView({ items }: { items: CatalogItemView[] }) {
  const canManage = useCan("catalog:manage");
  const [editing, setEditing] = useState<CatalogItemView | "new" | null>(null);
  const [deleting, setDeleting] = useState<CatalogItemView | null>(null);
  const router = useRouter();
  const { run, pending } = useServerAction();

  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> Add an item
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No services in the catalog yet"
              description="Add what you sell, with a price and how it is charged. Quotes pick from this list so prices stay consistent."
              action={
                canManage && (
                  <Button onClick={() => setEditing("new")}>
                    <Plus aria-hidden="true" /> Add an item
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {item.name}
                      <Badge variant="secondary">{PRICING_MODEL_LABEL[item.pricingModel]}</Badge>
                      {!item.active && <StatusBadge tone="neutral">Inactive</StatusBadge>}
                    </p>
                    {item.description && (
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <p className="text-sm tabular-nums">
                    {formatMinor(item.unitPriceMinor)}{" "}
                    <span className="text-muted-foreground">per {item.unitLabel}</span>
                    {!item.taxable && <span className="text-muted-foreground"> · no VAT</span>}
                  </p>
                  {canManage && (
                    <span className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editing && (
        <ItemDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this item"}?`}
        description="If it is already on a quote it can't be deleted; switch it to inactive instead."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          run(() => deleteCatalogItem(target.id), {
            success: "Deleted.",
            onSuccess: () => {
              setDeleting(null);
              router.refresh();
            },
          });
        }}
      />
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: CatalogItemView | null; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [values, setValues] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    pricingModel: (item?.pricingModel ?? "fixed") as PricingModel,
    price: item ? minorToInput(item.unitPriceMinor) : "",
    unitLabel: item?.unitLabel ?? "project",
    taxable: item?.taxable ?? true,
    active: item?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent scrollable className="sm:max-w-lg">
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            setErrors({});
            run(() => saveCatalogItem(item?.id ?? null, values), {
              success: "Saved.",
              onSuccess: () => {
                onClose();
                router.refresh();
              },
              onFieldErrors: setErrors,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{item ? "Edit item" : "Add an item"}</DialogTitle>
            <DialogDescription>It appears in the picker when you build a quote.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="item-name" label="Name" required error={errors.name}>
              <Input
                id="item-name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={!!errors.name}
                autoComplete="off"
              />
            </Field>
            <Field
              id="item-description"
              label="Description"
              error={errors.description}
              hint="Shown on the quote under the name."
            >
              <Textarea
                id="item-description"
                rows={3}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="item-model" label="How it is charged">
                <Select
                  value={values.pricingModel}
                  onValueChange={(value) => {
                    const model = value as PricingModel;
                    setValues((c) => ({
                      ...c,
                      pricingModel: model,
                      unitLabel: DEFAULT_UNIT[model],
                    }));
                  }}
                >
                  <SelectTrigger id="item-model" className="w-full">
                    <SelectValue>
                      {(v: string) => PRICING_MODEL_LABEL[v as PricingModel]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {PRICING_MODEL_LABEL[model]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="item-unit"
                label="One unit is"
                error={errors.unitLabel}
                hint="What the price is per."
              >
                <PresetSelect
                  id="item-unit"
                  label="One unit is"
                  value={values.unitLabel}
                  options={UNITS}
                  onChange={(value) => set("unitLabel", value)}
                />
              </Field>
            </div>
            <Field id="item-price" label="Price per unit (PHP)" required error={errors.price}>
              <Input
                id="item-price"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
                aria-invalid={!!errors.price}
                placeholder="150,000.00"
              />
            </Field>
            <div className="flex items-start gap-2">
              <Checkbox
                id="item-taxable"
                checked={values.taxable}
                onCheckedChange={(c) => set("taxable", c === true)}
              />
              <Label htmlFor="item-taxable" className="text-sm leading-snug font-normal">
                Add VAT to this item
              </Label>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Available on new quotes</p>
                <p className="text-muted-foreground text-xs">
                  Switch off to retire it without deleting it.
                </p>
              </div>
              <Switch
                aria-label="Available on new quotes"
                checked={values.active}
                onCheckedChange={(c) => set("active", c)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
