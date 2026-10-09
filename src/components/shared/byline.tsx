import type { ReactNode } from "react";
import Link from "next/link";
import { AuthorAvatar } from "@/components/shared/author-avatar";
import { cn } from "@/lib/utils";
import type { Author } from "@/types/content";

interface BylineProps {
  author: Author;
  /** Lead-in word, e.g. "Written by", "Built by", "Posted by". */
  label: string;
  /** Anything to show on the second line instead of the author's role (a date, a reading time). */
  meta?: ReactNode;
  /** Set to false inside another link, where a nested link would be invalid. */
  linked?: boolean;
  className?: string;
}

/**
 * Credit line: avatar, "label name", and a second line. The name is a link
 * when the author has a profile page. Marked up with `rel="author"` so the
 * attribution is machine-readable as well as visible.
 */
export function Byline({ author, label, meta, linked = true, className }: BylineProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AuthorAvatar author={author} />
      <div className="min-w-0 text-sm leading-tight">
        <p>
          <span className="text-muted-foreground">{label} </span>
          {linked && author.url ? (
            <Link href={author.url} rel="author" className="font-semibold hover:underline">
              {author.name}
            </Link>
          ) : (
            <span className="font-semibold">{author.name}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{meta ?? author.role}</p>
      </div>
    </div>
  );
}
