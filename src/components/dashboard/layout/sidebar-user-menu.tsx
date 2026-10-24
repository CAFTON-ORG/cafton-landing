"use client";

import Link from "next/link";
import { ChevronRight, LogOut, Settings } from "lucide-react";

import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "./sign-out";
import { useCan, useStaff } from "./staff-context";

/** The signed-in person pinned to the bottom of the sidebar; also the trigger for the account menu. */
export function SidebarUserMenu({ collapsed }: { collapsed?: boolean }) {
  const staff = useStaff();
  const canOpenSettings = useCan("settings:view");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
              collapsed && "justify-center",
            )}
          >
            <UserAvatar
              name={staff.name}
              email={staff.email}
              src={staff.avatarUrl}
              className="shrink-0"
            />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sidebar-foreground/70 truncate text-xs">{staff.roleName}</p>
                  <p className="truncate text-sm font-medium">{staff.name}</p>
                </div>
                <ChevronRight className="text-sidebar-foreground/70 size-4 shrink-0" />
              </>
            )}
          </button>
        }
      />
      {/* Fixed width: the content otherwise sizes itself to the (possibly icon-only) trigger. */}
      <DropdownMenuContent
        align={collapsed ? "start" : "end"}
        side={collapsed ? "right" : "top"}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{staff.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canOpenSettings && (
            <DropdownMenuItem
              render={
                <Link href="/dashboard/settings" className="flex items-center gap-2">
                  <Settings className="size-4" /> Settings
                </Link>
              }
            />
          )}
          <DropdownMenuItem onClick={signOut} variant="destructive">
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
