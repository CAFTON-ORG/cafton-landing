-- Custom fields: extra facts on leads, contacts, organizations and deals, defined by an administrator.
CREATE TABLE "custom_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);
-- A key is unique within one kind of record, and never changes: stored values are keyed by it.
CREATE UNIQUE INDEX "custom_fields_entity_key_key" ON "custom_fields"("entity", "key");
CREATE INDEX "custom_fields_entity_position_idx" ON "custom_fields"("entity", "position");

ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_entity_values"
  CHECK ("entity" IN ('lead', 'contact', 'organization', 'deal'));
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_type_values"
  CHECK ("type" IN ('text', 'number', 'date', 'select', 'checkbox'));
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_key_format"
  CHECK ("key" ~ '^[a-z][a-z0-9_]{0,39}$');
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_label_length"
  CHECK (char_length(btrim("label")) BETWEEN 1 AND 60);
ALTER TABLE "custom_fields" ENABLE ROW LEVEL SECURITY;

-- The values, on the record itself: a small object keyed by the field's key.
ALTER TABLE "leads" ADD COLUMN "custom" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "contacts" ADD COLUMN "custom" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "organizations" ADD COLUMN "custom" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "deals" ADD COLUMN "custom" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "leads" ADD CONSTRAINT "leads_custom_object" CHECK (jsonb_typeof("custom") = 'object');
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_custom_object" CHECK (jsonb_typeof("custom") = 'object');
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_custom_object" CHECK (jsonb_typeof("custom") = 'object');
ALTER TABLE "deals" ADD CONSTRAINT "deals_custom_object" CHECK (jsonb_typeof("custom") = 'object');
