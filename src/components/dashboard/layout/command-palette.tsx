"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Search, Sun } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/dashboard/ui/command";
import { leavesOf, visibleNavGroups } from "@/config/dashboard-navigation";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useTheme } from "@/hooks/use-theme";
import { signOut } from "./sign-out";
import { useStaff } from "./staff-context";

/**
 * Cmd/Ctrl+K command palette: jump to any page the person may open, switch
 * theme or sign out, keyboard only. Later phases register records (deals,
 * invoices, ...) here through the same search.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const isDark = useResolvedTheme() === "dark";
  const { permissions } = useStaff();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const groups = visibleNavGroups(permissions);

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground h-9 justify-start gap-2 px-3 font-normal max-sm:w-9 max-sm:justify-center max-sm:px-0 sm:w-56 lg:w-72"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search aria-hidden="true" />
        <span className="max-sm:sr-only">Search</span>
        <kbd className="bg-background text-foreground ml-auto rounded border px-1.5 py-0.5 font-mono text-[10px] max-lg:hidden">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search and commands"
        description="Jump to a page or run an action."
      >
        <Command>
          <CommandInput placeholder="Type a page or command…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            {groups.map((group) => (
              <CommandGroup key={group.label || "main"} heading={group.label || "Go to"}>
                {leavesOf(group.items).map(({ href, label, icon: Icon, keywords }) => (
                  <CommandItem
                    key={href}
                    value={`${label} ${keywords?.join(" ") ?? ""}`}
                    onSelect={() => go(href)}
                  >
                    <Icon aria-hidden="true" /> {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                value="toggle theme dark light"
                onSelect={() => {
                  setTheme(isDark ? "light" : "dark");
                  setOpen(false);
                }}
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />} Toggle theme
              </CommandItem>
              <CommandItem
                value="sign out log out"
                onSelect={() => {
                  setOpen(false);
                  void signOut();
                }}
              >
                <LogOut aria-hidden="true" /> Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
