import { ImageIcon, type LucideIcon } from "lucide-react";
import { DotPattern } from "@/components/shared/dot-pattern";
import { cn } from "@/lib/utils";

interface ImagePlaceholderProps {
  className?: string;
  /** Screen-reader-only description of what real content will eventually go here. */
  label: string;
  icon?: LucideIcon;
}

/**
 * Stand-in for real photography/artwork that hasn't been supplied yet --
 * the site's own dot-pattern + glow language (already used by the hero
 * and the blog cards) rather than a broken image icon or a grey box, so
 * pages read as intentionally unfinished, not broken.
 */
export function ImagePlaceholder({ className, label, icon: Icon = ImageIcon }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl border bg-muted/30",
        className,
      )}
    >
      <DotPattern size="sm" opacity="low" fadeStyle="ellipse" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_8%,transparent)_0%,transparent_65%)]"
      />
      <Icon className="relative size-8 text-muted-foreground/40" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
