-- Quote numbers: QT-2026-0001, shared by every version of one quote.
CREATE SEQUENCE quote_reference_seq;

CREATE TYPE "pricing_model" AS ENUM ('fixed', 'hourly', 'retainer');
CREATE TYPE "quote_status" AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'accepted', 'declined', 'expired', 'superseded');

CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricing_model" "pricing_model" NOT NULL DEFAULT 'fixed',
    "unit_price_minor" BIGINT NOT NULL,
    "unit_label" TEXT NOT NULL DEFAULT 'project',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_items_price_nonnegative" CHECK ("unit_price_minor" >= 0)
);
CREATE INDEX "catalog_items_active_name_idx" ON "catalog_items"("active", "name");

CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deal_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "terms" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" "quote_status" NOT NULL DEFAULT 'draft',
    "tax_rate_pct" INTEGER NOT NULL DEFAULT 12,
    "subtotal_minor" BIGINT NOT NULL DEFAULT 0,
    "tax_minor" BIGINT NOT NULL DEFAULT 0,
    "total_minor" BIGINT NOT NULL DEFAULT 0,
    "valid_until" DATE,
    "public_token" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT,
    "viewed_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_by_name" TEXT,
    "accepted_by_email" TEXT,
    "accepted_ip" TEXT,
    "accepted_user_agent" TEXT,
    "accepted_total_minor" BIGINT,
    "declined_at" TIMESTAMPTZ(6),
    "declined_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotes_tax_rate_range" CHECK ("tax_rate_pct" BETWEEN 0 AND 100),
    CONSTRAINT "quotes_totals_nonnegative" CHECK ("subtotal_minor" >= 0 AND "tax_minor" >= 0 AND "total_minor" >= 0),
    CONSTRAINT "quotes_total_adds_up" CHECK ("total_minor" = "subtotal_minor" + "tax_minor")
);
CREATE UNIQUE INDEX "quotes_public_token_key" ON "quotes"("public_token");
CREATE UNIQUE INDEX "quotes_reference_version_key" ON "quotes"("reference", "version");
CREATE INDEX "quotes_deal_id_idx" ON "quotes"("deal_id");
CREATE INDEX "quotes_status_idx" ON "quotes"("status");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "catalog_item_id" UUID,
    "description" TEXT NOT NULL,
    "quantity_milli" INTEGER NOT NULL,
    "unit_label" TEXT NOT NULL DEFAULT 'unit',
    "unit_price_minor" BIGINT NOT NULL,
    "discount_pct" INTEGER NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "total_minor" BIGINT NOT NULL,
    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_lines_quantity_positive" CHECK ("quantity_milli" > 0),
    CONSTRAINT "quote_lines_price_nonnegative" CHECK ("unit_price_minor" >= 0 AND "total_minor" >= 0),
    CONSTRAINT "quote_lines_discount_range" CHECK ("discount_pct" BETWEEN 0 AND 100)
);
CREATE INDEX "quote_lines_quote_id_position_idx" ON "quote_lines"("quote_id", "position");
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- An accepted quote is a record of what was agreed: once accepted, its figures and lines cannot change.
CREATE FUNCTION quotes_freeze_accepted() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'accepted' AND (
       NEW.subtotal_minor <> OLD.subtotal_minor OR NEW.tax_minor <> OLD.tax_minor OR
       NEW.total_minor <> OLD.total_minor OR NEW.title <> OLD.title OR
       NEW.terms IS DISTINCT FROM OLD.terms OR NEW.intro IS DISTINCT FROM OLD.intro) THEN
    RAISE EXCEPTION 'An accepted quote cannot be changed.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER quotes_freeze_accepted BEFORE UPDATE ON "quotes"
  FOR EACH ROW EXECUTE FUNCTION quotes_freeze_accepted();

CREATE FUNCTION quote_lines_freeze_accepted() RETURNS trigger AS $$
DECLARE locked boolean;
BEGIN
  SELECT status = 'accepted' INTO locked FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  IF locked THEN
    RAISE EXCEPTION 'The lines of an accepted quote cannot be changed.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;
CREATE TRIGGER quote_lines_freeze_accepted BEFORE INSERT OR UPDATE OR DELETE ON "quote_lines"
  FOR EACH ROW EXECUTE FUNCTION quote_lines_freeze_accepted();

ALTER TABLE "catalog_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_lines" ENABLE ROW LEVEL SECURITY;
