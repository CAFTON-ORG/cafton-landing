-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_path_key" ON "media"("path");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at" DESC);

-- ------------------------------------------------------------ hand-written extras

-- Stored paths are always "content/<uuid>.<ext>": no traversal, no foreign folders.
ALTER TABLE "media" ADD CONSTRAINT "media_path_format"
  CHECK ("path" ~ '^content/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$');
ALTER TABLE "media" ADD CONSTRAINT "media_size_positive" CHECK ("size_bytes" > 0 AND "width" > 0 AND "height" > 0);
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;

-- Who may write to the bucket: anyone with a staff profile. (The app also checks the
-- content permission before it ever calls Storage; this is the second lock.)
CREATE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
$$;

-- Public-read bucket for website images. Raster formats only (SVG can carry script), 5 MB,
-- and the app re-encodes everything it stores, so what is here is plain pixels.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "public read media files" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "staff upload media files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_staff());
CREATE POLICY "staff delete media files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_staff());
