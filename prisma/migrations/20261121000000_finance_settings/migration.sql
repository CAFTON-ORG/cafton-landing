-- Finance (Phase 6), part 8: the business's finance settings (whether it is VAT-registered, usual
-- payment terms, the default way to pay) and billing rates, so approved time can be invoiced.

-- One row, always: the settings of the business.
CREATE TABLE "finance_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    -- Not VAT-registered (8% income tax option) until the business says otherwise.
    "vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate_pct" INTEGER NOT NULL DEFAULT 12,
    -- Days from the invoice date to the due date, for a new invoice.
    "payment_terms_days" INTEGER NOT NULL DEFAULT 15,
    -- Printed on every new invoice (bank details, GCash number...).
    "payment_instructions" TEXT,
    -- What an hour of work is billed at when nothing more specific is set.
    "default_hourly_rate_minor" BIGINT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finance_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "finance_settings_single_row" CHECK ("id" = 1),
    CONSTRAINT "finance_settings_vat_rate_range" CHECK ("vat_rate_pct" BETWEEN 1 AND 100),
    CONSTRAINT "finance_settings_terms_range" CHECK ("payment_terms_days" BETWEEN 0 AND 180),
    CONSTRAINT "finance_settings_rate_positive" CHECK ("default_hourly_rate_minor" IS NULL OR "default_hourly_rate_minor" > 0)
);
INSERT INTO "finance_settings" ("id") VALUES (1);
ALTER TABLE "finance_settings" ENABLE ROW LEVEL SECURITY;

-- Hourly billing rates. A row for a person and a project is the most specific; a row for a project
-- alone covers everyone on it; a row for a person alone follows them across projects. The default
-- rate in the settings covers everything else.
CREATE TABLE "billing_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "project_id" UUID,
    "hourly_rate_minor" BIGINT NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "billing_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_rates_has_a_scope" CHECK ("profile_id" IS NOT NULL OR "project_id" IS NOT NULL),
    CONSTRAINT "billing_rates_rate_positive" CHECK ("hourly_rate_minor" > 0)
);
-- One rate per person-and-project combination.
CREATE UNIQUE INDEX "billing_rates_scope_key" ON "billing_rates"(
  COALESCE("profile_id", '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE("project_id", '00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE INDEX "billing_rates_project_id_idx" ON "billing_rates"("project_id");
ALTER TABLE "billing_rates" ADD CONSTRAINT "billing_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_rates" ADD CONSTRAINT "billing_rates_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_rates" ENABLE ROW LEVEL SECURITY;
