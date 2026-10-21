"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Search } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listMediaForPicker } from "../actions";
import type { MediaItem } from "../types";
import { UploadButton } from "./upload-button";

/**
 * "Choose from the library": a dialog of recent images with search and upload. The
 * caller receives the full item (address, size, default description) and decides what
 * to store.
 */
export function MediaPicker({
  onPick,
  label = "Choose image",
}: {
  onPick: (item: MediaItem) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query, 250);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    void listMediaForPicker(search).then((result) => {
      if (ignore) return;
      if (result.ok) {
        setItems(result.data ?? []);
        setError("");
      } else {
        setError(result.error);
      }
    });
    return () => {
      ignore = true;
    };
  }, [open, search]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <ImageIcon aria-hidden="true" /> {label}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Image library</DialogTitle>
          <DialogDescription>Pick an image, or upload a new one.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search images"
              placeholder="Search images…"
              className="pl-9"
            />
          </div>
          <UploadButton
            variant="outline"
            label="Upload"
            onUploaded={(item) => setItems((current) => [item, ...(current ?? [])])}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        {items === null ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No images found.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(item);
                    setOpen(false);
                  }}
                  className="focus-visible:ring-ring bg-muted hover:ring-ring block w-full overflow-hidden rounded-lg border hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
                  title={item.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- picker thumbnail of an external storage URL */}
                  <img
                    src={item.url}
                    alt={item.alt || item.name}
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <span className="sr-only">Use {item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
