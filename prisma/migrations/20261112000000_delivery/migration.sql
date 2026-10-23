-- Delivery (Phase 5): projects, who works on them, milestones, tasks and time.
CREATE SEQUENCE project_reference_seq;

CREATE TYPE "project_status" AS ENUM ('planned', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE "milestone_status" AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE "project_task_status" AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE "project_task_priority" AS ENUM ('low', 'normal', 'high');
CREATE TYPE "time_entry_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL DEFAULT (('PRJ-'::text || to_char(now(), 'YYYY'::text)) || '-'::text || lpad((nextval('project_reference_seq'::regclass))::text, 4, '0'::text)),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deal_id" UUID,
    "quote_id" UUID,
    "contact_id" UUID,
    "organization_id" UUID,
    "status" "project_status" NOT NULL DEFAULT 'planned',
    "manager_id" UUID,
    "start_date" DATE,
    "due_date" DATE,
    "budget_minor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "budget_minutes" INTEGER,
    "portfolio_slug" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 160),
    CONSTRAINT "projects_budget_not_negative" CHECK ("budget_minor" IS NULL OR "budget_minor" >= 0),
    CONSTRAINT "projects_budget_minutes_positive" CHECK ("budget_minutes" IS NULL OR "budget_minutes" > 0),
    CONSTRAINT "projects_dates_in_order" CHECK ("start_date" IS NULL OR "due_date" IS NULL OR "due_date" >= "start_date")
);
CREATE UNIQUE INDEX "projects_reference_key" ON "projects"("reference");
-- A quote starts at most one project, so the event that creates it can safely run twice.
CREATE UNIQUE INDEX "projects_quote_id_key" ON "projects"("quote_id");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_deal_id_idx" ON "projects"("deal_id");
CREATE INDEX "projects_manager_id_idx" ON "projects"("manager_id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    -- What an hour of this person costs the company, in minor units: the basis of budget vs actual cost.
    "cost_rate_minor" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_members_rate_not_negative" CHECK ("cost_rate_minor" IS NULL OR "cost_rate_minor" >= 0)
);
CREATE UNIQUE INDEX "project_members_project_id_profile_id_key" ON "project_members"("project_id", "profile_id");
CREATE INDEX "project_members_profile_id_idx" ON "project_members"("profile_id");
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "status" "milestone_status" NOT NULL DEFAULT 'pending',
    "position" INTEGER NOT NULL DEFAULT 0,
    -- Finishing a billable milestone is what Finance will invoice (Phase 6).
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "amount_minor" BIGINT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "milestones_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 160),
    CONSTRAINT "milestones_billable_has_amount" CHECK (NOT "billable" OR ("amount_minor" IS NOT NULL AND "amount_minor" > 0)),
    CONSTRAINT "milestones_amount_not_negative" CHECK ("amount_minor" IS NULL OR "amount_minor" >= 0)
);
CREATE INDEX "milestones_project_id_position_idx" ON "milestones"("project_id", "position");
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestones" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "project_task_status" NOT NULL DEFAULT 'todo',
    "priority" "project_task_priority" NOT NULL DEFAULT 'normal',
    "assignee_id" UUID,
    "due_date" DATE,
    "estimate_minutes" INTEGER,
    -- Order within a board column, lowest first.
    "position" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_tasks_title_length" CHECK (char_length(btrim("title")) BETWEEN 1 AND 200),
    CONSTRAINT "project_tasks_estimate_positive" CHECK ("estimate_minutes" IS NULL OR "estimate_minutes" > 0)
);
CREATE INDEX "project_tasks_project_id_status_idx" ON "project_tasks"("project_id", "status", "position");
CREATE INDEX "project_tasks_assignee_id_idx" ON "project_tasks"("assignee_id");
CREATE INDEX "project_tasks_milestone_id_idx" ON "project_tasks"("milestone_id");
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "profile_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    -- The Monday of work_date's week: timesheets are submitted and approved a week at a time.
    "week_start" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "note" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "status" "time_entry_status" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "time_entries_minutes_range" CHECK ("minutes" BETWEEN 1 AND 1440),
    CONSTRAINT "time_entries_week_start_is_monday" CHECK ("week_start" = date_trunc('week', "work_date"::timestamp)::date)
);
CREATE INDEX "time_entries_profile_id_week_start_idx" ON "time_entries"("profile_id", "week_start");
CREATE INDEX "time_entries_project_id_status_idx" ON "time_entries"("project_id", "status");
CREATE INDEX "time_entries_status_week_start_idx" ON "time_entries"("status", "week_start");
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;

-- Approved hours are a record that invoices and payroll rely on: they can't be edited or removed.
CREATE FUNCTION time_entries_keep_approved() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Approved time cannot be deleted.';
    END IF;
    RAISE EXCEPTION 'Approved time cannot be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER time_entries_keep_approved BEFORE UPDATE OR DELETE ON "time_entries"
  FOR EACH ROW EXECUTE FUNCTION time_entries_keep_approved();
