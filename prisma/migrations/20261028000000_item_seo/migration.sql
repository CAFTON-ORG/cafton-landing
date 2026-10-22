-- Search-engine title and description per item. Empty means "use the page's own title and text".
ALTER TABLE "blog_posts" ADD COLUMN "seo_title" TEXT, ADD COLUMN "seo_description" TEXT;
ALTER TABLE "portfolio_projects" ADD COLUMN "seo_title" TEXT, ADD COLUMN "seo_description" TEXT;
ALTER TABLE "events" ADD COLUMN "seo_title" TEXT, ADD COLUMN "seo_description" TEXT;

-- ------------------------------------------------------------ hand-written extras
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_seo_length" CHECK (char_length("seo_title") <= 70 AND char_length("seo_description") <= 200);
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_seo_length" CHECK (char_length("seo_title") <= 70 AND char_length("seo_description") <= 200);
ALTER TABLE "events" ADD CONSTRAINT "events_seo_length" CHECK (char_length("seo_title") <= 70 AND char_length("seo_description") <= 200);
