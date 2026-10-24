-- Finance (Phase 6), part 6: bank accounts, statement import and reconciliation. A bank account is a
-- ledger account (an asset) the statement is checked against. Statement lines are what the bank says
-- happened; reconciling puts each one against what the books say, or books it.

CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    -- The ledger account whose balance the statement is checked against (an asset).
    "account_id" UUID NOT NULL,
    -- The last digits of the account number, to tell two accounts at one bank apart. Never the whole number.
    "number_hint" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bank_accounts_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
    CONSTRAINT "bank_accounts_hint_length" CHECK ("number_hint" IS NULL OR char_length("number_hint") <= 6)
);
CREATE UNIQUE INDEX "bank_accounts_account_id_key" ON "bank_accounts"("account_id");
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION bank_accounts_need_asset() RETURNS trigger AS $$
BEGIN
  IF (SELECT type FROM accounts WHERE id = NEW.account_id) <> 'asset' THEN
    RAISE EXCEPTION 'A bank account has to be linked to an asset account.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bank_accounts_need_asset BEFORE INSERT OR UPDATE OF account_id ON "bank_accounts"
  FOR EACH ROW EXECUTE FUNCTION bank_accounts_need_asset();

-- One file brought in, so what came with it can be traced.
CREATE TABLE "bank_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_account_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "rows_in_file" INTEGER NOT NULL,
    "rows_new" INTEGER NOT NULL,
    "imported_by" UUID,
    "imported_by_name" TEXT NOT NULL DEFAULT 'System',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_imports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bank_imports_bank_account_id_idx" ON "bank_imports"("bank_account_id");
ALTER TABLE "bank_imports" ADD CONSTRAINT "bank_imports_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_imports" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "bank_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_account_id" UUID NOT NULL,
    "import_id" UUID,
    "line_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    -- Positive is money in, negative is money out.
    "amount_minor" BIGINT NOT NULL,
    -- The balance the statement showed after this line, when it shows one.
    "balance_minor" BIGINT,
    -- Stops the same line being brought in twice when statements overlap.
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    -- The ledger line it was put against (or the one made when it was booked).
    "journal_line_id" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bank_lines_amount_not_zero" CHECK ("amount_minor" <> 0),
    CONSTRAINT "bank_lines_status_values" CHECK ("status" IN ('unmatched', 'matched', 'ignored')),
    CONSTRAINT "bank_lines_match_has_ledger_line" CHECK (("status" = 'matched') = ("journal_line_id" IS NOT NULL)),
    CONSTRAINT "bank_lines_description_length" CHECK (char_length("description") <= 500)
);
CREATE UNIQUE INDEX "bank_lines_fingerprint_key" ON "bank_lines"("bank_account_id", "fingerprint");
CREATE UNIQUE INDEX "bank_lines_journal_line_id_key" ON "bank_lines"("journal_line_id");
CREATE INDEX "bank_lines_bank_account_id_line_date_idx" ON "bank_lines"("bank_account_id", "line_date");
CREATE INDEX "bank_lines_status_idx" ON "bank_lines"("bank_account_id", "status");
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "bank_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_journal_line_id_fkey" FOREIGN KEY ("journal_line_id") REFERENCES "journal_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_lines" ENABLE ROW LEVEL SECURITY;

-- What the bank said is never rewritten: only the decision about a line changes. And a line can
-- only be put against a ledger line on THIS bank account's ledger account, for the same amount in
-- the same direction (money in is a debit, money out a credit).
CREATE FUNCTION bank_lines_guard() RETURNS trigger AS $$
DECLARE
  ledger_account UUID;
  line RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A statement line cannot be deleted.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.bank_account_id IS DISTINCT FROM OLD.bank_account_id
       OR NEW.line_date IS DISTINCT FROM OLD.line_date
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.reference IS DISTINCT FROM OLD.reference
       OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.balance_minor IS DISTINCT FROM OLD.balance_minor
       OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint THEN
      RAISE EXCEPTION 'A statement line cannot be changed after it was imported.';
    END IF;
  END IF;
  -- Inside a signed-off period nothing about a line moves, and nothing new arrives.
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.journal_line_id IS DISTINCT FROM OLD.journal_line_id THEN
    IF EXISTS (
      SELECT 1 FROM bank_reconciliations r
       WHERE r.bank_account_id = NEW.bank_account_id
         AND NEW.line_date BETWEEN r.period_start AND r.period_end
    ) THEN
      RAISE EXCEPTION 'That period has been signed off, so its statement lines cannot change.';
    END IF;
  END IF;
  IF NEW.journal_line_id IS NOT NULL THEN
    SELECT account_id INTO ledger_account FROM bank_accounts WHERE id = NEW.bank_account_id;
    SELECT account_id, debit_minor, credit_minor INTO line FROM journal_lines WHERE id = NEW.journal_line_id;
    IF line.account_id IS DISTINCT FROM ledger_account THEN
      RAISE EXCEPTION 'A statement line can only be matched to a posting on its own bank account.';
    END IF;
    IF (NEW.amount_minor > 0 AND line.debit_minor <> NEW.amount_minor)
       OR (NEW.amount_minor < 0 AND line.credit_minor <> -NEW.amount_minor) THEN
      RAISE EXCEPTION 'A statement line can only be matched to a posting of the same amount and direction.';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bank_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON "bank_lines"
  FOR EACH ROW EXECUTE FUNCTION bank_lines_guard();

-- A signed-off period: the statement's own opening and closing balances agree with its lines, and
-- every line in it was matched, booked or set aside.
CREATE TABLE "bank_reconciliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_account_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "opening_minor" BIGINT NOT NULL,
    "closing_minor" BIGINT NOT NULL,
    "line_count" INTEGER NOT NULL,
    "signed_by" UUID,
    "signed_by_name" TEXT NOT NULL DEFAULT 'System',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bank_reconciliations_period_order" CHECK ("period_end" >= "period_start")
);
CREATE INDEX "bank_reconciliations_bank_account_id_period_end_idx" ON "bank_reconciliations"("bank_account_id", "period_end");
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_reconciliations" ENABLE ROW LEVEL SECURITY;

-- A signed-off reconciliation is a record: it is never changed or removed.
CREATE FUNCTION bank_reconciliations_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A signed-off reconciliation cannot be changed or removed.';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER bank_reconciliations_append_only BEFORE UPDATE OR DELETE ON "bank_reconciliations"
  FOR EACH ROW EXECUTE FUNCTION bank_reconciliations_append_only();
