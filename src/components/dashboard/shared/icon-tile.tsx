import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The avatar of a thing that is not a person (a quote, a deal, a contract): its icon in a soft square. */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
