-- Finance (Phase 6), part 5: recurring bills and expenses (rent, hosting, subscriptions). A
-- recurring item makes a DRAFT bill, or an expense waiting for approval, when each date arrives:
-- a person still approves what is posted to the books.

CREATE TABLE "recurring_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    -- "bill" makes a draft bill for a supplier; "expense" makes an expense waiting for approval.
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    -- The day of the month it keeps to, so 31 January then 28 February then 31 March.
    "anchor_day" INTEGER NOT NULL,
    "next_date" DATE NOT NULL,
    "end_date" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "vendor_id" UUID,
    "payee" TEXT,
    "description" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "paid_from_account_id" UUID,
    "last_generated_on" DATE,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "recurring_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_items_kind_values" CHECK ("kind" IN ('bill', 'expense')),
    CONSTRAINT "recurring_items_frequency_values" CHECK ("frequency" IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    CONSTRAINT "recurring_items_anchor_day_range" CHECK ("anchor_day" BETWEEN 1 AND 31),
    CONSTRAINT "recurring_items_amount_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "recurring_items_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
    CONSTRAINT "recurring_items_ends_after_start" CHECK ("end_date" IS NULL OR "end_date" >= "next_date" OR "created_count" > 0),
    CONSTRAINT "recurring_items_bill_has_vendor" CHECK ("kind" <> 'bill' OR "vendor_id" IS NOT NULL),
    CONSTRAINT "recurring_items_expense_has_payee_and_source" CHECK ("kind" <> 'expense' OR ("payee" IS NOT NULL AND "paid_from_account_id" IS NOT NULL))
);
CREATE INDEX "recurring_items_active_next_date_idx" ON "recurring_items"("active", "next_date");
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_items" ENABLE ROW LEVEL SECURITY;

-- What each one made, and for which date, so running the job twice (or a retry) never makes a
-- second copy of the same occurrence.
ALTER TABLE "bills" ADD COLUMN "recurring_id" UUID, ADD COLUMN "recurs_on" DATE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_recurring_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "recurring_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "bills_recurring_occurrence_key" ON "bills"("recurring_id", "recurs_on");

ALTER TABLE "expenses" ADD COLUMN "recurring_id" UUID, ADD COLUMN "recurs_on" DATE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "recurring_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "expenses_recurring_occurrence_key" ON "expenses"("recurring_id", "recurs_on");
