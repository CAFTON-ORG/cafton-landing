-- Finance (Phase 6), part 7: the income tax the business files and pays under the 8% option: the
-- quarterly returns (1701Q) and the annual one (1701A). A filing records what was declared and
-- paid and posts it to the ledger (migration 20261114); the figures the tracker shows before that
-- are estimates for the accountant to confirm.

CREATE TABLE "tax_filings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_year" INTEGER NOT NULL,
    -- "q1", "q2", "q3" or "annual".
    "kind" TEXT NOT NULL,
    -- "1701Q" or "1701A".
    "form" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'filed',
    "filed_on" DATE NOT NULL,
    -- The confirmation or reference number the BIR gave.
    "reference" TEXT,
    -- The figures the tracker estimated at the time, kept beside what was actually declared.
    "gross_receipts_minor" BIGINT NOT NULL DEFAULT 0,
    "estimate_minor" BIGINT NOT NULL DEFAULT 0,
    -- What was paid in cash, and what was settled by tax clients had withheld (creditable withholding).
    "cash_paid_minor" BIGINT NOT NULL DEFAULT 0,
    "cwt_applied_minor" BIGINT NOT NULL DEFAULT 0,
    "paid_from_account_id" UUID,
    "notes" TEXT,
    -- The posting made when it was recorded; none for a nil return.
    "journal_entry_id" UUID,
    "void_entry_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "filed_by" UUID,
    "filed_by_name" TEXT NOT NULL DEFAULT 'System',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_filings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tax_filings_kind_values" CHECK ("kind" IN ('q1', 'q2', 'q3', 'annual')),
    CONSTRAINT "tax_filings_form_matches_kind" CHECK (("kind" = 'annual' AND "form" = '1701A') OR ("kind" <> 'annual' AND "form" = '1701Q')),
    CONSTRAINT "tax_filings_status_values" CHECK ("status" IN ('filed', 'void')),
    CONSTRAINT "tax_filings_amounts_not_negative" CHECK ("cash_paid_minor" >= 0 AND "cwt_applied_minor" >= 0 AND "gross_receipts_minor" >= 0 AND "estimate_minor" >= 0),
    CONSTRAINT "tax_filings_payment_needs_source" CHECK ("cash_paid_minor" = 0 OR "paid_from_account_id" IS NOT NULL),
    CONSTRAINT "tax_filings_posted_when_money_moved" CHECK (("cash_paid_minor" + "cwt_applied_minor" = 0) = ("journal_entry_id" IS NULL))
);
-- One live filing per return per year; a voided one can be filed again.
CREATE UNIQUE INDEX "tax_filings_one_live_key" ON "tax_filings"("tax_year", "kind") WHERE "status" = 'filed';
CREATE INDEX "tax_filings_tax_year_idx" ON "tax_filings"("tax_year");
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_filings" ENABLE ROW LEVEL SECURITY;

-- A recorded filing is a record: it only changes by being voided (with its reversal).
CREATE FUNCTION tax_filings_freeze() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A recorded filing cannot be deleted. Void it instead.';
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'A voided filing cannot be changed.';
  END IF;
  IF NEW.tax_year IS DISTINCT FROM OLD.tax_year
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.form IS DISTINCT FROM OLD.form
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.filed_on IS DISTINCT FROM OLD.filed_on
     OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.gross_receipts_minor IS DISTINCT FROM OLD.gross_receipts_minor
     OR NEW.estimate_minor IS DISTINCT FROM OLD.estimate_minor
     OR NEW.cash_paid_minor IS DISTINCT FROM OLD.cash_paid_minor
     OR NEW.cwt_applied_minor IS DISTINCT FROM OLD.cwt_applied_minor
     OR NEW.paid_from_account_id IS DISTINCT FROM OLD.paid_from_account_id
     OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
    RAISE EXCEPTION 'A recorded filing cannot be changed. Void it and record it again.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER tax_filings_freeze BEFORE UPDATE OR DELETE ON "tax_filings"
  FOR EACH ROW EXECUTE FUNCTION tax_filings_freeze();
