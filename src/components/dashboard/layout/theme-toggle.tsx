"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const isDark = useResolvedTheme() === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
