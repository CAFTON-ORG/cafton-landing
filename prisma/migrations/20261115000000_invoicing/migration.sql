-- Finance (Phase 6), part 2: invoices, payments with allocations, credit notes. Each posts to the
-- ledger (migration 20261114); the rules a sent document must keep are kept by the database too.

-- Gapless document numbers (the tax authority expects invoice numbers without holes). A number is
-- taken inside the transaction that uses it, so a rollback gives it back.
CREATE TABLE "document_counters" (
    "key" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("key")
);
ALTER TABLE "document_counters" ENABLE ROW LEVEL SECURITY;

-- VAT is off for this business (8% income tax option) but a VAT invoice must have somewhere to post.
INSERT INTO "accounts" ("code", "name", "type", "system_key", "description", "updated_at") VALUES
  ('2120', 'Output VAT payable', 'liability', 'vat_payable', 'VAT charged on invoices, to remit. Unused while the business is not VAT-registered.', now());

CREATE TYPE "invoice_status" AS ENUM ('draft', 'issued', 'void');

CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Given when the invoice is issued, never before, never reused.
    "number" TEXT,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "organization_id" UUID,
    "contact_id" UUID,
    -- The client as they were when it was issued: the document must keep reading the same.
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_address" TEXT,
    "client_tin" TEXT,
    "deal_id" UUID,
    "project_id" UUID,
    "quote_id" UUID,
    "issue_date" DATE,
    "due_date" DATE,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "tax_code" TEXT NOT NULL DEFAULT 'NOVAT',
    "tax_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "subtotal_minor" BIGINT NOT NULL DEFAULT 0,
    "tax_minor" BIGINT NOT NULL DEFAULT 0,
    "total_minor" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "payment_instructions" TEXT,
    "journal_entry_id" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "void_entry_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_pesos_only" CHECK ("currency" = 'PHP'),
    CONSTRAINT "invoices_amounts_not_negative" CHECK ("subtotal_minor" >= 0 AND "tax_minor" >= 0 AND "total_minor" >= 0),
    CONSTRAINT "invoices_total_adds_up" CHECK ("total_minor" = "subtotal_minor" + "tax_minor"),
    CONSTRAINT "invoices_tax_rate_range" CHECK ("tax_rate_bp" BETWEEN 0 AND 10000),
    CONSTRAINT "invoices_numbered_once_issued" CHECK ("status" = 'draft' OR "number" IS NOT NULL),
    CONSTRAINT "invoices_issued_has_dates" CHECK ("status" = 'draft' OR ("issue_date" IS NOT NULL AND "due_date" IS NOT NULL)),
    CONSTRAINT "invoices_due_after_issue" CHECK ("issue_date" IS NULL OR "due_date" IS NULL OR "due_date" >= "issue_date")
);
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");
CREATE INDEX "invoices_project_id_idx" ON "invoices"("project_id");
CREATE INDEX "invoices_deal_id_idx" ON "invoices"("deal_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    -- Thousandths: 1500 is 1.5.
    "quantity_milli" INTEGER NOT NULL DEFAULT 1000,
    "unit_label" TEXT NOT NULL DEFAULT 'item',
    "unit_price_minor" BIGINT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_lines_description_length" CHECK (char_length(btrim("description")) BETWEEN 1 AND 1000),
    CONSTRAINT "invoice_lines_quantity_positive" CHECK ("quantity_milli" > 0),
    CONSTRAINT "invoice_lines_amounts_not_negative" CHECK ("unit_price_minor" >= 0 AND "amount_minor" >= 0)
);
CREATE INDEX "invoice_lines_invoice_id_position_idx" ON "invoice_lines"("invoice_id", "position");
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;

-- What a line bills, so the same milestone is never invoiced twice.
ALTER TABLE "milestones" ADD COLUMN "invoice_line_id" UUID;
CREATE UNIQUE INDEX "milestones_invoice_line_id_key" ON "milestones"("invoice_line_id");
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Once issued, an invoice is what the client was sent: its wording, amounts and dates are fixed.
-- Only the bookkeeping around it moves (when it was sent, reminders, being voided).
CREATE FUNCTION invoices_freeze_issued() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'An issued invoice cannot be deleted. Void it instead.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF OLD.status = 'void' THEN
      RAISE EXCEPTION 'A voided invoice cannot be changed.';
    END IF;
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.client_email IS DISTINCT FROM OLD.client_email
       OR NEW.client_address IS DISTINCT FROM OLD.client_address
       OR NEW.client_tin IS DISTINCT FROM OLD.client_tin
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.tax_rate_bp IS DISTINCT FROM OLD.tax_rate_bp
       OR NEW.subtotal_minor IS DISTINCT FROM OLD.subtotal_minor
       OR NEW.tax_minor IS DISTINCT FROM OLD.tax_minor
       OR NEW.total_minor IS DISTINCT FROM OLD.total_minor
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.payment_instructions IS DISTINCT FROM OLD.payment_instructions
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
      RAISE EXCEPTION 'An issued invoice cannot be changed. Void it and make a new one.';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER invoices_freeze_issued BEFORE UPDATE OR DELETE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION invoices_freeze_issued();

CREATE FUNCTION invoice_lines_only_while_draft() RETURNS trigger AS $$
DECLARE
  parent_status invoice_status;
  parent UUID;
BEGIN
  parent := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  SELECT status INTO parent_status FROM invoices WHERE id = parent;
  -- (When the invoice row itself is being deleted its draft lines go with it.)
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'The lines of an issued invoice cannot be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER invoice_lines_only_while_draft BEFORE INSERT OR UPDATE OR DELETE ON "invoice_lines"
  FOR EACH ROW EXECUTE FUNCTION invoice_lines_only_while_draft();

-- ---------------------------------------------------------------------------------- payments

CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "received_date" DATE NOT NULL,
    -- What actually reached the bank or the till.
    "amount_minor" BIGINT NOT NULL,
    -- What the client withheld and will certify (creditable withholding tax): it counts towards
    -- the invoice, but never arrived as cash.
    "cwt_minor" BIGINT NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT,
    "deposit_account_id" UUID NOT NULL,
    "organization_id" UUID,
    "contact_id" UUID,
    "client_name" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "journal_entry_id" UUID NOT NULL,
    "void_entry_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_amount_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "payments_cwt_not_negative" CHECK ("cwt_minor" >= 0),
    CONSTRAINT "payments_status_values" CHECK ("status" IN ('recorded', 'void')),
    CONSTRAINT "payments_method_values" CHECK ("method" IN ('bank_transfer', 'cash', 'check', 'gcash', 'maya', 'card', 'other'))
);
CREATE UNIQUE INDEX "payments_number_key" ON "payments"("number");
CREATE INDEX "payments_received_date_idx" ON "payments"("received_date");
CREATE INDEX "payments_organization_id_idx" ON "payments"("organization_id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_deposit_account_id_fkey" FOREIGN KEY ("deposit_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    -- How much of the payment (cash and withholding together) settles this invoice.
    "amount_minor" BIGINT NOT NULL,
    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_allocations_amount_positive" CHECK ("amount_minor" > 0)
);
CREATE UNIQUE INDEX "payment_allocations_payment_id_invoice_id_key" ON "payment_allocations"("payment_id", "invoice_id");
CREATE INDEX "payment_allocations_invoice_id_idx" ON "payment_allocations"("invoice_id");
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------ credit notes

CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "issue_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "subtotal_minor" BIGINT NOT NULL,
    "tax_minor" BIGINT NOT NULL DEFAULT 0,
    "total_minor" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "journal_entry_id" UUID NOT NULL,
    "void_entry_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_notes_amounts" CHECK ("subtotal_minor" > 0 AND "tax_minor" >= 0 AND "total_minor" = "subtotal_minor" + "tax_minor"),
    CONSTRAINT "credit_notes_status_values" CHECK ("status" IN ('issued', 'void')),
    CONSTRAINT "credit_notes_reason_length" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500)
);
CREATE UNIQUE INDEX "credit_notes_number_key" ON "credit_notes"("number");
CREATE INDEX "credit_notes_invoice_id_idx" ON "credit_notes"("invoice_id");
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_void_entry_id_fkey" FOREIGN KEY ("void_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------- what a payment may settle

-- A payment can't settle more than it brought in (cash plus withholding), and an invoice can't be
-- settled or credited for more than it is worth. Checked when the transaction commits.
CREATE FUNCTION payment_not_overallocated() RETURNS trigger AS $$
DECLARE
  brought BIGINT;
  applied BIGINT;
BEGIN
  SELECT amount_minor + cwt_minor INTO brought FROM payments WHERE id = NEW.payment_id;
  SELECT COALESCE(SUM(amount_minor), 0) INTO applied FROM payment_allocations WHERE payment_id = NEW.payment_id;
  IF applied > brought THEN
    RAISE EXCEPTION 'A payment cannot settle more than it brought in.';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER payment_not_overallocated AFTER INSERT ON "payment_allocations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payment_not_overallocated();

CREATE FUNCTION invoice_not_overapplied() RETURNS trigger AS $$
DECLARE
  target UUID;
  worth BIGINT;
  settled BIGINT;
  credited BIGINT;
BEGIN
  target := NEW.invoice_id;
  SELECT total_minor INTO worth FROM invoices WHERE id = target;
  SELECT COALESCE(SUM(a.amount_minor), 0) INTO settled
    FROM payment_allocations a JOIN payments p ON p.id = a.payment_id
   WHERE a.invoice_id = target AND p.status = 'recorded';
  SELECT COALESCE(SUM(total_minor), 0) INTO credited
    FROM credit_notes WHERE invoice_id = target AND status = 'issued';
  IF settled + credited > worth THEN
    RAISE EXCEPTION 'An invoice cannot be settled or credited for more than it is worth.';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER invoice_not_overapplied_by_payment AFTER INSERT ON "payment_allocations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION invoice_not_overapplied();
CREATE CONSTRAINT TRIGGER invoice_not_overapplied_by_credit AFTER INSERT ON "credit_notes"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION invoice_not_overapplied();

-- Only an issued invoice can be paid or credited.
CREATE FUNCTION settle_only_issued() RETURNS trigger AS $$
BEGIN
  IF (SELECT status FROM invoices WHERE id = NEW.invoice_id) <> 'issued' THEN
    RAISE EXCEPTION 'Only an issued invoice can be paid or credited.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER payment_allocations_only_issued BEFORE INSERT ON "payment_allocations"
  FOR EACH ROW EXECUTE FUNCTION settle_only_issued();
CREATE TRIGGER credit_notes_only_issued BEFORE INSERT ON "credit_notes"
  FOR EACH ROW EXECUTE FUNCTION settle_only_issued();

-- A payment or credit note, once recorded, only changes by being voided (with its reversal).
CREATE FUNCTION settlements_freeze() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recorded payments and credit notes cannot be deleted. Void them instead.';
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'A voided document cannot be changed.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER payments_freeze BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION settlements_freeze();
CREATE TRIGGER credit_notes_freeze BEFORE UPDATE OR DELETE ON "credit_notes"
  FOR EACH ROW EXECUTE FUNCTION settlements_freeze();

-- Approved time that has been invoiced stays frozen like any approved time; only the link to the
-- invoice line may be set or cleared (it is released when the invoice is voided).
ALTER TABLE "time_entries" ADD COLUMN "invoice_line_id" UUID;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "time_entries_invoice_line_id_idx" ON "time_entries"("invoice_line_id");
CREATE OR REPLACE FUNCTION time_entries_keep_approved() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Approved time cannot be deleted.';
    END IF;
    IF NEW.invoice_line_id IS DISTINCT FROM OLD.invoice_line_id
       AND (to_jsonb(NEW) - 'invoice_line_id' - 'updated_at') = (to_jsonb(OLD) - 'invoice_line_id' - 'updated_at') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Approved time cannot be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
