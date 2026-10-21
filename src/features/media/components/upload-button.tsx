"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/media";
import type { MediaItem } from "../types";
import { useUpload } from "./use-upload";

/** A button that opens the file picker (several files allowed) and uploads what is chosen. */
export function UploadButton({
  onUploaded,
  variant = "default",
  label = "Upload images",
}: {
  onUploaded?: (item: MediaItem) => void;
  variant?: "default" | "outline";
  label?: string;
}) {
  const canUpload = useCan("content:create");
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUpload(onUploaded);
  if (!canUpload) return null;

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose images to upload"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />
      <Button
        type="button"
        variant={variant}
        disabled={uploading}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden="true" /> {uploading ? "Uploading…" : label}
      </Button>
    </>
  );
}
