import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Reveal blocks for general page sections. These are plain server components
// that only mark an element `.reveal`:
// - on load, a block that is already on screen fades up with a short CSS
//   animation (staggered by its `--reveal-index`), which starts at first
//   paint and needs no JavaScript;
// - a block below the fold is faded up the first time it scrolls into view by
//   `RevealObserver` (mounted once in the layout).
// Markup is visible by default, so nothing is hidden before hydration and
// visitors who prefer reduced motion see everything in place. The 3D hero
// has its own timeline.

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Distance in px the element rises from. Defaults to a subtle 16px. */
  y?: number;
}

/** Fades + rises a single block in. */
export function Reveal({ children, className, y }: RevealProps) {
  const style = y === undefined ? undefined : ({ "--reveal-y": `${y}px` } as CSSProperties);

  return (
    <div className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
}

interface RevealItemProps extends RevealGroupProps {
  /** Position within the group; set by `RevealGroup`, drives the stagger. */
  index?: number;
}

/** Wrap a list/grid; each direct `<RevealItem>` child staggers in after the one before it. */
export function RevealGroup({ children, className }: RevealGroupProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) =>
        isValidElement(child) && child.type === RevealItem ? cloneElement(child as ReactElement<RevealItemProps>, { index }) : child,
      )}
    </div>
  );
}

export function RevealItem({ children, className, index = 0 }: RevealItemProps) {
  return (
    <div
      className={cn("reveal", className)}
      style={{ "--reveal-index": index } as CSSProperties}
    >
      {children}
    </div>
  );
}
