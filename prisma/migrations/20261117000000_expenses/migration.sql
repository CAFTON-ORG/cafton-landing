-- Finance (Phase 6), part 4: expenses people pay for themselves (or from the till), with receipts
-- and an approval step. Approving posts to the ledger (migration 20261114); an approved expense is
-- fixed by the database, and its receipts are kept as they were.

-- Money the business owes back to someone who paid for it out of their own pocket.
INSERT INTO "accounts" ("code", "name", "type", "system_key", "description", "updated_at") VALUES
  ('2150', 'Reimbursements payable', 'liability', 'reimbursable', 'What the business owes people who paid for something out of pocket.', now());

CREATE TYPE "expense_status" AS ENUM ('submitted', 'approved', 'rejected', 'void');

CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Given when it is approved, never before, never reused.
    "number" TEXT,
    "status" "expense_status" NOT NULL DEFAULT 'submitted',
    "expense_date" DATE NOT NULL,
    "payee" TEXT NOT NULL,
    "vendor_id" UUID,
    "description" TEXT NOT NULL,
    -- What the cost is booked to (an expense, or an asset such as prepaid expenses).
    "account_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    -- Where the money came from: cash or bank, or "reimbursements payable" when someone paid personally.
    "paid_from_account_id" UUID NOT NULL,
    "notes" TEXT,
    "submitted_by" UUID,
    "submitted_by_name" TEXT NOT NULL DEFAULT 'System',
    "decided_by" UUID,
    "decided_by_name" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "journal_entry_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "void_entry_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_pesos_only" CHECK ("currency" = 'PHP'),
    CONSTRAINT "expenses_amount_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "expenses_description_length" CHECK (char_length(btrim("description")) BETWEEN 1 AND 500),
    CONSTRAINT "expenses_payee_length" CHECK (char_length(btrim("payee")) BETWEEN 1 AND 200),
    CONSTRAINT "expenses_numbered_once_approved" CHECK ("status" IN ('submitted', 'rejected') OR "number" IS NOT NULL),
    CONSTRAINT "expenses_approved_is_posted" CHECK ("status" NOT IN ('approved', 'void') OR "journal_entry_id" IS NOT NULL),
    CONSTRAINT "expenses_rejection_has_reason" CHECK ("status" <> 'rejected' OR "reject_reason" IS NOT NULL)
);
CREATE UNIQUE INDEX "expenses_number_key" ON "expenses"("number");
CREATE INDEX "expenses_status_expense_date_idx" ON "expenses"("status", "expense_date");
CREATE INDEX "expenses_submitted_by_idx" ON "expenses"("submitted_by");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;

-- Once approved, an expense is what was posted: only being voided moves it. Before that it can be
-- edited, withdrawn (deleted) or decided.
CREATE FUNCTION expenses_freeze_approved() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved', 'void') THEN
      RAISE EXCEPTION 'An approved expense cannot be deleted. Void it instead.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'A voided expense cannot be changed.';
  END IF;
  IF OLD.status = 'approved' THEN
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.expense_date IS DISTINCT FROM OLD.expense_date
       OR NEW.payee IS DISTINCT FROM OLD.payee
       OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.account_id IS DISTINCT FROM OLD.account_id
       OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.paid_from_account_id IS DISTINCT FROM OLD.paid_from_account_id
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
      RAISE EXCEPTION 'An approved expense cannot be changed. Void it and enter it again.';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER expenses_freeze_approved BEFORE UPDATE OR DELETE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION expenses_freeze_approved();

-- ----------------------------------------------------------------------------------- receipts

CREATE TABLE "expense_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expense_id" UUID NOT NULL,
    -- Where the file is in the private bucket; always a random name, never what the uploader typed.
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "uploaded_by_name" TEXT NOT NULL DEFAULT 'System',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_receipts_size_range" CHECK ("size_bytes" > 0 AND "size_bytes" <= 4194304)
);
CREATE UNIQUE INDEX "expense_receipts_path_key" ON "expense_receipts"("path");
CREATE INDEX "expense_receipts_expense_id_idx" ON "expense_receipts"("expense_id");
ALTER TABLE "expense_receipts" ADD CONSTRAINT "expense_receipts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_receipts" ENABLE ROW LEVEL SECURITY;

-- The evidence for an approved expense stays as it was when it was approved.
CREATE FUNCTION expense_receipts_only_before_approval() RETURNS trigger AS $$
DECLARE
  parent UUID;
  parent_status expense_status;
BEGIN
  parent := CASE WHEN TG_OP = 'DELETE' THEN OLD.expense_id ELSE NEW.expense_id END;
  SELECT status INTO parent_status FROM expenses WHERE id = parent;
  -- (When the expense row itself is being deleted its receipts go with it.)
  IF parent_status IN ('approved', 'void') THEN
    RAISE EXCEPTION 'The receipts of an approved expense cannot be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER expense_receipts_only_before_approval BEFORE INSERT OR UPDATE OR DELETE ON "expense_receipts"
  FOR EACH ROW EXECUTE FUNCTION expense_receipts_only_before_approval();

-- Private bucket, the same as the CRM's: no storage policy mentions it, so only the server (service
-- role) can read, write or list it. Staff open a receipt through a short-lived signed link the app
-- issues after checking their permission.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-receipts', 'finance-receipts', false, 4194304,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
