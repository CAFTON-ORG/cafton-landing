import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Fail the test on any WCAG 2.x A/AA violation, listing the offending nodes. `skip` names
 * rules that are knowingly tracked elsewhere, so a regression in anything else still fails.
 */
export async function expectNoA11yViolations(page: Page, skip: string[] = []) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(skip)
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join("\n  ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

/** The page must never scroll sideways. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
