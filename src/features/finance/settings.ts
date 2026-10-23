/**
 * The finance settings of the business, as plain data with the rules for reading them. Pure: no
 * database. Whether the business is VAT-registered decides the tax a new quote starts with, so
 * a non-VAT business never has VAT added to a quote by default.
 */

export const DEFAULT_VAT_RATE_PCT = 12;
export const DEFAULT_PAYMENT_TERMS_DAYS = 15;

export interface FinanceSettingsView {
  vatRegistered: boolean;
  vatRatePct: number;
  paymentTermsDays: number;
  paymentInstructions: string;
  /** Whole centavos an hour, or null when no standard rate is set. */
  defaultHourlyRateMinor: number | null;
}

export const DEFAULT_SETTINGS: FinanceSettingsView = {
  vatRegistered: false,
  vatRatePct: DEFAULT_VAT_RATE_PCT,
  paymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
  paymentInstructions: "",
  defaultHourlyRateMinor: null,
};

/** The tax a new quote starts with: none for a business that isn't VAT-registered. */
export const defaultQuoteTaxPct = (
  settings: Pick<FinanceSettingsView, "vatRegistered" | "vatRatePct">,
) => (settings.vatRegistered ? settings.vatRatePct : 0);

/** The tax choices a quote offers: no VAT, or the business's VAT rate added. */
export function quoteTaxChoices(
  vatRatePct: number,
  current?: number,
): { pct: number; label: string }[] {
  const choices = [
    { pct: 0, label: "No VAT" },
    { pct: vatRatePct, label: `VAT ${vatRatePct}% added` },
  ];
  // A quote made with another rate keeps showing it, so opening it doesn't silently change it.
  if (current !== undefined && !choices.some((choice) => choice.pct === current))
    choices.push({ pct: current, label: `VAT ${current}% added` });
  return choices;
}

export interface SettingsErrors {
  vatRate?: string;
  terms?: string;
  rate?: string;
}

export function checkSettings(input: {
  vatRatePct: number;
  paymentTermsDays: number;
}): SettingsErrors | null {
  const errors: SettingsErrors = {};
  if (!Number.isInteger(input.vatRatePct) || input.vatRatePct < 1 || input.vatRatePct > 100)
    errors.vatRate = "The VAT rate is a whole percent from 1 to 100.";
  if (
    !Number.isInteger(input.paymentTermsDays) ||
    input.paymentTermsDays < 0 ||
    input.paymentTermsDays > 180
  )
    errors.terms = "Payment terms are 0 to 180 days.";
  return Object.keys(errors).length > 0 ? errors : null;
}
