-- Finance (Phase 6), part 1: the chart of accounts, fiscal periods, tax rates and the double-entry
-- ledger. The database itself refuses an unbalanced entry, a change to anything posted, and a
-- posting into a closed period.
CREATE SEQUENCE journal_entry_seq;

CREATE TYPE "account_type" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "account_type" NOT NULL,
    "description" TEXT,
    -- The role this account plays when the system posts for you ("ar", "cash", "revenue"...). The
    -- code and name can change; the role is what Finance posts by.
    "system_key" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accounts_code_format" CHECK ("code" ~ '^[0-9]{4,6}$'),
    CONSTRAINT "accounts_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120)
);
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");
CREATE UNIQUE INDEX "accounts_system_key_key" ON "accounts"("system_key");
CREATE INDEX "accounts_type_code_idx" ON "accounts"("type", "code");
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "fiscal_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMPTZ(6),
    "closed_by" UUID,
    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fiscal_periods_month_range" CHECK ("month" BETWEEN 1 AND 12),
    CONSTRAINT "fiscal_periods_status_values" CHECK ("status" IN ('open', 'closed')),
    CONSTRAINT "fiscal_periods_dates_in_order" CHECK ("ends_on" >= "starts_on")
);
CREATE UNIQUE INDEX "fiscal_periods_year_month_key" ON "fiscal_periods"("year", "month");
CREATE INDEX "fiscal_periods_dates_idx" ON "fiscal_periods"("starts_on", "ends_on");
ALTER TABLE "fiscal_periods" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    -- Basis points: 1200 is 12.00%.
    "rate_bp" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'vat',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tax_rates_rate_range" CHECK ("rate_bp" BETWEEN 0 AND 10000),
    CONSTRAINT "tax_rates_kind_values" CHECK ("kind" IN ('vat', 'percentage', 'withholding')),
    CONSTRAINT "tax_rates_code_format" CHECK ("code" ~ '^[A-Z0-9_-]{2,20}$')
);
CREATE UNIQUE INDEX "tax_rates_code_key" ON "tax_rates"("code");
ALTER TABLE "tax_rates" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL DEFAULT (('JE-'::text || to_char(now(), 'YYYY'::text)) || '-'::text || lpad((nextval('journal_entry_seq'::regclass))::text, 4, '0'::text)),
    "entry_date" DATE NOT NULL,
    "memo" TEXT NOT NULL,
    -- What produced the entry: a person at the keyboard, an invoice, a payment... and its id.
    "source_kind" TEXT NOT NULL DEFAULT 'manual',
    "source_id" UUID,
    -- Set on an entry that undoes another. An entry can be undone only once.
    "reverses_id" UUID,
    "created_by" UUID,
    -- Snapshot, so the history still reads correctly after the person is removed.
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journal_entries_memo_length" CHECK (char_length(btrim("memo")) BETWEEN 1 AND 500),
    CONSTRAINT "journal_entries_source_values" CHECK ("source_kind" IN
      ('manual', 'invoice', 'credit_note', 'payment', 'bill', 'expense', 'bank', 'reversal', 'opening', 'tax')),
    CONSTRAINT "journal_entries_date_sane" CHECK ("entry_date" BETWEEN DATE '2000-01-01' AND DATE '2100-12-31')
);
CREATE UNIQUE INDEX "journal_entries_number_key" ON "journal_entries"("number");
CREATE UNIQUE INDEX "journal_entries_reverses_id_key" ON "journal_entries"("reverses_id");
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");
CREATE INDEX "journal_entries_source_idx" ON "journal_entries"("source_kind", "source_id");
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reverses_id_fkey" FOREIGN KEY ("reverses_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    -- Integer centavos. A line is a debit or a credit, never both and never neither.
    "debit_minor" BIGINT NOT NULL DEFAULT 0,
    "credit_minor" BIGINT NOT NULL DEFAULT 0,
    "memo" TEXT,
    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journal_lines_one_side" CHECK (
      ("debit_minor" > 0 AND "credit_minor" = 0) OR ("credit_minor" > 0 AND "debit_minor" = 0))
);
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines"("entry_id");
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------- the rules the database keeps

-- Debits equal credits, checked when the transaction commits (so lines can be added one by one).
CREATE FUNCTION journal_entry_balanced() RETURNS trigger AS $$
DECLARE
  debits BIGINT;
  credits BIGINT;
  line_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(debit_minor), 0), COALESCE(SUM(credit_minor), 0), COUNT(*)
    INTO debits, credits, line_count
    FROM journal_lines WHERE entry_id = NEW.entry_id;
  IF line_count < 2 THEN
    RAISE EXCEPTION 'A journal entry needs at least two lines.';
  END IF;
  IF debits <> credits THEN
    RAISE EXCEPTION 'The journal entry does not balance: debits % and credits %.', debits, credits;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER journal_entry_balanced AFTER INSERT ON "journal_lines"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION journal_entry_balanced();

-- ...and an entry cannot exist with no lines at all (the trigger above only fires for a line).
CREATE FUNCTION journal_entry_has_lines() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM journal_lines WHERE entry_id = NEW.id) THEN
    RAISE EXCEPTION 'A journal entry needs at least two lines.';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER journal_entry_has_lines AFTER INSERT ON "journal_entries"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION journal_entry_has_lines();

-- The ledger is append-only: nothing posted is edited or removed. A mistake is undone by a
-- reversing entry, which leaves both in the history.
CREATE FUNCTION ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Posted journal entries cannot be changed or deleted. Reverse the entry instead.';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER journal_entries_append_only BEFORE UPDATE OR DELETE ON "journal_entries"
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
CREATE TRIGGER journal_lines_append_only BEFORE UPDATE OR DELETE ON "journal_lines"
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();

-- No posting into a month that has been closed.
CREATE FUNCTION journal_entry_period_open() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_periods
     WHERE status = 'closed' AND NEW.entry_date BETWEEN starts_on AND ends_on
  ) THEN
    RAISE EXCEPTION 'That period is closed. Reopen it, or post to an open period.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER journal_entries_period_open BEFORE INSERT ON "journal_entries"
  FOR EACH ROW EXECUTE FUNCTION journal_entry_period_open();

-- An archived account takes no new postings; and an account with postings keeps its type.
CREATE FUNCTION journal_line_account_active() RETURNS trigger AS $$
BEGIN
  IF NOT (SELECT active FROM accounts WHERE id = NEW.account_id) THEN
    RAISE EXCEPTION 'That account is archived and can''t be posted to.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER journal_lines_account_active BEFORE INSERT ON "journal_lines"
  FOR EACH ROW EXECUTE FUNCTION journal_line_account_active();

CREATE FUNCTION accounts_keep_type() RETURNS trigger AS $$
BEGIN
  IF NEW.type <> OLD.type AND EXISTS (SELECT 1 FROM journal_lines WHERE account_id = OLD.id) THEN
    RAISE EXCEPTION 'An account that has postings keeps its type.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER accounts_keep_type BEFORE UPDATE ON "accounts"
  FOR EACH ROW EXECUTE FUNCTION accounts_keep_type();

-- ----------------------------------------------------------------- starting data

-- A small chart of accounts for a Philippine service business on the 8% income tax option.
-- Accounts with a system_key are the ones Finance posts to by role.
INSERT INTO "accounts" ("code", "name", "type", "system_key", "description", "updated_at") VALUES
  ('1000', 'Cash on hand',                         'asset',     'cash',               'Physical cash.', now()),
  ('1010', 'Cash in bank',                         'asset',     'bank',               'Your main bank account.', now()),
  ('1100', 'Accounts receivable',                  'asset',     'ar',                 'What clients owe you on invoices.', now()),
  ('1200', 'Creditable withholding tax',           'asset',     'cwt_receivable',     'Tax clients withheld from your payments, to claim back.', now()),
  ('1300', 'Prepaid expenses',                     'asset',     NULL,                 'Paid in advance, used up over time.', now()),
  ('2000', 'Accounts payable',                     'liability', 'ap',                 'What you owe suppliers on bills.', now()),
  ('2100', 'Income tax payable',                   'liability', 'income_tax_payable', 'Income tax set aside and not yet paid.', now()),
  ('2110', 'Withholding tax payable',              'liability', 'withholding_payable','Tax withheld from staff and suppliers, to remit.', now()),
  ('2200', 'Government contributions payable',     'liability', NULL,                 'SSS, PhilHealth and Pag-IBIG to remit.', now()),
  ('2300', 'Customer deposits',                    'liability', 'customer_deposits',  'Money received before it is invoiced.', now()),
  ('3000', 'Owner''s capital',                     'equity',    NULL,                 'What the owner put in.', now()),
  ('3100', 'Owner''s drawings',                    'equity',    NULL,                 'What the owner took out.', now()),
  ('3900', 'Retained earnings',                    'equity',    'retained_earnings',  'Profit kept in the business from past years.', now()),
  ('4000', 'Service revenue',                      'revenue',   'revenue_services',   'Income from client work.', now()),
  ('4900', 'Other income',                         'revenue',   'other_income',       'Interest and anything else that is not client work.', now()),
  ('5000', 'Cost of services',                     'expense',   NULL,                 'Contractors and direct costs of delivering work.', now()),
  ('6000', 'Salaries and wages',                   'expense',   'salaries',           'Pay for staff.', now()),
  ('6100', 'Rent',                                 'expense',   NULL,                 NULL, now()),
  ('6200', 'Utilities',                            'expense',   NULL,                 'Electricity, water, internet.', now()),
  ('6300', 'Software and subscriptions',           'expense',   NULL,                 NULL, now()),
  ('6400', 'Marketing',                            'expense',   NULL,                 NULL, now()),
  ('6500', 'Professional fees',                    'expense',   NULL,                 'Accountant, legal.', now()),
  ('6600', 'Bank charges',                         'expense',   'bank_charges',       NULL, now()),
  ('6900', 'Income tax expense',                   'expense',   'income_tax_expense', 'The 8% income tax for the year.', now()),
  ('6990', 'Miscellaneous expense',                'expense',   NULL,                 NULL, now());

-- The business is on the 8% income tax option, so it is not VAT-registered: no VAT by default.
-- VAT stays available, switched off, for the day that changes.
INSERT INTO "tax_rates" ("code", "name", "rate_bp", "kind", "active", "updated_at") VALUES
  ('NOVAT',  'No VAT (8% income tax option)', 0,    'vat',         true,  now()),
  ('VAT12',  'VAT 12%',                       1200, 'vat',         false, now()),
  ('EWT2',   'Withholding on services 2%',    200,  'withholding', true,  now()),
  ('EWT5',   'Withholding on professional fees 5%', 500, 'withholding', false, now());
