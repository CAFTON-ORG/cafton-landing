-- Tags on the four CRM records.
ALTER TABLE "organizations" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "contacts" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "leads" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "deals" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "organizations_tags_idx" ON "organizations" USING GIN ("tags");
CREATE INDEX "contacts_tags_idx" ON "contacts" USING GIN ("tags");
CREATE INDEX "leads_tags_idx" ON "leads" USING GIN ("tags");
CREATE INDEX "deals_tags_idx" ON "deals" USING GIN ("tags");

-- Pinned and edited notes.
ALTER TABLE "activities" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN "edited_at" TIMESTAMPTZ(6);

-- Several pipelines. Every existing stage moves into one default "Sales" pipeline.
CREATE TABLE "pipelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pipelines_key_key" ON "pipelines"("key");
INSERT INTO "pipelines" ("key", "name", "position", "is_default") VALUES ('sales', 'Sales', 0, true);

ALTER TABLE "pipeline_stages" ADD COLUMN "pipeline_id" UUID;
UPDATE "pipeline_stages" SET "pipeline_id" = (SELECT "id" FROM "pipelines" WHERE "key" = 'sales');
ALTER TABLE "pipeline_stages" ALTER COLUMN "pipeline_id" SET NOT NULL;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "pipeline_stages_pipeline_id_idx" ON "pipeline_stages"("pipeline_id");
-- Only one default pipeline.
CREATE UNIQUE INDEX "pipelines_one_default" ON "pipelines" ("is_default") WHERE "is_default";

-- Saved views.
CREATE TABLE "saved_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_views_resource_owner_id_idx" ON "saved_views"("resource", "owner_id");

-- In-app notifications.
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

ALTER TABLE "pipelines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
