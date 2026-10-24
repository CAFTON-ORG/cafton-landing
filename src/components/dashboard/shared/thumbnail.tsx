import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A small square picture of a thing (a cover, poster or logo) with its icon as the
 * fallback. Rounded square on purpose: circles are for people (`UserAvatar`), so the
 * two are never confused in a list.
 */
export function Thumbnail({
  src,
  icon: Icon,
  size = "md",
  fit = "cover",
  className,
}: {
  src?: string | null;
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  fit?: "cover" | "contain";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground relative grid shrink-0 place-items-center overflow-hidden rounded-lg border",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-12",
        fit === "contain" && src && "bg-white",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- list thumbnail of an arbitrary address
        <img
          src={src}
          alt=""
          loading="lazy"
          className={cn("size-full", fit === "contain" ? "object-contain p-1" : "object-cover")}
        />
      ) : (
        <Icon className="size-4" />
      )}
    </span>
  );
}
