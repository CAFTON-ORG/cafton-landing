import { cn } from "@/lib/utils";

const SIZES = {
  sm: {
    topLeft: "left-0.5 top-0.5 size-1.5",
    topRight: "right-0.5 top-0.5 size-1.5",
    bottomLeft: "bottom-0.5 left-0.5 size-1.5",
    bottomRight: "bottom-0.5 right-0.5 size-1.5",
  },
  md: {
    topLeft: "left-2 top-2 size-3",
    topRight: "right-2 top-2 size-3",
    bottomLeft: "bottom-2 left-2 size-3",
    bottomRight: "bottom-2 right-2 size-3",
  },
} as const;

interface CornerBracketsProps {
  size?: keyof typeof SIZES;
}

/**
 * Fades in on hover/focus of a `group` ancestor -- the game-UI-reticle nod
 * shared by the navbar links, the service-select overlay tiles, and the
 * services grid cards.
 */
export function CornerBrackets({ size = "md" }: CornerBracketsProps) {
  const s = SIZES[size];
  return (
    <>
      <span
        className={cn(
          "pointer-events-none absolute border-l border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60",
          s.topLeft,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute border-r border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60",
          s.topRight,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute border-b border-l border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60",
          s.bottomLeft,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute border-b border-r border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60",
          s.bottomRight,
        )}
      />
    </>
  );
}
