"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Tag, Trash2, UserRoundPlus, X } from "lucide-react";

import type { FilterConfig } from "@/components/dashboard/data-table/data-table-toolbar";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import { Input } from "@/components/dashboard/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bulkAssign, bulkDelete, bulkTag, type BulkResult } from "../actions/bulk";
import type { PersonRef } from "../types";
import type { Taggable } from "../tags";

/** The tags of a row, a few as badges and "+n" for the rest. */
export function TagList({ tags, max = 3 }: { tags: string[]; max?: number }) {
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
      {tags.length > max && (
        <span className="text-muted-foreground text-xs">+{tags.length - max}</span>
      )}
    </span>
  );
}

/** A past moment ("3 days ago"), muted; "—" when there is none. */
export function Ago({ at }: { at?: string }) {
  if (!at) return <span className="text-muted-foreground">Never</span>;
  return (
    <time dateTime={at} title={formatDate(at, { dateStyle: "medium", timeStyle: "short" })}>
      {formatRelative(at)}
    </time>
  );
}

const isPast = (at: string) => new Date(at).getTime() < Date.now();

/** The next thing to do: red when it is already late, a warning when there is nothing planned. */
export function NextStep({ at, closed = false }: { at?: string; closed?: boolean }) {
  if (closed) return <span className="text-muted-foreground">—</span>;
  if (!at) {
    return <span className="text-amber-700 dark:text-amber-400">Nothing planned</span>;
  }
  const late = isPast(at);
  return (
    <time
      dateTime={at}
      className={cn(late && "font-medium text-red-700 dark:text-red-400")}
      title={formatDate(at, { dateStyle: "medium", timeStyle: "short" })}
    >
      {late && <span className="sr-only">Overdue: </span>}
      {formatDate(at, { month: "short", day: "numeric" })}
    </time>
  );
}

export function tagFilter(options: string[]): FilterConfig[] {
  return options.length === 0
    ? []
    : [
        {
          id: "tag",
          label: "Tag",
          allLabel: "Any tag",
          options: options.map((tag) => ({ value: tag, label: tag })),
        },
      ];
}

const PERMISSIONS = {
  lead: { update: "leads:update", remove: "leads:delete" },
  contact: { update: "contacts:update", remove: "contacts:delete" },
  organization: { update: "organizations:update", remove: "organizations:delete" },
  deal: { update: "deals:update", remove: "deals:delete" },
} as const;

/** What to do with the rows you ticked: give them to someone, tag them, delete them. */
export function BulkBar({
  kind,
  ids,
  people,
  tagSuggestions,
  onDone,
}: {
  kind: Taggable;
  ids: string[];
  people: PersonRef[];
  tagSuggestions: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const canUpdate = useCan(PERMISSIONS[kind].update);
  const canDelete = useCan(PERMISSIONS[kind].remove);
  const { run, pending } = useServerAction();
  const [tag, setTag] = useState("");
  const [confirming, setConfirming] = useState(false);

  const finished = () => (data?: BulkResult) => {
    if (data && data.skipped > 0) {
      // Say what was kept and why: silent partial success hides problems.
      toast.warning(`${data.skipped} kept`, { description: data.reasons.join(" ") });
    }
    onDone();
    router.refresh();
  };
  const summary = (verb: string) => (data?: BulkResult) =>
    `${data?.done ?? 0} ${verb}${data && data.skipped ? `, ${data.skipped} kept` : ""}.`;

  return (
    <>
      {canUpdate && kind !== "organization" && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
            <UserRoundPlus aria-hidden="true" /> Assign to
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            {people.map((person) => (
              <DropdownMenuItem
                key={person.id}
                onClick={() =>
                  run(() => bulkAssign({ kind, ids, ownerId: person.id }), {
                    success: summary("assigned"),
                    onSuccess: finished(),
                  })
                }
              >
                <UserAvatar name={person.name} src={person.avatarUrl} size="sm" /> {person.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run(() => bulkAssign({ kind, ids, ownerId: null }), {
                  success: summary("unassigned"),
                  onSuccess: finished(),
                })
              }
            >
              Unassign
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {canUpdate && (
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
            <Tag aria-hidden="true" /> Add tag
          </PopoverTrigger>
          <PopoverContent align="end">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!tag.trim()) return;
                run(() => bulkTag({ kind, ids, add: [tag], remove: [] }), {
                  success: summary("tagged"),
                  onSuccess: (data) => {
                    setTag("");
                    finished()(data);
                  },
                });
              }}
            >
              <Input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                list="bulk-tag-suggestions"
                placeholder="Tag to add"
                aria-label="Tag to add"
                maxLength={40}
              />
              <datalist id="bulk-tag-suggestions">
                {tagSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <Button type="submit" size="sm" disabled={pending || !tag.trim()}>
                Add
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}

      {canDelete && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={`Delete ${ids.length} ${kind}${ids.length === 1 ? "" : "s"}?`}
            description="Rows the rules protect (a won deal, a converted lead, a contact with deals) are kept, and you are told which. This can't be undone from the dashboard."
            confirmLabel="Delete"
            destructive
            pending={pending}
            onConfirm={() =>
              run(() => bulkDelete({ kind, ids }), {
                success: summary("deleted"),
                onSuccess: (data) => {
                  setConfirming(false);
                  finished()(data);
                },
              })
            }
          />
        </>
      )}

      <Button variant="ghost" size="sm" onClick={onDone}>
        <X aria-hidden="true" /> Clear
      </Button>
    </>
  );
}
