"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";

type SidebarState = { collapsed: boolean; toggle: () => void };

const SidebarContext = createContext<SidebarState | null>(null);

/**
 * Owns the desktop sidebar's collapsed state so the sidebar and the trigger in the
 * app bar (a different part of the tree) stay in sync. The choice is remembered
 * across visits, and ⌘/Ctrl+B toggles it from anywhere.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorageFlag("sidebar-collapsed");
  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
  return <SidebarContext value={value}>{children}</SidebarContext>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside <SidebarProvider>.");
  return context;
}
