-- A quote can be withdrawn (the deal was lost, or we changed our mind) before the client answers.
ALTER TYPE "quote_status" ADD VALUE 'withdrawn';

-- The public link is stored as a hash, never in the clear. Existing links stop working; none were
-- in use when this was written (quotes had not been sent yet).
ALTER TABLE "quotes" DROP COLUMN "public_token";
ALTER TABLE "quotes" ADD COLUMN "token_hash" TEXT;
CREATE UNIQUE INDEX "quotes_token_hash_key" ON "quotes"("token_hash");

-- Proof of what was sent and what was accepted.
ALTER TABLE "quotes" ADD COLUMN "sent_hash" TEXT;
ALTER TABLE "quotes" ADD COLUMN "accepted_hash" TEXT;

ALTER TABLE "quotes" ADD COLUMN "deposit_pct" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deposit_range" CHECK ("deposit_pct" BETWEEN 0 AND 100);
ALTER TABLE "quotes" ADD COLUMN "payment_terms" TEXT;

ALTER TABLE "quotes" ADD COLUMN "withdrawn_at" TIMESTAMPTZ(6);
ALTER TABLE "quotes" ADD COLUMN "withdrawn_reason" TEXT;

-- Once a quote has been sent, the wording and money on it are the offer: they cannot change, and
-- an accepted one stays frozen. (A sent quote moves on only by being accepted, declined, expired,
-- withdrawn or replaced.)
CREATE OR REPLACE FUNCTION quotes_freeze_accepted() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('sent', 'accepted') AND (
       NEW.subtotal_minor <> OLD.subtotal_minor OR NEW.tax_minor <> OLD.tax_minor OR
       NEW.total_minor <> OLD.total_minor OR NEW.title <> OLD.title OR
       NEW.terms IS DISTINCT FROM OLD.terms OR NEW.intro IS DISTINCT FROM OLD.intro OR
       NEW.payment_terms IS DISTINCT FROM OLD.payment_terms OR NEW.deposit_pct <> OLD.deposit_pct OR
       NEW.valid_until IS DISTINCT FROM OLD.valid_until) THEN
    RAISE EXCEPTION 'A sent or accepted quote cannot be changed. Make a new version.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION quote_lines_freeze_accepted() RETURNS trigger AS $$
DECLARE locked boolean;
BEGIN
  SELECT status IN ('sent', 'accepted') INTO locked FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  IF locked THEN
    RAISE EXCEPTION 'The lines of a sent or accepted quote cannot be changed.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;
