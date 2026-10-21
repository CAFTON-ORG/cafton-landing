"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Eye, EyeOff, FileText, Plus, Trash2 } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, formatRelative } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import { deleteContent, setContentStatus } from "../admin/actions";
import { CONTENT_TABLE } from "../admin/table";
import {
  CONTENT_STATUSES,
  STATUS_LABEL,
  type AdminListRow,
  type ContentKind,
} from "../admin/types";
import { checkDeleteContent } from "../rules";

const COPY: Record<ContentKind, { noun: string; plural: string; search: string; empty: string }> = {
  post: {
    noun: "post",
    plural: "Blog posts",
    search: "Search posts…",
    empty: "Write your first post. It stays a draft until you publish it.",
  },
  project: {
    noun: "project",
    plural: "Projects",
    search: "Search projects…",
    empty: "Projects appear in the portfolio once they are published.",
  },
  event: {
    noun: "event",
    plural: "Events",
    search: "Search events…",
    empty: "Events appear on the events page once they are published.",
  },
  partner: {
    noun: "partner",
    plural: "Partners",
    search: "Search partners…",
    empty: "Partners appear on the site once they are published.",
  },
};

/**
 * One list for every content type: search, status filter, sort, publish/unpublish and
 * delete. Posts link to their editor; the other types are managed from here for now.
 */
export function ContentTable({ kind, page }: { kind: ContentKind; page: Page<AdminListRow> }) {
  const table = useTableParams(CONTENT_TABLE);
  const canCreate = useCan("content:create");
  const canPublish = useCan("content:publish");
  const canDelete = useCan("content:delete");
  const { run, pending } = useServerAction();
  const [deleting, setDeleting] = useState<AdminListRow | null>(null);
  const copy = COPY[kind];
  const hasDate = kind === "post";

  const columns: Column<AdminListRow>[] = [
    {
      id: "title",
      header: copy.noun.charAt(0).toUpperCase() + copy.noun.slice(1),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          {kind === "post" ? (
            <Link
              href={`/dashboard/content/blog/${row.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.title}
            </Link>
          ) : (
            <span className="font-medium">{row.title}</span>
          )}
          {row.subtitle && <p className="text-muted-foreground truncate text-xs">{row.subtitle}</p>}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={row.status === "published" ? "success" : "neutral"}>
          {STATUS_LABEL[row.status]}
        </StatusBadge>
      ),
    },
    ...(hasDate
      ? [
          {
            id: "date",
            header: "Post date",
            sortable: true,
            hideBelow: "md" as const,
            cell: (row: AdminListRow) => (row.date ? formatDate(row.date) : "—"),
          },
        ]
      : []),
    {
      id: "updated",
      header: "Edited",
      sortable: true,
      hideBelow: "sm",
      cell: (row) => (
        <time dateTime={row.updatedAt} className="text-muted-foreground">
          {formatRelative(row.updatedAt)}
        </time>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => {
        const blocked = checkDeleteContent(row);
        return (
          <div className="flex justify-end gap-1">
            {row.status === "published" && (
              <Button
                variant="ghost"
                size="icon"
                nativeButton={false}
                render={<a href={row.publicHref} target="_blank" rel="noopener noreferrer" />}
                aria-label={`View ${row.title} on the site (opens in a new tab)`}
              >
                <ExternalLink aria-hidden="true" />
              </Button>
            )}
            {canPublish && (
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`${row.status === "published" ? "Unpublish" : "Publish"} ${row.title}`}
                title={row.status === "published" ? "Unpublish" : "Publish"}
                onClick={() =>
                  run(
                    () =>
                      setContentStatus(
                        kind,
                        row.id,
                        row.status === "published" ? "draft" : "published",
                      ),
                    {
                      success: row.status === "published" ? "Unpublished." : "Published.",
                    },
                  )
                }
              >
                {row.status === "published" ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                disabled={!!blocked || pending}
                title={blocked ?? "Delete"}
                aria-label={`Delete ${row.title}`}
                onClick={() => setDeleting(row)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const add =
    kind === "post" && canCreate ? (
      <Button nativeButton={false} render={<Link href="/dashboard/content/blog/new" />}>
        <Plus aria-hidden="true" /> New post
      </Button>
    ) : undefined;

  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(row) => row.id}
      caption={copy.plural}
      searchLabel={`Search ${copy.plural.toLowerCase()}`}
      searchPlaceholder={copy.search}
      filters={[
        {
          id: "status",
          label: "Status",
          allLabel: "All statuses",
          options: CONTENT_STATUSES.map((status) => ({
            value: status,
            label: STATUS_LABEL[status],
          })),
        },
      ]}
      actions={add}
      emptyIcon={FileText}
      emptyTitle={`No ${copy.plural.toLowerCase()} yet`}
      emptyDescription={copy.empty}
      emptyAction={add}
    >
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete this ${copy.noun}?`}
        description={`"${deleting?.title ?? ""}" will be removed from the dashboard. It is already off the website.`}
        confirmLabel={`Delete ${copy.noun}`}
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          const row = deleting;
          run(() => deleteContent(kind, row.id), {
            success: "Deleted.",
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </ResourceTable>
  );
}
