"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Presentation,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/media";
import { cn } from "@/lib/utils";
import { deleteRecordFile, uploadRecordFile } from "../actions/files";
import {
  ACCEPTED_LABEL,
  ACCEPT_ATTRIBUTE,
  MAX_FILES_PER_RECORD,
  checkFileUpload,
  filePermission,
  kindFromMime,
  type FileKind,
  type FileSubject,
} from "../rules/files";
import type { FileView } from "../types/core";

const ICON: Record<FileKind, LucideIcon> = {
  pdf: FileText,
  image: FileImage,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  text: FileIcon,
};

const KEYS = ["leadId", "contactId", "organizationId", "dealId"] as const;

/**
 * The files on a lead, contact, organization or deal: add (several at once, or drop them), open,
 * and remove. A file opens through a link issued per click, so nothing here is publicly readable.
 */
export function FilesPanel({
  subject,
  files,
  currentUserId,
}: {
  subject: FileSubject;
  files: FileView[];
  /** Whose files can be removed without being an administrator. */
  currentUserId?: string;
}) {
  const router = useRouter();
  const canWrite = useCan(filePermission(subject, "update"));
  const canAdminister = useCan("users:update");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [over, setOver] = useState(false);
  const [removing, setRemoving] = useState<FileView | null>(null);
  const { run, pending } = useServerAction();

  function upload(list: FileList | File[]) {
    const chosen = Array.from(list);
    if (chosen.length === 0) return;
    startUpload(async () => {
      let count = files.length;
      for (const file of chosen) {
        const refused = checkFileUpload(file, count);
        if (refused) {
          toast.error(`${file.name}: ${refused}`);
          continue;
        }
        const body = new FormData();
        body.set("file", file);
        for (const key of KEYS) {
          const value = subject[key];
          if (value) body.set(key, value);
        }
        const result = await uploadRecordFile(body);
        if (result.ok) {
          count += 1;
          toast.success(`Added ${file.name}`);
        } else {
          toast.error(result.error);
        }
      }
      router.refresh();
    });
  }

  const mayRemove = (file: FileView) =>
    canWrite && (canAdminister || (!!currentUserId && file.uploadedBy === currentUserId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {canWrite && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              upload(event.dataTransfer.files);
            }}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4 transition-colors",
              over && "border-primary bg-primary/5",
            )}
          >
            <p className="text-muted-foreground max-w-xl text-sm">
              Drop files here, or choose them. {ACCEPTED_LABEL}; up to 4 MB each,{" "}
              {MAX_FILES_PER_RECORD} per record.
            </p>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                if (event.target.files) upload(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              <Upload aria-hidden="true" /> {uploading ? "Uploading…" : "Add files"}
            </Button>
          </div>
        )}

        {files.length === 0 ? (
          <EmptyState
            compact
            icon={Paperclip}
            title="No files yet"
            description="Keep briefs, signed documents and screenshots with the record they belong to."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {files.map((file) => {
              const Icon = ICON[kindFromMime(file.mime)];
              return (
                <li key={file.id} className="flex items-center gap-3 p-3">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/crm/files/${file.id}`}
                      className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {file.name}
                    </a>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(file.sizeBytes)} · {file.uploadedByName} ·{" "}
                      <time dateTime={file.createdAt}>{formatDate(file.createdAt)}</time>
                    </p>
                  </div>
                  {mayRemove(file) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${file.name}`}
                      disabled={pending}
                      onClick={() => setRemoving(file)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <ConfirmDialog
          open={removing !== null}
          onOpenChange={(open) => !open && setRemoving(null)}
          title={`Remove ${removing?.name ?? "this file"}?`}
          description="It is deleted for good. The removal is recorded in the audit log."
          confirmLabel="Remove"
          destructive
          pending={pending}
          onConfirm={() => {
            const target = removing;
            if (!target) return;
            run(() => deleteRecordFile(target.id), {
              success: "File removed.",
              onSuccess: () => {
                setRemoving(null);
                router.refresh();
              },
            });
          }}
        />
      </CardContent>
    </Card>
  );
}
