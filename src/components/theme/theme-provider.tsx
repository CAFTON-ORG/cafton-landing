"use client"

import * as React from "react"
import { ThemeProviderContext, type Theme } from "@/contexts/theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  /**
   * Pins the site to one theme and ignores both the stored preference and
   * the OS. Set this and the toggle becomes inert -- which is the point
   * while the toggle is commented out of the navbar: a visitor who picked
   * "light" on an earlier visit would otherwise stay stuck there with no
   * way back. Remove the prop to restore normal switching.
   */
  forcedTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  forcedTheme,
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [preference, setPreference] = React.useState<Theme>(
    () => (typeof window !== "undefined" && localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  const theme = forcedTheme ?? preference

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = () => {
      root.classList.remove("light", "dark")
      root.classList.add(
        theme === "system" ? (media.matches ? "dark" : "light") : theme
      )
    }

    apply()

    // On "system", keep tracking the OS after mount. Without this the class
    // is only set once, so changing the OS theme mid-session leaves the site
    // on the theme it happened to load with.
    if (theme !== "system") return

    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, next)
      }
      setPreference(next)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
