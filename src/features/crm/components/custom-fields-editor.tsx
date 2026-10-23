"use client";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchiveRestore, ListPlus, Pencil, Plus, Archive } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Dialog,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { saveCustomField, setCustomFieldActive } from "../actions/custom-fields";
import {
  CUSTOM_ENTITIES,
  canBeRequired,
  CUSTOM_ENTITY_LABEL,
  CUSTOM_TYPES,
  CUSTOM_TYPE_LABEL,
  MAX_FIELDS_PER_ENTITY,
  MAX_LABEL,
  type CustomEntity,
  type CustomFieldDef,
  type CustomType,
} from "../custom-fields";

interface Editing {
  entity: CustomEntity;
  id?: string;
  label: string;
  type: CustomType;
  optionsText: string;
  required: boolean;
}

/** The fields an administrator has added to leads, contacts, organizations and deals. */
export function CustomFieldsEditor({ fields }: { fields: CustomFieldDef[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();

  const startNew = (entity: CustomEntity) => {
    setErrors({});
    setEditing({ entity, label: "", type: "text", optionsText: "", required: false });
  };
  const startEdit = (field: CustomFieldDef) => {
    setErrors({});
    setEditing({
      entity: field.entity,
      id: field.id,
      label: field.label,
      type: field.type,
      optionsText: field.options.join("\n"),
      required: field.required,
    });
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setErrors({});
    run(
      () =>
        saveCustomField({
          id: editing.id,
          entity: editing.entity,
          label: editing.label,
          type: editing.type,
          required: editing.required && canBeRequired(editing.type),
          options: editing.type === "select" ? editing.optionsText.split("\n") : [],
        }),
      {
        success: editing.id ? "Field updated." : "Field added.",
        onSuccess: () => {
          setEditing(null);
          router.refresh();
        },
        onFieldErrors: setErrors,
      },
    );
  }

  function toggle(field: CustomFieldDef, active: boolean) {
    run(() => setCustomFieldActive(field.id, active), {
      success: active ? "Field restored." : "Field archived. Its values are kept.",
      onSuccess: () => router.refresh(),
    });
  }

  return (
    <>
      <Tabs defaultValue="lead">
        <TabsList>
          {CUSTOM_ENTITIES.map((entity) => {
            const count = fields.filter((field) => field.entity === entity && field.active).length;
            return (
              <TabsTrigger key={entity} value={entity}>
                {CUSTOM_ENTITY_LABEL[entity]}
                <TabCount n={count} />
              </TabsTrigger>
            );
          })}
        </TabsList>
        {CUSTOM_ENTITIES.map((entity) => {
          const mine = fields.filter((field) => field.entity === entity);
          const active = mine.filter((field) => field.active);
          const archived = mine.filter((field) => !field.active);
          return (
            <TabsContent key={entity} value={entity} className="mt-4 grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{CUSTOM_ENTITY_LABEL[entity]}</CardTitle>
                  <CardDescription>
                    Shown on every {entity}&apos;s page, under &quot;Custom fields&quot;.{" "}
                    {active.length} of {MAX_FIELDS_PER_ENTITY} used.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {active.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ListPlus}
                      title="No custom fields yet"
                      description={`Add the facts your team wants to record on every ${entity}, like a region or a customer tier.`}
                    />
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {active.map((field) => (
                        <li key={field.id} className="flex items-center gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{field.label}</p>
                            <p className="text-muted-foreground text-xs">
                              {CUSTOM_TYPE_LABEL[field.type]}
                              {field.required && " · Required"}
                              {field.type === "select" && ` · ${field.options.join(", ")}`}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${field.label}`}
                            disabled={pending}
                            onClick={() => startEdit(field)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Archive ${field.label}`}
                            disabled={pending}
                            onClick={() => toggle(field, false)}
                          >
                            <Archive aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={active.length >= MAX_FIELDS_PER_ENTITY}
                      onClick={() => startNew(entity)}
                    >
                      <Plus aria-hidden="true" /> Add a field
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {archived.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Archived</CardTitle>
                    <CardDescription>
                      Hidden from forms. Their values are kept and come back if you restore them.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y rounded-lg border">
                      {archived.map((field) => (
                        <li key={field.id} className="flex items-center gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground truncate text-sm">{field.label}</p>
                          </div>
                          <StatusBadge tone="neutral">Archived</StatusBadge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => toggle(field, true)}
                          >
                            <ArchiveRestore aria-hidden="true" /> Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && !pending && setEditing(null)}
      >
        <DialogContent>
          {editing && (
            <form onSubmit={submit} noValidate className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit field" : "Add a field"}</DialogTitle>
                <DialogDescription>
                  On {CUSTOM_ENTITY_LABEL[editing.entity].toLowerCase()}.{" "}
                  {editing.id
                    ? "You can rename it and change its choices; its type is fixed."
                    : "The type can't be changed later."}
                </DialogDescription>
              </DialogHeader>
              <Field id="cf-label" label="Name" required error={errors.label ?? errors.form}>
                <Input
                  id="cf-label"
                  value={editing.label}
                  maxLength={MAX_LABEL}
                  onChange={(event) => setEditing({ ...editing, label: event.target.value })}
                  aria-invalid={!!errors.label}
                />
              </Field>
              <Field id="cf-type" label="Type">
                <Select
                  value={editing.type}
                  disabled={!!editing.id}
                  onValueChange={(type) => setEditing({ ...editing, type: type as CustomType })}
                >
                  <SelectTrigger id="cf-type" className="w-full">
                    <SelectValue>{CUSTOM_TYPE_LABEL[editing.type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CUSTOM_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {editing.type === "select" && (
                <Field
                  id="cf-options"
                  label="Choices"
                  hint="One per line, at least two."
                  error={errors.options}
                >
                  <Textarea
                    id="cf-options"
                    rows={5}
                    value={editing.optionsText}
                    onChange={(event) =>
                      setEditing({ ...editing, optionsText: event.target.value })
                    }
                  />
                </Field>
              )}
              {canBeRequired(editing.type) && (
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox
                    checked={editing.required}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, required: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    Required
                    <span className="text-muted-foreground block text-xs">
                      It has to be filled in whenever the record&apos;s fields are saved.
                    </span>
                  </span>
                </label>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !editing.label.trim()}>
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
