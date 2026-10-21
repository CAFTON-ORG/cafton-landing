"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { RESOURCES, normalisePermissions, type Permission, type Resource } from "@/lib/auth/permissions";
import { saveRole } from "../actions";
import type { RoleSummary } from "../types";

const RESOURCE_KEYS = Object.keys(RESOURCES) as Resource[];

/**
 * Permission matrix for one role. `held` is what the editor may hand out: the
 * checkboxes for anything else are disabled (no privilege escalation).
 */
export function RoleEditor({
  role,
  open,
  onOpenChange,
  held,
}: {
  role: RoleSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  held: readonly Permission[];
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<Permission>>(new Set(role?.permissions ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const readOnly = role?.isSystem ?? false;

  function toggle(permission: Permission, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      // Turning on anything also turns on "view" for that area.
      return new Set(checked ? normalisePermissions([...next]) : next);
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await saveRole({ id: role?.id, name, description, permissions: [...selected] });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(role ? "Role updated." : "Role created.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{role ? (readOnly ? role.name : `Edit ${role.name}`) : "New role"}</DialogTitle>
            <DialogDescription>
              {readOnly
                ? "Built-in roles can't be edited. Create a custom role to change what someone can do."
                : "Choose exactly what this role can do. You can only grant permissions you hold yourself."}
            </DialogDescription>
          </DialogHeader>

          {!readOnly && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "role-name-error" : undefined}
                />
                {errors.name && (
                  <p id="role-name-error" className="text-destructive text-sm">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  rows={1}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {RESOURCE_KEYS.map((resource) => {
              const { label, actions } = RESOURCES[resource];
              return (
                <fieldset key={resource} className="grid gap-2 rounded-lg border p-3">
                  <legend className="px-1 text-sm font-medium">{label}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(actions) as (keyof typeof actions)[]).map((action) => {
                      const permission = `${resource}:${String(action)}` as Permission;
                      const id = `perm-${resource}-${String(action)}`;
                      const disabled = readOnly || !held.includes(permission);
                      return (
                        <div key={permission} className="flex items-start gap-2">
                          <Checkbox
                            id={id}
                            checked={selected.has(permission)}
                            disabled={disabled}
                            onCheckedChange={(checked) => toggle(permission, checked === true)}
                          />
                          <Label htmlFor={id} className="text-sm leading-snug font-normal">
                            {(actions as Record<string, string>)[action as string]}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            {errors.permissions && <p className="text-destructive text-sm">{errors.permissions}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save role"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
