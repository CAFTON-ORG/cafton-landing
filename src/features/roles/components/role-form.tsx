"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Lock, Trash2 } from "lucide-react";

import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import {
  RESOURCES,
  normalisePermissions,
  type Permission,
  type Resource,
} from "@/lib/auth/permissions";
import { deleteRole, saveRole } from "../actions/roles";
import { checkDeletable } from "../rules";
import type { RoleSummary } from "../types";

const RESOURCE_KEYS = Object.keys(RESOURCES) as Resource[];
const permissionsOf = (resource: Resource) =>
  (Object.keys(RESOURCES[resource].actions) as string[]).map(
    (action) => `${resource}:${action}` as Permission,
  );

/**
 * One role on its own page (not in a modal): a permission matrix is a long, careful form that
 * people compare against other roles, so it gets the standard editing layout, the sticky Save
 * card, and room. `held` is what the editor may hand out: anything else is disabled, so nobody
 * can grant more than they have.
 */
export function RoleForm({
  role,
  roles,
  held,
  canManage,
}: {
  /** The role being edited, or null for a new one. */
  role: RoleSummary | null;
  /** Every role, to start a new one from. */
  roles: RoleSummary[];
  held: readonly Permission[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const readOnly = !canManage || (role?.isSystem ?? false);
  const initial = useMemo(
    () => ({
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: [...(role?.permissions ?? [])].sort(),
    }),
    [role],
  );
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [selected, setSelected] = useState<Set<Permission>>(new Set(initial.permissions));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const dirty =
    name !== initial.name ||
    description !== initial.description ||
    JSON.stringify([...selected].sort()) !== JSON.stringify(initial.permissions);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setPermission(permission: Permission, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      // Turning on anything also turns on "view" for that area.
      return new Set(checked ? normalisePermissions([...next]) : next);
    });
  }

  function setGroup(resource: Resource, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const permission of permissionsOf(resource)) {
        if (!held.includes(permission)) continue;
        if (on) next.add(permission);
        else next.delete(permission);
      }
      return new Set(on ? normalisePermissions([...next]) : next);
    });
  }

  function startFrom(roleId: string) {
    const source = roles.find((entry) => entry.id === roleId);
    if (!source) return;
    // Copy only what the editor may hand out.
    setSelected(new Set(source.permissions.filter((permission) => held.includes(permission))));
  }

  const blocked = role ? checkDeletable(role) : null;

  const rail = (
    <>
      {readOnly ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {role?.isSystem && <Lock className="size-4" aria-hidden="true" />} View only
            </CardTitle>
            <CardDescription>
              {role?.isSystem
                ? "Built-in roles can't be edited. Create a custom role to change what someone can do."
                : "You can see this role but not change it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              type="button"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/dashboard/roles" />}
            >
              Back to roles
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FormActions
          title={role ? "Save role" : "New role"}
          description="You can only grant permissions you hold yourself."
          dirty={dirty}
          pending={pending}
          error={errors.form}
          saveLabel={role ? "Save changes" : "Create role"}
          onDiscard={() => {
            setName(initial.name);
            setDescription(initial.description);
            setSelected(new Set(initial.permissions));
            setErrors({});
          }}
          links={
            <Button
              type="button"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/dashboard/roles" />}
            >
              Back to roles
            </Button>
          }
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-1 text-sm">
          <p>
            <strong className="text-foreground tabular-nums">{selected.size}</strong> permission
            {selected.size === 1 ? "" : "s"} granted
          </p>
          {role && (
            <p>
              <strong className="text-foreground tabular-nums">{role.people}</strong>{" "}
              {role.people === 1 ? "person has" : "people have"} this role
            </p>
          )}
          <p>Changing a role changes everyone who has it, straight away.</p>
        </CardContent>
      </Card>
      {role && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Delete role</CardTitle>
            <CardDescription>
              {blocked ?? "This can't be undone. Nobody has this role."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={!!blocked || pending}
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden="true" /> Delete role
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        run(() => saveRole({ id: role?.id, name, description, permissions: [...selected] }), {
          success: role ? "Role updated." : "Role created.",
          onSuccess: (data) => {
            if (!role && data?.id) router.replace(`/dashboard/roles/${data.id}`);
            else router.refresh();
          },
          onFieldErrors: setErrors,
        });
      }}
    >
      <fieldset disabled={readOnly || pending} className="min-w-0">
        <EditorLayout rail={rail}>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              {!role && roles.length > 0 && (
                <CardDescription>Start from an existing role, then adjust.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="role-name" label="Name" required error={errors.name}>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={!!errors.name}
                  autoComplete="off"
                />
              </Field>
              <Field id="role-description" label="Description" error={errors.description}>
                <Textarea
                  id="role-description"
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              {!role && roles.length > 0 && (
                <Field
                  id="role-from"
                  label="Start from"
                  hint="Copies its permissions, which you can then change."
                >
                  <Select onValueChange={(value) => startFrom(String(value))}>
                    <SelectTrigger id="role-from" className="w-full sm:w-72">
                      <SelectValue>
                        {(value: string | null) =>
                          roles.find((entry) => entry.id === value)?.name ??
                          "Choose a role (optional)"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name} ({entry.permissions.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {RESOURCE_KEYS.map((resource) => {
              const { label, actions } = RESOURCES[resource];
              const all = permissionsOf(resource);
              const grantable = all.filter((permission) => held.includes(permission));
              const count = all.filter((permission) => selected.has(permission)).length;
              const full = grantable.length > 0 && grantable.every((p) => selected.has(p));
              return (
                <Card key={resource}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{label}</CardTitle>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {count} of {all.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-1">
                    {(Object.keys(actions) as string[]).map((action) => {
                      const permission = `${resource}:${action}` as Permission;
                      const id = `perm-${resource}-${action}`;
                      const disabled = readOnly || !held.includes(permission);
                      return (
                        <div key={permission} className="flex items-start gap-2 py-1">
                          <Checkbox
                            id={id}
                            checked={selected.has(permission)}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              setPermission(permission, checked === true)
                            }
                          />
                          <Label
                            htmlFor={id}
                            title={
                              !readOnly && disabled ? "You don't hold this permission" : undefined
                            }
                            className="text-sm leading-snug font-normal"
                          >
                            {(actions as Record<string, string>)[action]}
                          </Label>
                        </div>
                      );
                    })}
                    {!readOnly && grantable.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 w-fit"
                        onClick={() => setGroup(resource, !full)}
                      >
                        {full ? "Clear all" : "Select all"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {errors.permissions && <p className="text-destructive text-sm">{errors.permissions}</p>}
        </EditorLayout>
      </fieldset>

      {role && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title="Delete this role?"
          description={`The ${role.name} role will be removed. This can't be undone.`}
          confirmLabel="Delete role"
          destructive
          pending={pending}
          onConfirm={() =>
            run(() => deleteRole(role.id), {
              success: `Deleted the ${role.name} role.`,
              onSuccess: () => router.replace("/dashboard/roles"),
            })
          }
        />
      )}
    </form>
  );
}
