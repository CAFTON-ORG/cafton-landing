"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { checkDeletable } from "../rules";
import { deleteRole } from "../actions/roles";
import type { RoleSummary } from "../types";

export function RolesView({ roles }: { roles: RoleSummary[] }) {
  const canManage = useCan("roles:manage");
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);
  const [pending, start] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    const role = deleting;
    start(async () => {
      const result = await deleteRole(role.id);
      if (result.ok) {
        toast.success(`Deleted the ${role.name} role.`);
        setDeleting(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button nativeButton={false} render={<Link href="/dashboard/roles/new" />}>
            <Plus aria-hidden="true" /> New role
          </Button>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => {
          const blocked = checkDeletable(role);
          return (
            <li key={role.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <Badge variant="secondary">
                        <Lock aria-hidden="true" className="size-3" /> Built-in
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{role.description ?? "No description."}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-sm">
                    {role.people} {role.people === 1 ? "person" : "people"} ·{" "}
                    {role.permissions.length} permissions
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      render={<Link href={`/dashboard/roles/${role.id}`} />}
                      aria-label={`${role.isSystem || !canManage ? "View" : "Edit"} ${role.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    {canManage && !role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${role.name}`}
                        disabled={!!blocked}
                        title={blocked ?? undefined}
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this role?"
        description={`The ${deleting?.name ?? ""} role will be removed. This can't be undone.`}
        confirmLabel="Delete role"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
