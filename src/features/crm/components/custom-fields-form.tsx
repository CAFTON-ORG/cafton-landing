"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { setCustomValues } from "../actions/custom-fields";
import {
  CUSTOM_EDIT_PERMISSION,
  displayCustomValue,
  type CustomEntity,
  type CustomFieldDef,
  type CustomValues,
} from "../rules/custom-fields";
import { Fact, Facts } from "./detail-parts";

type Draft = Record<string, string | boolean | undefined>;

/** What a form holds for each field: text for most, yes/no (or untouched) for a checkbox. */
function draftFrom(defs: readonly CustomFieldDef[], values: CustomValues): Draft {
  const draft: Draft = {};
  for (const def of defs) {
    const value = values[def.key];
    draft[def.key] =
      def.type === "checkbox"
        ? typeof value === "boolean"
          ? value
          : undefined
        : value === undefined
          ? ""
          : String(value);
  }
  return draft;
}

/**
 * A record's custom fields: filled in here by people who can edit the record, read-only for
 * everyone else. Saved together, so a half-filled form never leaves half its values behind.
 */
export function CustomFieldsForm({
  entity,
  id,
  defs,
  values,
}: {
  entity: CustomEntity;
  id: string;
  defs: CustomFieldDef[];
  values: CustomValues;
}) {
  const router = useRouter();
  const canEdit = useCan(CUSTOM_EDIT_PERMISSION[entity]);
  const initial = draftFrom(defs, values);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();

  if (!canEdit) {
    const shown = defs.filter((def) => values[def.key] !== undefined);
    return shown.length === 0 ? (
      <p className="text-muted-foreground text-sm">Nothing filled in yet.</p>
    ) : (
      <Facts>
        {shown.map((def) => (
          <Fact key={def.id} label={def.label}>
            {displayCustomValue(def, values[def.key])}
          </Fact>
        ))}
      </Facts>
    );
  }

  const dirty = defs.some((def) => draft[def.key] !== initial[def.key]);
  const set = (key: string, value: string | boolean | undefined) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function save(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const payload: Record<string, unknown> = {};
    for (const def of defs) {
      const value = draft[def.key];
      if (value !== undefined) payload[def.key] = value;
    }
    run(() => setCustomValues({ entity, id, values: payload }), {
      success: "Saved.",
      onSuccess: () => router.refresh(),
      onFieldErrors: setErrors,
    });
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-3">
      {defs.map((def) => {
        const fieldId = `cf-${def.key}`;
        const value = draft[def.key];
        return (
          <Field
            key={def.id}
            id={fieldId}
            label={def.label}
            required={def.required}
            error={errors[def.key]}
          >
            {def.type === "text" && (
              <Input
                id={fieldId}
                value={String(value ?? "")}
                onChange={(event) => set(def.key, event.target.value)}
                aria-invalid={!!errors[def.key]}
              />
            )}
            {def.type === "number" && (
              <Input
                id={fieldId}
                inputMode="decimal"
                value={String(value ?? "")}
                onChange={(event) => set(def.key, event.target.value)}
                aria-invalid={!!errors[def.key]}
              />
            )}
            {def.type === "date" && (
              <DatePicker
                id={fieldId}
                value={String(value ?? "")}
                onChange={(next) => set(def.key, next)}
                clearable
                aria-invalid={!!errors[def.key]}
              />
            )}
            {def.type === "select" && (
              <div className="flex items-center gap-1">
                <Select
                  value={String(value ?? "")}
                  onValueChange={(next) => set(def.key, next ? String(next) : "")}
                >
                  <SelectTrigger
                    id={fieldId}
                    className="min-w-0 flex-1"
                    aria-invalid={!!errors[def.key]}
                  >
                    <SelectValue placeholder="Not set">{String(value ?? "")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {def.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {value ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Clear ${def.label}`}
                    onClick={() => set(def.key, "")}
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            )}
            {def.type === "checkbox" && (
              <label className="flex min-h-8 items-center gap-2 text-sm">
                <Checkbox
                  id={fieldId}
                  checked={value === true}
                  onCheckedChange={(checked) => set(def.key, checked === true)}
                />
                Yes
              </label>
            )}
          </Field>
        );
      })}
      <div>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save fields"}
        </Button>
      </div>
    </form>
  );
}
