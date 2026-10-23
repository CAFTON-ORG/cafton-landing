-- Finance (Phase 6), part 3: vendors, bills and the payments made against them. Approving a bill
-- posts it to the ledger (migration 20261114); the rules an approved bill must keep are kept by the
-- database too.

CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tin" TEXT,
    -- Where this supplier's bills usually go, so a new bill starts with it filled in.
    "default_account_id" UUID,
    "terms_days" INTEGER NOT NULL DEFAULT 15,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vendors_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200),
    CONSTRAINT "vendors_terms_range" CHECK ("terms_days" BETWEEN 0 AND 180)
);
CREATE UNIQUE INDEX "vendors_name_lower_key" ON "vendors"(lower("name"));
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_default_account_id_fkey" FOREIGN KEY ("default_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;

CREATE TYPE "bill_status" AS ENUM ('draft', 'approved', 'void');

CREATE TABLE "bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Our own reference, given on approval, never before, never reused.
    "number" TEXT,
    "status" "bill_status" NOT NULL DEFAULT 'draft',
    "vendor_id" UUID NOT NULL,
    -- The supplier as they were when it was approved.
    "vendor_name" TEXT NOT NULL,
    -- The number printed on the supplier's own invoice.
    "vendor_ref" TEXT,
    "bill_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "total_minor" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "journal_entry_id" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "void_entry_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "bills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bills_pesos_only" CHECK ("currency" = 'PHP'),
    CONSTRAINT "bills_total_not_negative" CHECK ("total_minor" >= 0),
    CONSTRAINT "bills_numbered_once_approved" CHECK ("status" = 'draft' OR "number" IS NOT NULL),
    CONSTRAINT "bills_due_after_bill_date" CHECK ("due_date" >= "bill_date")
);
CREATE UNIQUE INDEX "bills_number_key" ON "bills"("number");
CREATE INDEX "bills_status_due_date_idx" ON "bills"("status", "due_date");
CREATE INDEX "bills_vendor_id_idx" ON "bills"("vendor_id");
ALTER TABLE "bills" ADD CONSTRAINT "bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "bill_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    -- What the cost is booked to (an expense, or an asset such as prepaid expenses).
    "account_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    CONSTRAINT "bill_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bill_lines_description_length" CHECK (char_length(btrim("description")) BETWEEN 1 AND 1000),
    CONSTRAINT "bill_lines_amount_positive" CHECK ("amount_minor" > 0)
);
CREATE INDEX "bill_lines_bill_id_position_idx" ON "bill_lines"("bill_id", "position");
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_lines" ENABLE ROW LEVEL SECURITY;

-- Once approved, a bill is what was posted: its supplier, amounts and dates are fixed. Only being
-- voided moves it.
CREATE FUNCTION bills_freeze_approved() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'An approved bill cannot be deleted. Void it instead.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF OLD.status = 'void' THEN
      RAISE EXCEPTION 'A voided bill cannot be changed.';
    END IF;
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
       OR NEW.vendor_name IS DISTINCT FROM OLD.vendor_name
       OR NEW.vendor_ref IS DISTINCT FROM OLD.vendor_ref
       OR NEW.bill_date IS DISTINCT FROM OLD.bill_date
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.total_minor IS DISTINCT FROM OLD.total_minor
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
      RAISE EXCEPTION 'An approved bill cannot be changed. Void it and enter it again.';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bills_freeze_approved BEFORE UPDATE OR DELETE ON "bills"
  FOR EACH ROW EXECUTE FUNCTION bills_freeze_approved();

CREATE FUNCTION bill_lines_only_while_draft() RETURNS trigger AS $$
DECLARE
  parent_status bill_status;
  parent UUID;
BEGIN
  parent := CASE WHEN TG_OP = 'DELETE' THEN OLD.bill_id ELSE NEW.bill_id END;
  SELECT status INTO parent_status FROM bills WHERE id = parent;
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'The lines of an approved bill cannot be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bill_lines_only_while_draft BEFORE INSERT OR UPDATE OR DELETE ON "bill_lines"
  FOR EACH ROW EXECUTE FUNCTION bill_lines_only_while_draft();

-- An approved bill's lines add up to its total (checked when the transaction commits).
CREATE FUNCTION bill_total_matches_lines() RETURNS trigger AS $$
DECLARE
  target UUID;
  expected BIGINT;
  actual BIGINT;
  current_status bill_status;
BEGIN
  target := NEW.id;
  SELECT status, total_minor INTO current_status, expected FROM bills WHERE id = target;
  IF current_status IS NULL OR current_status = 'draft' THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(amount_minor), 0) INTO actual FROM bill_lines WHERE bill_id = target;
  IF actual <> expected THEN
    RAISE EXCEPTION 'The lines of a bill must add up to its total.';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER bills_total_matches_lines AFTER UPDATE ON "bills"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bill_total_matches_lines();

-- ---------------------------------------------------------------------- payments out

CREATE TABLE "bill_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "bill_id" UUID NOT NULL,
    "paid_date" DATE NOT NULL,
    -- What left the bank or the till.
    "amount_minor" BIGINT NOT NULL,
    -- Tax held back from the supplier to remit to the BIR (expanded withholding tax): it settles
    -- the bill but never leaves as cash to the supplier.
    "wht_minor" BIGINT NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT,
    "paid_from_account_id" UUID NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "journal_entry_id" UUID NOT NULL,
    "void_entry_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bill_payments_amount_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "bill_payments_wht_not_negative" CHECK ("wht_minor" >= 0),
    CONSTRAINT "bill_payments_status_values" CHECK ("status" IN ('recorded', 'void')),
    CONSTRAINT "bill_payments_method_values" CHECK ("method" IN ('bank_transfer', 'cash', 'check', 'gcash', 'maya', 'card', 'other'))
);
CREATE UNIQUE INDEX "bill_payments_number_key" ON "bill_payments"("number");
CREATE INDEX "bill_payments_bill_id_idx" ON "bill_payments"("bill_id");
CREATE INDEX "bill_payments_paid_date_idx" ON "bill_payments"("paid_date");
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_payments" ENABLE ROW LEVEL SECURITY;

-- Only an approved bill can be paid.
CREATE FUNCTION bill_payments_only_approved() RETURNS trigger AS $$
BEGIN
  IF (SELECT status FROM bills WHERE id = NEW.bill_id) <> 'approved' THEN
    RAISE EXCEPTION 'Only an approved bill can be paid.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bill_payments_only_approved BEFORE INSERT ON "bill_payments"
  FOR EACH ROW EXECUTE FUNCTION bill_payments_only_approved();

-- A bill can't be paid more than it is worth (cash and withholding together).
CREATE FUNCTION bill_not_overpaid() RETURNS trigger AS $$
DECLARE
  worth BIGINT;
  paid BIGINT;
BEGIN
  SELECT total_minor INTO worth FROM bills WHERE id = NEW.bill_id;
  SELECT COALESCE(SUM(amount_minor + wht_minor), 0) INTO paid
    FROM bill_payments WHERE bill_id = NEW.bill_id AND status = 'recorded';
  IF paid > worth THEN
    RAISE EXCEPTION 'A bill cannot be paid more than it is worth.';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER bill_not_overpaid AFTER INSERT ON "bill_payments"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bill_not_overpaid();

-- A recorded payment only changes by being voided (with its reversal).
CREATE FUNCTION bill_payments_freeze() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recorded payments cannot be deleted. Void them instead.';
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'A voided payment cannot be changed.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bill_payments_freeze BEFORE UPDATE OR DELETE ON "bill_payments"
  FOR EACH ROW EXECUTE FUNCTION bill_payments_freeze();
