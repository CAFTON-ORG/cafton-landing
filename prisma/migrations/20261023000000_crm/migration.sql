-- Human-readable references (LD-2026-0001, DL-2026-0001). Gaps are fine; they are labels, not counters.
CREATE SEQUENCE lead_reference_seq;
CREATE SEQUENCE deal_reference_seq;

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('new', 'qualified', 'disqualified', 'converted');

-- CreateEnum
CREATE TYPE "stage_kind" AS ENUM ('open', 'won', 'lost');

-- CreateEnum
CREATE TYPE "activity_type" AS ENUM ('note', 'call', 'email', 'meeting', 'stage_change', 'system');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "organization_id" UUID,
    "owner_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL DEFAULT (('LD-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((nextval('lead_reference_seq'::regclass))::text, 4, '0'::text),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "business_name" TEXT,
    "goals_area" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "page_path" TEXT,
    "answers" JSONB NOT NULL,
    "status" "lead_status" NOT NULL DEFAULT 'new',
    "disqualified_reason" TEXT,
    "owner_id" UUID,
    "contact_id" UUID,
    "converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL,
    "kind" "stage_kind" NOT NULL DEFAULT 'open',
    "exit_criteria" TEXT,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL DEFAULT (('DL-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((nextval('deal_reference_seq'::regclass))::text, 4, '0'::text),
    "title" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "organization_id" UUID,
    "stage_id" UUID NOT NULL,
    "amount_minor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "owner_id" UUID,
    "expected_close_date" DATE,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "description" TEXT,
    "lost_reason" TEXT,
    "lead_id" UUID,
    "stage_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "won_at" TIMESTAMPTZ(6),
    "lost_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "activity_type" NOT NULL DEFAULT 'note',
    "body" TEXT NOT NULL,
    "lead_id" UUID,
    "contact_id" UUID,
    "deal_id" UUID,
    "created_by" UUID,
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "done_at" TIMESTAMPTZ(6),
    "assignee_id" UUID,
    "lead_id" UUID,
    "contact_id" UUID,
    "deal_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_last_name_first_name_idx" ON "contacts"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "leads_reference_key" ON "leads"("reference");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_key_key" ON "pipeline_stages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "deals_reference_key" ON "deals"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "deals_lead_id_key" ON "deals"("lead_id");

-- CreateIndex
CREATE INDEX "deals_stage_id_idx" ON "deals"("stage_id");

-- CreateIndex
CREATE INDEX "deals_contact_id_idx" ON "deals"("contact_id");

-- CreateIndex
CREATE INDEX "deals_owner_id_idx" ON "deals"("owner_id");

-- CreateIndex
CREATE INDEX "activities_deal_id_created_at_idx" ON "activities"("deal_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activities_contact_id_created_at_idx" ON "activities"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activities_lead_id_created_at_idx" ON "activities"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_assignee_id_done_at_idx" ON "tasks"("assignee_id", "done_at");

-- CreateIndex
CREATE INDEX "tasks_due_at_idx" ON "tasks"("due_at");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------ hand-written extras

-- Default pipeline. Stages are data: names, order and probabilities can change later
-- without a migration. Each open stage has an exit criterion (standard sales practice).
INSERT INTO "pipeline_stages" ("key", "name", "position", "probability", "kind", "exit_criteria") VALUES
  ('new',         'New',         1, 10,  'open', 'Someone has replied to the enquiry'),
  ('discovery',   'Discovery',   2, 25,  'open', 'Needs, budget and timeline are confirmed'),
  ('proposal',    'Proposal',    3, 50,  'open', 'A written proposal or quote has been sent'),
  ('negotiation', 'Negotiation', 4, 75,  'open', 'Terms are agreed and a signature is requested'),
  ('won',         'Won',         5, 100, 'won',  NULL),
  ('lost',        'Lost',        6, 0,   'lost', NULL);

-- Built-in role for the sales team (permissions come from code).
INSERT INTO "roles" ("key", "name", "description", "is_system") VALUES
  ('sales', 'Sales', 'Works leads, contacts and deals. Cannot delete records or manage people.', true);

-- One live contact per email address (case-insensitive); deleted contacts free the address.
CREATE UNIQUE INDEX "contacts_email_live_key" ON "contacts" (lower("email")) WHERE "deleted_at" IS NULL;

-- A timeline entry must belong to something.
ALTER TABLE "activities" ADD CONSTRAINT "activities_has_subject"
  CHECK ("lead_id" IS NOT NULL OR "contact_id" IS NOT NULL OR "deal_id" IS NOT NULL);

-- Money and closing invariants, enforced below the application as a backstop.
ALTER TABLE "deals" ADD CONSTRAINT "deals_amount_not_negative" CHECK ("amount_minor" IS NULL OR "amount_minor" >= 0);
ALTER TABLE "deals" ADD CONSTRAINT "deals_not_won_and_lost" CHECK (NOT ("won_at" IS NOT NULL AND "lost_at" IS NOT NULL));
ALTER TABLE "deals" ADD CONSTRAINT "deals_lost_has_reason" CHECK ("lost_at" IS NULL OR "lost_reason" IS NOT NULL);
ALTER TABLE "deals" ADD CONSTRAINT "deals_won_has_amount" CHECK ("won_at" IS NULL OR "amount_minor" IS NOT NULL);
ALTER TABLE "deals" ADD CONSTRAINT "deals_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_probability_range" CHECK ("probability" BETWEEN 0 AND 100);

-- Lock the Data API, as for every table.
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
