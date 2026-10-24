-- Delivery extras: comments on tasks, project templates, and a private progress link for the client.

-- The client's progress link: only the hash of its secret is stored, like quote and contract links.
ALTER TABLE "projects" ADD COLUMN "progress_token_hash" TEXT;
ALTER TABLE "projects" ADD COLUMN "progress_shared_at" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX "projects_progress_token_hash_key" ON "projects"("progress_token_hash");

CREATE TABLE "task_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "author_id" UUID,
    -- Snapshot, so the comment still reads correctly after the person is removed.
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_comments_body_length" CHECK (char_length(btrim("body")) BETWEEN 1 AND 2000)
);
CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;

-- A reusable plan: the milestones (with the share of the price each invoices) and tasks to start from.
CREATE TABLE "project_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "milestones" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "tasks" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_templates_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 160),
    CONSTRAINT "project_templates_milestones_array" CHECK (jsonb_typeof("milestones") = 'array'),
    CONSTRAINT "project_templates_tasks_array" CHECK (jsonb_typeof("tasks") = 'array')
);
CREATE INDEX "project_templates_active_idx" ON "project_templates"("active", "name");
ALTER TABLE "project_templates" ENABLE ROW LEVEL SECURITY;
