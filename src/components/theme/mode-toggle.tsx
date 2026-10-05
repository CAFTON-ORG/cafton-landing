"use client"

import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"

interface ModeToggleProps {
  variant?: "outline" | "ghost" | "default"
}

export function ModeToggle({ variant = "outline" }: ModeToggleProps) {
  const { setTheme } = useTheme()
  const isDarkMode = useResolvedTheme() === "dark"

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
      className="cursor-pointer"
    >
      {/* Show the icon for the mode you can switch TO */}
      {isDarkMode ? <Sun className="size-[1.2rem]" /> : <Moon className="size-[1.2rem]" />}
      <span className="sr-only">
        Switch to {isDarkMode ? "light" : "dark"} mode
      </span>
    </Button>
  )
}
