// Screenshots every dashboard screen (light and dark, desktop and phone), and reports console
// errors and accessibility violations (axe, WCAG 2.2 A/AA) for each one.
//
//   1. npm run db:local && DATABASE_URL=<local url> npm run db:seed-demo     (sample data;
//      also db:seed-sales and db:seed-delivery for the sales and delivery screens)
//   2. start a dev server against it with Supabase blanked, so you are the preview owner:
//        NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= DATABASE_URL=<local url> \
//        NEXT_DIST_DIR=.next-preview npx next dev -p 3200
//   3. npm run design:review            (BASE_URL defaults to http://localhost:3200)
//
// Output: .design-review/<theme>-<viewport>/<page>.png (git-ignored).
//
// Afterwards run `git checkout tsconfig.json`: Next edits it while a server with NEXT_DIST_DIR runs,
// and delete .next-preview/.
import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import pg from "pg";

const BASE = process.env.BASE_URL || "http://localhost:3200";
const OUT = ".design-review";
const only = process.argv[2]; // optional substring filter, e.g. "deals"

async function recordIds() {
  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5544/postgres",
  });
  await client.connect();
  const one = async (sql) => (await client.query(sql)).rows[0]?.id;
  const ids = {
    lead: await one("SELECT id FROM leads WHERE status = 'new' ORDER BY created_at DESC LIMIT 1"),
    deal: await one("SELECT id FROM deals WHERE title = 'Online ordering and inventory'"),
    contact: await one("SELECT id FROM contacts ORDER BY last_name LIMIT 1"),
    org: await one("SELECT id FROM organizations ORDER BY name LIMIT 1"),
    post: await one("SELECT id FROM blog_posts ORDER BY date DESC LIMIT 1"),
    project: await one("SELECT id FROM portfolio_projects ORDER BY position LIMIT 1"),
    event: await one("SELECT id FROM events ORDER BY position LIMIT 1"),
    quote: await one("SELECT id FROM quotes WHERE status = 'draft' LIMIT 1"),
    // Public links are stored as hashes, so the seed script uses fixed secrets (see scripts/seed-sales.mjs).
    sentQuote: "designreviewtoken_aaaaaaaaaaaaaaaaaaaaaaaa",
    sentContract: "designreviewtoken_aaaaaaaaaaaaaaaaaaaaaaaac",
    contract: await one("SELECT id FROM contracts WHERE status = 'draft' LIMIT 1"),
    partner: await one("SELECT id FROM partners WHERE featured LIMIT 1"),
    // From scripts/seed-delivery.mjs.
    delivery: await one("SELECT id FROM projects WHERE status = 'active' LIMIT 1"),
  };
  await client.end();
  return ids;
}

const ids = await recordIds();
const PAGES = [
  ["login", "/login"],
  ["overview", "/dashboard"],
  ["crm-overview", "/dashboard/crm"],
  ["leads", "/dashboard/crm/leads"],
  ["lead-detail", `/dashboard/crm/leads/${ids.lead}`],
  ["deals-board", "/dashboard/crm/deals"],
  ["deals-table", "/dashboard/crm/deals?view=table"],
  ["deal-detail", `/dashboard/crm/deals/${ids.deal}`],
  ["contacts", "/dashboard/crm/contacts"],
  ["contact-detail", `/dashboard/crm/contacts/${ids.contact}`],
  ["organizations", "/dashboard/crm/organizations"],
  ["organization-detail", `/dashboard/crm/organizations/${ids.org}`],
  ["tasks", "/dashboard/crm/tasks"],
  ["pipelines", "/dashboard/crm/pipelines"],
  ["custom-fields", "/dashboard/crm/custom-fields"],
  ["quotes", "/dashboard/sales/quotes"],
  ["quote-detail", `/dashboard/sales/quotes/${ids.quote}`],
  ["catalog", "/dashboard/sales/catalog"],
  ["sales-overview", "/dashboard/sales"],
  ["contracts", "/dashboard/sales/contracts"],
  ["contract-detail", `/dashboard/sales/contracts/${ids.contract}`],
  ["contract-templates", "/dashboard/sales/contracts/templates"],
  ["projects", "/dashboard/projects"],
  ["project-detail", `/dashboard/projects/${ids.delivery}`],
  ["project-templates", "/dashboard/projects/templates"],
  ["finance-accounts", "/dashboard/finance/accounts"],
  ["finance-journal", "/dashboard/finance/journal"],
  ["finance-periods", "/dashboard/finance/periods"],
  ["finance-tax", "/dashboard/finance/tax"],
  ["finance-invoices", "/dashboard/finance/invoices"],
  ["finance-payments", "/dashboard/finance/payments"],
  ["finance-receivables", "/dashboard/finance/receivables"],
  ["finance-vendors", "/dashboard/finance/vendors"],
  ["finance-bills", "/dashboard/finance/bills"],
  ["finance-payables", "/dashboard/finance/payables"],
  ["finance-expenses", "/dashboard/finance/expenses"],
  ["finance-recurring", "/dashboard/finance/recurring"],
  ["finance-bank", "/dashboard/finance/bank"],
  ["finance-overview", "/dashboard/finance"],
  ["finance-settings", "/dashboard/finance/settings"],
  ["finance-taxes", "/dashboard/finance/taxes"],
  ["finance-reports", "/dashboard/finance/reports"],
  ["finance-report-profit", "/dashboard/finance/reports/profit-and-loss"],
  ["finance-report-balance", "/dashboard/finance/reports/balance-sheet"],
  ["timesheet", "/dashboard/time"],
  ["approvals", "/dashboard/time?tab=approvals"],
  ["utilisation", "/dashboard/time?tab=utilisation"],
  ["public-contract", `/c/${ids.sentContract}`],
  ["public-quote", `/q/${ids.sentQuote}`],
  ["duplicates", "/dashboard/crm/duplicates"],
  ["schedule", "/dashboard/crm/schedule"],
  ["schedule-week", "/dashboard/crm/schedule?view=week"],
  ["booking-settings", "/dashboard/crm/schedule/settings"],
  ["blog-posts", "/dashboard/content/blog"],
  ["website-overview", "/dashboard/content"],
  ["pages-index", "/dashboard/content/pages"],
  ["page-about", "/dashboard/content/pages/about"],
  ["page-services", "/dashboard/content/pages/services"],
  ["site-settings", "/dashboard/content/site"],
  ["site-seo", "/dashboard/content/site/seo"],
  ["post-new", "/dashboard/content/blog/new"],
  ["post-edit", `/dashboard/content/blog/${ids.post}`],
  ["content-projects", "/dashboard/content/projects"],
  ["project-new", "/dashboard/content/projects/new"],
  ["project-edit", `/dashboard/content/projects/${ids.project}`],
  ["event-new", "/dashboard/content/events/new"],
  ["event-edit", `/dashboard/content/events/${ids.event}`],
  ["partner-edit", `/dashboard/content/partners/${ids.partner}`],
  ["faqs", "/dashboard/content/faqs"],
  ["media-library", "/dashboard/content/media"],
  ["content-events", "/dashboard/content/events"],
  ["content-partners", "/dashboard/content/partners"],
  ["people", "/dashboard/users"],
  ["roles", "/dashboard/roles"],
  ["audit", "/dashboard/audit"],
  ["settings", "/dashboard/settings"],
  ["not-found", "/dashboard/crm/deals/00000000-0000-4000-8000-000000000000"],
].filter(([name]) => !only || name.includes(only));

// Dialogs and other states reached by clicking: [page name, button label, screenshot name].
const INTERACTIONS = [
  ["deals-board", "New deal", "dialog-new-deal"],
  ["lead-detail", "Convert to deal", "dialog-convert-lead"],
  ["lead-detail", "Disqualify", "dialog-disqualify"],
  ["lead-detail", "Send an email", "dialog-send-email"],
  ["custom-fields", "Add a field", "dialog-add-field"],
  ["deal-detail", "Mark as won", "dialog-win-deal"],
  ["deal-detail", "Edit", "dialog-edit-deal"],
  ["contacts", "Add contact", "dialog-add-contact"],
  ["organizations", "Add organization", "dialog-add-organization"],
  ["roles", "New role", "dialog-new-role"],
  ["people", "Invite person", "dialog-invite"],
  // "a|b" tries each name; "tab:Name" clicks a tab instead of a button.
  ["post-edit", "Replace|Choose from library", "dialog-image-picker"],
  ["project-edit", "tab:Images", "tab-images"],
  ["project-edit", "tab:Story", "tab-story"],
  ["event-edit", "tab:Prizes", "tab-prizes"],
  ["event-edit", "tab:How to join", "tab-join"],
  ["event-edit", "tab:Poster and promotion", "tab-poster"],
];

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
};
const RUNS = [
  ["dark", "desktop"],
  ["light", "desktop"],
  ["dark", "phone"],
  ["light", "phone"],
];

const browser = await chromium.launch();
const problems = [];

for (const [theme, viewport] of RUNS) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    reducedMotion: "reduce",
  });
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("cafton-theme", value);
    } catch {}
  }, theme);
  const dir = path.join(OUT, `${theme}-${viewport}`);
  fs.mkdirSync(dir, { recursive: true });

  for (const [name, url] of PAGES) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text().slice(0, 200));
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message.slice(0, 200)}`));
    await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });

    // Accessibility on every theme and viewport: contrast differs between light and dark.
    let violations = [];
    {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      violations = result.violations.map(
        (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target?.join(" ")}`,
      );
    }
    // Horizontal overflow check (the page must never scroll sideways).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) violations.push(`horizontal-overflow: ${overflow}px`);

    for (const [pageName, label, shot] of INTERACTIONS.filter(([pageName]) => pageName === name)) {
      const [role, names] = label.startsWith("tab:") ? ["tab", label.slice(4)] : ["button", label];
      let button = page.getByRole(role, { name: names.split("|")[0], exact: true }).first();
      for (const alt of names.split("|").slice(1))
        if ((await button.count()) === 0)
          button = page.getByRole(role, { name: alt, exact: true }).first();
      if ((await button.count()) === 0) {
        problems.push(`[${theme}/${viewport}] ${pageName}: button "${label}" not found`);
        continue;
      }
      await button.click();
      // Dialogs fade and zoom in; axe measures contrast mid-animation if it runs too early.
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(dir, `${shot}.png`) });
      {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        for (const v of result.violations)
          violations.push(
            `${shot}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target?.join(" ")}`,
          );
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }

    for (const message of [...errors, ...violations])
      problems.push(`[${theme}/${viewport}] ${name}: ${message}`);
    await page.close();
  }
  await context.close();
}
await browser.close();

console.log(`Screenshots in ${OUT}/ (${RUNS.length * PAGES.length} images).`);
if (problems.length) {
  console.log(`\n${problems.length} issue(s):`);
  for (const line of problems) console.log(" - " + line);
  process.exitCode = 1;
} else {
  console.log("No console errors, accessibility violations or horizontal overflow.");
}
