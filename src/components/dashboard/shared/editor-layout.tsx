"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const GAP = 24;

/**
 * The standard layout of every editing page: the work on the left (about two thirds), and on the
 * right a rail with the actions (`FormActions`) at its top, then what describes the work: details,
 * a live preview, short help. The two columns start on the same line.
 *
 * The rail stays in view while the work scrolls, and it never scrolls inside itself: the page does
 * the scrolling, so nothing is ever cut off and there is no second scrollbar. A rail that fits on
 * the screen is pinned at the top. A rail taller than the screen is pinned by its bottom edge
 * instead, so scrolling the page reveals all of it (the usual "sticky sidebar" technique). On a
 * phone the rail stacks under the work.
 */
export function EditorLayout({
  rail,
  className,
  children,
}: {
  rail: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const aside = useRef<HTMLElement>(null);
  const [top, setTop] = useState(GAP);

  useEffect(() => {
    const element = aside.current;
    if (!element) return;
    const main = document.getElementById("main");
    const measure = () => {
      const view = main?.clientHeight ?? window.innerHeight;
      const height = element.offsetHeight;
      // Fits: pin the top. Taller than the screen: a negative offset pins the bottom edge.
      setTop(height + GAP * 2 <= view ? GAP : view - height - GAP);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (main) observer.observe(main);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "grid items-start gap-4 max-lg:pb-16 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]",
        className,
      )}
    >
      <div className="grid min-w-0 content-start gap-4">{children}</div>
      <aside ref={aside} style={{ top }} className="grid min-w-0 content-start gap-4 lg:sticky">
        {rail}
      </aside>
    </div>
  );
}
