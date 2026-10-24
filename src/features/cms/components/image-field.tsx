"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Upload, X } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { MediaPicker } from "@/features/media/components/media-picker";
import { useUpload } from "@/features/media/components/use-upload";
import type { MediaItem } from "@/features/media/types/core";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Picks one image. Empty it is a drop zone (drop a file, browse, or choose from the
 * library); filled it is a preview with Replace / Remove. A typed address (a path under
 * /public or an https URL) lives under "Use an address instead" for images that were
 * never uploaded. When a library image is chosen or uploaded, `onPicked` also receives
 * its size and default description.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  onPicked,
  error,
  hint,
  aspect = "aspect-video",
  fit = "cover",
  placeholder = "/images/example.jpg",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPicked?: (item: MediaItem) => void;
  error?: string;
  hint?: string;
  /** Tailwind aspect class of the preview, e.g. `aspect-square` for a logo. */
  aspect?: string;
  fit?: "cover" | "contain";
  placeholder?: string;
}) {
  const canUpload = useCan("content:create");
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [typed, setTyped] = useState(false);

  const choose = (item: MediaItem) => {
    onChange(item.url);
    onPicked?.(item);
  };
  // A single image: if several files are dropped, the first one is used.
  const { upload, uploading } = useUpload(choose);
  const send = (files: File[]) => void upload(files.slice(0, 1));

  const name = value.split("/").pop()?.split("?")[0] ?? "";

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="grid gap-2">
        <input
          ref={file}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`Upload ${label.toLowerCase()}`}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            send(files);
          }}
        />

        {value ? (
          <div className="bg-muted/40 overflow-hidden rounded-lg border">
            <div className={cn("bg-muted relative w-full", aspect)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- editor preview of an arbitrary address */}
              <img
                src={value}
                alt=""
                className={cn(
                  "absolute inset-0 size-full",
                  fit === "contain" ? "object-contain p-3" : "object-cover",
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t p-2">
              <p className="text-muted-foreground min-w-0 truncate text-xs" title={value}>
                {name}
              </p>
              <div className="flex shrink-0 gap-1">
                <MediaPicker label="Replace" onPick={choose} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange("")}
                  aria-label={`Remove ${label.toLowerCase()}`}
                >
                  <X aria-hidden="true" /> Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(event) => {
              if (!canUpload) return;
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              if (canUpload) send(Array.from(event.dataTransfer.files));
            }}
            className={cn(
              "grid place-items-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors",
              over ? "border-ring bg-accent" : "bg-muted/30",
            )}
          >
            <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full">
              <ImagePlus className="size-5" aria-hidden="true" />
            </span>
            <div className="grid gap-1">
              <p className="text-sm font-medium">
                {uploading ? "Uploading…" : canUpload ? "Drop an image here" : "No image yet"}
              </p>
              <p className="text-muted-foreground text-xs">JPG, PNG or WebP, up to 4 MB</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {canUpload && (
                <Button
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={() => file.current?.click()}
                >
                  <Upload aria-hidden="true" /> Upload
                </Button>
              )}
              <MediaPicker label="Choose from library" onPick={choose} />
            </div>
          </div>
        )}

        {typed ? (
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={!!error}
            placeholder={placeholder}
            aria-label={`${label} address`}
            autoComplete="off"
          />
        ) : (
          <button
            type="button"
            id={id}
            onClick={() => setTyped(true)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            <Link2 className="size-3" aria-hidden="true" /> Use an address instead
          </button>
        )}
      </div>
    </Field>
  );
}
