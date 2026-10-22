-- CreateEnum
CREATE TYPE "meeting_status" AS ENUM ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "meeting_mode" AS ENUM ('video', 'phone', 'in_person');

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "mode" "meeting_mode" NOT NULL DEFAULT 'video',
    "location" TEXT,
    "status" "meeting_status" NOT NULL DEFAULT 'requested',
    "source" TEXT NOT NULL DEFAULT 'staff',
    "notes" TEXT,
    "cancelled_reason" TEXT,
    "attendee_name" TEXT NOT NULL,
    "attendee_email" TEXT NOT NULL,
    "attendee_phone" TEXT,
    "lead_id" UUID,
    "contact_id" UUID,
    "deal_id" UUID,
    "owner_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_starts_at_idx" ON "meetings"("starts_at");
CREATE INDEX "meetings_status_starts_at_idx" ON "meetings"("status", "starts_at");
CREATE INDEX "meetings_lead_id_idx" ON "meetings"("lead_id");
CREATE INDEX "meetings_contact_id_idx" ON "meetings"("contact_id");
CREATE INDEX "meetings_deal_id_idx" ON "meetings"("deal_id");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------ hand-written extras

-- A meeting ends after it starts and lasts at most eight hours.
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_duration" CHECK ("ends_at" > "starts_at" AND "ends_at" - "starts_at" <= interval '8 hours');

-- The company has one shared calendar: two meetings that are requested or confirmed cannot
-- overlap, whoever asks and however quickly. This is what stops two visitors booking the same time.
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at") WITH &&)
  WHERE ("status" IN ('requested', 'confirmed'));

ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
