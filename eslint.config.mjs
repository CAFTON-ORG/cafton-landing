import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Module boundaries (docs/adr/0004-folder-structure.md). The public site
// (components/marketing, components/ui) and the dashboard (components/dashboard)
// use different primitive libraries and must not reach into each other.
// components/shared is the neutral ground and may import neither. Components
// never touch the database.
const dashboardOnly = {
  group: ["@/components/dashboard", "@/components/dashboard/*"],
  message:
    "components/dashboard belongs to the dashboard. The public site uses components/ui and components/marketing.",
};
const siteOnly = {
  group: [
    "@/components/ui",
    "@/components/ui/*",
    "@/components/marketing",
    "@/components/marketing/*",
  ],
  message:
    "components/ui and components/marketing belong to the public site. The dashboard uses components/dashboard.",
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
  // Everything outside the dashboard's UI: no dashboard components.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/**", "src/app/dashboard/**", "src/features/**/components/**"],
    rules: restrict(dashboardOnly),
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/dashboard/**", "src/components/shared/**"],
    rules: restrict(dashboardOnly, noDb),
  },
  // Neutral ground: neither surface.
  {
    files: ["src/components/shared/**/*.{ts,tsx}"],
    rules: restrict(dashboardOnly, siteOnly, noDb),
  },
  // Dashboard UI: no public-site components.
  { files: ["src/components/dashboard/**/*.{ts,tsx}"], rules: restrict(siteOnly, noDb) },
  {
    files: ["src/app/dashboard/**/*.{ts,tsx}", "src/features/**/components/**/*.{ts,tsx}"],
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
