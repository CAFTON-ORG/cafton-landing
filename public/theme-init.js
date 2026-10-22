// Runs while the HTML is parsed, before first paint (loaded from <head> by app/layout.tsx).
// - applies a stored light preference so returning light-mode visitors don't see a dark flash;
// - marks the page when a cookie choice already exists, so the cookie notice stays hidden for
//   returning visitors instead of flashing.
// Keep the two names in step with THEME_STORAGE_KEY (config/site.ts) and CONSENT_COOKIE (lib/consent.ts).
try {
  var root = document.documentElement;
  var theme = localStorage.getItem("cafton-theme");
  if (
    theme === "light" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: light)").matches)
  ) {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  if (document.cookie.indexOf("cafton_consent=") > -1) root.setAttribute("data-consent", "");
} catch {
  // Storage or cookies blocked: the page falls back to its server-rendered defaults.
}
