"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LoadMoreListProps {
  /** Pre-rendered rows; the first `pageSize` show, the button reveals the next batch. */
  items: ReactNode[];
  pageSize?: number;
  /** Noun for the button and the count, e.g. "events". */
  noun: string;
}

/**
 * For a list that is secondary and stays on one page (an archive of past
 * events): a "Show more" button instead of numbered pages, which suit lists
 * people search through (the blog and portfolio). Keeps the page static.
 */
export function LoadMoreList({ items, pageSize = 6, noun }: LoadMoreListProps) {
  const [visible, setVisible] = useState(pageSize);
  const remaining = items.length - visible;

  return (
    <>
      <div>{items.slice(0, visible)}</div>
      {remaining > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => setVisible((count) => count + pageSize)}
          >
            Show more {noun}
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {Math.min(visible, items.length)} of {items.length}
          </p>
        </div>
      )}
    </>
  );
}
