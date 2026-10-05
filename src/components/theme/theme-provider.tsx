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
  const [preference, setPreference] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    // Only a known value is trusted: anything else in storage would be
    // written straight onto <html> as a class name.
    const stored = localStorage.getItem(storageKey)
    return stored === "dark" || stored === "light" || stored === "system"
      ? stored
      : defaultTheme
  })

  const theme = forcedTheme ?? preference

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = () => {
      const next = theme === "system" ? (media.matches ? "dark" : "light") : theme
      if (root.classList.contains(next)) return

      // Every element with a colour transition would otherwise animate to
      // the new theme at its own pace, which reads as a laggy, staggered
      // switch. Suppress transitions for the one frame the class flips.
      const style = document.createElement("style")
      style.textContent = "*,*::before,*::after{transition:none!important}"
      document.head.appendChild(style)

      root.classList.remove("light", "dark")
      root.classList.add(next)

      void window.getComputedStyle(document.body).opacity
      window.setTimeout(() => style.remove(), 1)
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
