"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatBytes } from "@/lib/media";
import type { Page } from "@/lib/pagination";
import { deleteMedia, updateMediaAlt } from "../actions/media";
import { checkDeleteMedia } from "../rules";
import type { MediaItem } from "../types";
import { UploadButton } from "./upload-button";

function MediaCard({ item, onDelete }: { item: MediaItem; onDelete: (item: MediaItem) => void }) {
  const canUpdate = useCan("content:update");
  const canDelete = useCan("content:delete");
  const { run, pending } = useServerAction();
  const [alt, setAlt] = useState(item.alt);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const blocked = checkDeleteMedia(item);

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the address and copy it by hand.");
    }
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="bg-muted flex aspect-[4/3] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- dashboard thumbnail of an external storage URL */}
        <img
          src={item.url}
          alt={item.alt}
          width={item.width}
          height={item.height}
          loading="lazy"
          className="size-full object-contain"
        />
      </div>
      <CardContent className="grid gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium" title={item.name}>
            {item.name}
          </p>
          <StatusBadge tone={item.uses > 0 ? "success" : "neutral"}>
            {item.uses > 0 ? `Used ×${item.uses}` : "Unused"}
          </StatusBadge>
        </div>
        <p className="text-muted-foreground text-xs">
          {item.width}×{item.height} · {formatBytes(item.sizeBytes)}
        </p>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">Description (alt text)</span>
          <Input
            value={alt}
            disabled={!canUpdate || pending}
            aria-invalid={!!error}
            onChange={(event) => {
              setAlt(event.target.value);
              setError("");
            }}
            onBlur={() => {
              if (alt.trim() === item.alt) return;
              run(() => updateMediaAlt(item.id, alt), {
                success: "Description saved.",
                onFieldErrors: (errors) => setError(errors.alt ?? ""),
              });
            }}
            placeholder="What is in this image?"
          />
          {error && (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          )}
        </label>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{" "}
            {copied ? "Copied" : "Copy address"}
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!!blocked}
              title={blocked ?? "Delete"}
              aria-label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MediaLibrary({ page }: { page: Page<MediaItem> }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const { run, pending } = useServerAction();

  if (page.total === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No images yet"
        description="Upload images here, then pick them when you edit a post, project or event. JPG, PNG or WebP, up to 4 MB each."
        action={<UploadButton onUploaded={() => router.refresh()} />}
      />
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {page.items.map((item) => (
          <li key={item.id}>
            <MediaCard item={item} onDelete={setDeleting} />
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this image?"
        description={`${deleting?.name ?? "The image"} will be removed from storage. This can't be undone.`}
        confirmLabel="Delete image"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          const item = deleting;
          run(() => deleteMedia(item.id), {
            success: "Image deleted.",
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </>
  );
}
