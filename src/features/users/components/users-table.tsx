"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/dashboard/data-table/data-table";
import { DataTablePagination } from "@/components/dashboard/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/dashboard/data-table/data-table-toolbar";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan, useStaff } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/dashboard/ui/avatar";
import { Badge } from "@/components/dashboard/ui/badge";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/dashboard/ui/select";
import { formatDate, getInitials } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import { hasActiveFilters } from "@/lib/table-params";
import { changeUserRole, removeUser } from "../actions";
import { checkRemoval, checkRoleChange } from "../rules";
import { USER_STATUSES, type DashboardUser, type RoleOption } from "../types";
import { usersTableConfig } from "../table";
import { InviteDialog } from "./invite-dialog";

export function UsersTable({
  page,
  roles,
  ownerCount,
}: {
  page: Page<DashboardUser>;
  roles: RoleOption[];
  ownerCount: number;
}) {
  const roleKeys = roles.map((role) => role.key).join(",");
  const config = useMemo(() => usersTableConfig(roleKeys ? roleKeys.split(",") : []), [roleKeys]);
  const table = useTableParams(config);
  const me = useStaff();
  const canInvite = useCan("users:invite");
  const canChange = useCan("users:update");
  const canRemove = useCan("users:remove");
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<DashboardUser | null>(null);

  const actor = { email: me.email, roleKey: me.roleKey, permissions: me.permissions };

  function changeRole(user: DashboardUser, roleId: string) {
    start(async () => {
      const result = await changeUserRole(user.email, roleId);
      if (result.ok) toast.success(`Updated ${user.email}'s role.`);
      else toast.error(result.error);
    });
  }

  function confirmRemove() {
    if (!removing) return;
    const user = removing;
    start(async () => {
      const result = await removeUser(user.email);
      if (result.ok) {
        toast.success(user.status === "Invited" ? "Invitation cancelled." : `${user.email} was removed.`);
        setRemoving(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns: Column<DashboardUser>[] = [
    {
      id: "name",
      header: "Person",
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.status === "Invited" ? user.email : user.name}</p>
            {user.status === "Active" && <p className="text-muted-foreground truncate text-xs">{user.email}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      sortable: true,
      cell: (user) => {
        const blocked =
          !canChange ||
          checkRoleChange({
            actor,
            target: { email: user.email, roleKey: user.roleKey },
            newRoleKey: user.roleKey,
            ownerCount,
          }) === "You can't change your own role.";
        if (blocked) return <Badge variant="secondary">{user.roleName}</Badge>;
        return (
          <Select value={user.roleId} onValueChange={(value) => changeRole(user, String(value))} disabled={pending}>
            <SelectTrigger size="sm" aria-label={`Role for ${user.email}`} className="w-36">
              <SelectValue>{(value: string) => roles.find((role) => role.id === value)?.name ?? user.roleName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      hideBelow: "sm",
      cell: (user) => <StatusBadge tone={user.status === "Active" ? "success" : "warning"}>{user.status}</StatusBadge>,
    },
    {
      id: "joined",
      header: "Added",
      sortable: true,
      hideBelow: "md",
      cell: (user) => <span className="text-muted-foreground">{formatDate(user.joined)}</span>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (user) => {
        const reason = checkRemoval({
          actor,
          target: user.status === "Active" ? { email: user.email, roleKey: user.roleKey } : null,
          ownerCount,
        });
        if (!canRemove) return null;
        return (
          <Button
            variant="ghost"
            size="icon"
            disabled={!!reason || pending}
            title={reason ?? undefined}
            aria-label={`${user.status === "Invited" ? "Cancel invitation for" : "Remove"} ${user.email}`}
            onClick={() => setRemoving(user)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        );
      },
    },
  ];

  const filtered = hasActiveFilters(table.params);

  return (
    <div className="bg-card rounded-xl border">
      <DataTableToolbar
        search={table.params.q}
        onSearchChange={table.setSearch}
        searchLabel="Search people"
        searchPlaceholder="Search people…"
        filters={[
          {
            id: "status",
            label: "Status",
            allLabel: "All statuses",
            options: USER_STATUSES.map((status) => ({ value: status, label: status })),
          },
          {
            id: "role",
            label: "Role",
            allLabel: "All roles",
            options: roles.map((role) => ({ value: role.key, label: role.name })),
          },
        ]}
        filterValues={table.params.filters}
        onFilterChange={table.setFilter}
        canClear={filtered}
        onClear={table.clear}
        actions={canInvite ? <InviteDialog roles={roles} /> : undefined}
      />
      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(user) => user.id}
        caption="People with dashboard access"
        sort={table.params.sort}
        direction={table.params.dir}
        onSortChange={table.setSort}
        empty={
          <EmptyState
            icon={Users}
            title={filtered ? "No one matches those filters" : "No one has access yet"}
            description={filtered ? "Try a different search or clear the filters." : "Invite your first teammate to get started."}
            action={filtered ? <Button variant="outline" onClick={table.clear}>Clear filters</Button> : undefined}
          />
        }
      />
      <DataTablePagination page={page} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing?.status === "Invited" ? "Cancel this invitation?" : "Remove this person?"}
        description={
          removing?.status === "Invited"
            ? `${removing?.email} will no longer be able to sign in.`
            : `${removing?.email} will lose access to the dashboard immediately.`
        }
        confirmLabel={removing?.status === "Invited" ? "Cancel invitation" : "Remove"}
        destructive
        pending={pending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
