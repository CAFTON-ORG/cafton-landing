import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Scroll-reveal blocks for general page sections, driven entirely by CSS
// (`.reveal` in globals.css, a scroll-linked animation). Nothing here ships
// JavaScript, and the content is never hidden by script: browsers without
// scroll-linked animations, and visitors who prefer reduced motion, simply
// see everything in place. The 3D hero has its own timeline.

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Distance in px the element rises from. Defaults to a subtle 16px. */
  y?: number;
}

/** Fades + rises a single block in as it scrolls into view. */
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

/** Wrap a list/grid; each direct `<RevealItem>` child reveals as it scrolls in. */
export function RevealGroup({ children, className }: RevealGroupProps) {
  return <div className={className}>{children}</div>;
}

export function RevealItem({ children, className }: RevealGroupProps) {
  return <div className={cn("reveal", className)}>{children}</div>;
}
