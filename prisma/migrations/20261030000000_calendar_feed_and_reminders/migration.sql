-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "calendar_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_calendar_token_key" ON "profiles"("calendar_token");

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "for_key" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_logs_kind_ref_id_for_key_key" ON "reminder_logs"("kind", "ref_id", "for_key");

ALTER TABLE "reminder_logs" ENABLE ROW LEVEL SECURITY;
