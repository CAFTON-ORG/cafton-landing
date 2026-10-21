import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Module boundaries (docs/ARCHITECTURE.md, "Rules"). The public site and the
// dashboard use different primitive libraries and must not reach into each
// other, and components never touch the database.
const dashboardOnly = {
  group: ["@/components/dashboard-ui", "@/components/dashboard-ui/*"],
  message: "dashboard-ui belongs to the dashboard. The public site uses components/ui.",
};
const siteOnly = {
  group: ["@/components/ui", "@/components/ui/*"],
  message:
    "components/ui is the public site's Radix set. The dashboard uses components/dashboard-ui/ui.",
};
const noDb = {
  group: ["@/lib/db", "@/generated/*"],
  message: "Components never touch the database. Read through a feature repository.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Public site code (components, pages, lib): no dashboard-ui.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/**", "src/app/dashboard/**", "src/features/**"],
    rules: restrict(dashboardOnly),
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/dashboard-ui/**"],
    rules: restrict(dashboardOnly, noDb),
  },
  // Dashboard code: no public-site primitives.
  { files: ["src/components/dashboard-ui/**/*.{ts,tsx}"], rules: restrict(siteOnly, noDb) },
  {
    files: ["src/app/dashboard/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: restrict(siteOnly),
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "src/generated/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
