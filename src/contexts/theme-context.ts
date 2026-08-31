import * as React from "react";

/**
 * The theme *preference*. "system" defers to the OS -- it is a valid
 * preference, not a resolved value, so anything that needs "light" or "dark"
 * concretely should use `useResolvedTheme()` instead of comparing this.
 *
 * Single source of truth on purpose: this type used to be declared
 * separately here and in theme-provider.tsx, and the two drifted -- the
 * provider's included "system" and this one didn't, so the provider's value
 * stopped being assignable to its own context and CI failed type checking.
 */
export type Theme = "dark" | "light" | "system";

export type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

export const ThemeProviderContext =
  React.createContext<ThemeProviderState>(initialState);
