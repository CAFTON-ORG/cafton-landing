"use client";

import { useEffect, useState } from "react";

/**
 * The theme actually in effect: "light" or "dark", never "system".
 *
 * `useTheme()` returns the raw *preference*, which is "system" by default
 * for every first-time visitor. Comparing that against "dark" is therefore
 * false even on a dark-mode machine, which is how the 3D mark ended up
 * painting its light-mode colour in both themes.
 *
 * The provider resolves "system" by toggling the `dark` class on <html>, so
 * that class is the single source of truth -- read it, and watch it for
 * changes.
 */
export function useResolvedTheme(): "light" | "dark" {
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;

    const read = () =>
      setResolved(root.classList.contains("dark") ? "dark" : "light");

    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return resolved;
}
