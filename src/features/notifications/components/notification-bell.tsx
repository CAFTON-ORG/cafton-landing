"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/ui/popover";
import { Skeleton } from "@/components/dashboard/ui/skeleton";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../actions/notifications";
import type { NotificationView } from "../types";

/**
 * The bell in the top bar. The page only carries the unread count; the list is read when the bell
 * is opened, so every page doesn't pay for a query nobody looks at. Opening an item marks it read.
 */
export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [items, setItems] = useState<NotificationView[] | null>(null);

  const load = () =>
    run(() => listMyNotifications(), { onSuccess: (data) => setItems(data ?? []) });

  return (
    <Popover onOpenChange={(open) => open && load()}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative"
          />
        }
      >
        <Bell aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] leading-4 font-semibold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => markAllNotificationsRead(), {
                  onSuccess: () => {
                    setItems((list) => list?.map((item) => ({ ...item, read: true })) ?? null);
                    router.refresh();
                  },
                })
              }
            >
              <CheckCheck aria-hidden="true" /> Mark all read
            </Button>
          )}
        </div>
        {items === null ? (
          <div className="grid gap-3 p-3" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={BellOff}
            title="You are all caught up"
            description="New enquiries, meeting requests and things assigned to you show up here."
          />
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((item) => {
              const body = (
                <span className="flex items-start gap-2">
                  {!item.read && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600"
                      role="img"
                      aria-label="Unread"
                    />
                  )}
                  <span className="min-w-0">
                    <span className={cn("block text-sm", !item.read && "font-medium")}>
                      {item.title}
                    </span>
                    {item.body && (
                      <span className="text-muted-foreground line-clamp-2 block text-xs">
                        {item.body}
                      </span>
                    )}
                    <time dateTime={item.createdAt} className="text-muted-foreground text-xs">
                      {formatRelative(item.createdAt)}
                    </time>
                  </span>
                </span>
              );
              const open = () => {
                if (!item.read) void markNotificationRead(item.id).then(() => router.refresh());
              };
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={open}
                      className="hover:bg-accent/50 focus-visible:ring-ring block px-3 py-2.5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={open}
                      className="hover:bg-accent/50 block w-full px-3 py-2.5 text-left"
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
