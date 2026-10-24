"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { MAX_UPLOAD_BYTES } from "@/lib/media";
import { uploadMedia } from "../actions/media";
import type { MediaItem } from "../types";

/**
 * Uploads files one request each (hosts cap request size) and reports as it goes.
 * Files over the limit are skipped with a message instead of failing the batch.
 */
export function useUpload(onUploaded?: (item: MediaItem) => void) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      let done = 0;
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name} is larger than 4 MB. Resize it and try again.`);
          continue;
        }
        const body = new FormData();
        body.set("file", file);
        try {
          const result = await uploadMedia(body);
          if (result.ok && result.data) {
            done++;
            onUploaded?.(result.data);
          } else if (!result.ok) {
            toast.error(result.error);
          }
        } catch {
          toast.error(`Couldn't upload ${file.name}. Check your connection and try again.`);
        }
      }
      setUploading(false);
      if (done > 0) toast.success(done === 1 ? "Image uploaded." : `${done} images uploaded.`);
    },
    [onUploaded],
  );

  return { upload, uploading };
}
