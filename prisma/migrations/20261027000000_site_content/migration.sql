-- CreateTable
CREATE TABLE "site_content" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- ------------------------------------------------------------ hand-written extras

-- Keys are short, lower-case names; each document is a JSON object (its exact shape is
-- checked by the app before it is saved and again when it is read).
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_key_format" CHECK ("key" ~ '^[a-z][a-z0-9.-]{0,63}$');
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_data_object" CHECK (jsonb_typeof("data") = 'object');
ALTER TABLE "site_content" ENABLE ROW LEVEL SECURITY;
