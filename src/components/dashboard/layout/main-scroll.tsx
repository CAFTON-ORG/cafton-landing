"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * The dashboard's one scroll area. The page itself never scrolls (the shell is exactly
 * one screen tall), so a short page has nothing to scroll and a long one scrolls under a
 * fixed app bar. Because the browser only resets the window's scroll on navigation, this
 * returns to the top itself when the route changes.
 */
export function MainScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [pathname]);

  return (
    <main
      id="main"
      data-app-main
      ref={ref}
      tabIndex={0}
      className="focus-visible:ring-ring min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
    </main>
  );
}
