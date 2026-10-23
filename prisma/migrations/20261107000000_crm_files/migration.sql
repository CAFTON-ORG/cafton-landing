-- Files on leads, contacts, organizations and deals.
CREATE TABLE "record_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID,
    "contact_id" UUID,
    "organization_id" UUID,
    "deal_id" UUID,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "uploaded_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "record_files_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "record_files_path_key" ON "record_files"("path");
CREATE INDEX "record_files_lead_id_idx" ON "record_files"("lead_id");
CREATE INDEX "record_files_contact_id_idx" ON "record_files"("contact_id");
CREATE INDEX "record_files_organization_id_idx" ON "record_files"("organization_id");
CREATE INDEX "record_files_deal_id_idx" ON "record_files"("deal_id");

ALTER TABLE "record_files" ADD CONSTRAINT "record_files_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------ hand-written extras

-- A file belongs to exactly one record.
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_one_parent"
  CHECK (num_nonnulls("lead_id", "contact_id", "organization_id", "deal_id") = 1);
-- Stored paths are always "crm/<uuid>.<ext>" with an accepted extension: no traversal, no foreign folders.
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_path_format"
  CHECK ("path" ~ '^crm/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp|docx|xlsx|pptx|csv|txt)$');
ALTER TABLE "record_files" ADD CONSTRAINT "record_files_size_range"
  CHECK ("size_bytes" > 0 AND "size_bytes" <= 4194304);
ALTER TABLE "record_files" ENABLE ROW LEVEL SECURITY;

-- Private bucket: nothing here is readable by the public or by a guessed address. Staff read a file
-- through a short-lived signed link the app issues after checking their permission on the record.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-files', 'crm-files', false, 4194304,
  ARRAY[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv', 'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "staff read crm files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'crm-files' AND public.is_staff());
CREATE POLICY "staff upload crm files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'crm-files' AND public.is_staff());
CREATE POLICY "staff delete crm files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'crm-files' AND public.is_staff());
