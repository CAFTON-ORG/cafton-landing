-- Lead scoring: 0 to 100, worked out from the contact form's answers (features/crm/scoring.ts).
-- Null means not scored yet; the daily job scores existing leads, new ones are scored as they arrive.
ALTER TABLE "leads" ADD COLUMN "score" INTEGER;
ALTER TABLE "leads" ADD CONSTRAINT "leads_score_range" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
CREATE INDEX "leads_score_idx" ON "leads"("score");
