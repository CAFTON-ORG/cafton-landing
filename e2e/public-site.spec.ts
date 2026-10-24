import { expect, test } from "@playwright/test";

import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

// The public pages, served from the bundled content (no database in the e2e run).
const PAGES = [
  ["home", "/"],
  ["about", "/about"],
  ["services", "/services"],
  ["portfolio", "/portfolio"],
  ["blog", "/blog"],
  ["events", "/events"],
  ["contact", "/contact"],
  ["privacy", "/privacy"],
] as const;

test.describe("public site", () => {
  for (const [name, path] of PAGES) {
    test(`${name} renders with one heading, no sideways scroll`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    for (const [name, path] of PAGES) {
      test(`${name} has no accessibility violations (${scheme})`, async ({ page }) => {
        // Reduced motion shows every block at rest, so the check measures the real colours instead of
        // a section caught halfway through its fade-in.
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(path);
        // The opening splash fades out over the page; measure once it is gone.
        await page.locator(".fixed.inset-0.z-100").waitFor({ state: "detached" });
        await expectNoA11yViolations(page);
      });
    }
  }

  test("an unknown address shows the not-found page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("the dashboard is not reachable without signing in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
