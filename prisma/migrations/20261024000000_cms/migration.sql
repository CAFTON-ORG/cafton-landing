-- CreateEnum
CREATE TYPE "publish_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "author_kind" AS ENUM ('organization', 'person');

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "kind" "author_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "avatar" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT[],
    "media" JSONB,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "image_light" TEXT,
    "image_dark" TEXT,
    "image_alt" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "services" TEXT[],
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "problem" TEXT,
    "solution" TEXT,
    "recognition" TEXT,
    "image_light" TEXT,
    "image_dark" TEXT,
    "image_alt" TEXT,
    "image_fit" TEXT,
    "media" JSONB,
    "live_url" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "campaign_url" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "poster" JSONB,
    "about" TEXT[],
    "prizes_heading" TEXT,
    "prizes" JSONB NOT NULL,
    "steps" JSONB,
    "facts" JSONB,
    "closed_title" TEXT,
    "closed_note" TEXT,
    "promo" JSONB,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "logo" JSONB NOT NULL,
    "roles" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "links" JSONB,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_faqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_date_idx" ON "blog_posts"("status", "date" DESC);

-- CreateIndex
CREATE INDEX "portfolio_projects_slug_idx" ON "portfolio_projects"("slug");

-- CreateIndex
CREATE INDEX "portfolio_projects_status_position_idx" ON "portfolio_projects"("status", "position");

-- CreateIndex
CREATE INDEX "events_slug_idx" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_position_idx" ON "events"("status", "position");

-- CreateIndex
CREATE INDEX "partners_slug_idx" ON "partners"("slug");

-- CreateIndex
CREATE INDEX "partners_status_position_idx" ON "partners"("status", "position");

-- CreateIndex
CREATE INDEX "service_faqs_service_slug_position_idx" ON "service_faqs"("service_slug", "position");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------ hand-written extras

-- Slugs are URL segments: lowercase words joined by hyphens. Unique among live rows,
-- so a deleted post's address can be reused.
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "events" ADD CONSTRAINT "events_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "partners" ADD CONSTRAINT "partners_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE UNIQUE INDEX "blog_posts_slug_live_key" ON "blog_posts" ("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "portfolio_projects_slug_live_key" ON "portfolio_projects" ("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "events_slug_live_key" ON "events" ("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "partners_slug_live_key" ON "partners" ("slug") WHERE "deleted_at" IS NULL;

-- Publishing requires the fields a public page cannot render without.
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_published_complete"
  CHECK ("status" <> 'published' OR (length(btrim("title")) > 0 AND length(btrim("excerpt")) > 0 AND cardinality("content") > 0));
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_published_complete"
  CHECK ("status" <> 'published' OR (length(btrim("summary")) > 0 AND length(btrim("description")) > 0));
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_image_fit" CHECK ("image_fit" IS NULL OR "image_fit" IN ('cover', 'contain'));
ALTER TABLE "events" ADD CONSTRAINT "events_dates_ordered" CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "starts_at" <= "ends_at");

-- Lock the Data API, as for every table.
ALTER TABLE "authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_faqs" ENABLE ROW LEVEL SECURITY;
