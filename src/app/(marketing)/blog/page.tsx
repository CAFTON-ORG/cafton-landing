import type { Metadata } from "next";
import { listPageMetadata } from "@/lib/seo";
import { resolveSeo } from "@/features/cms/repository/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { BlogLead } from "@/components/marketing/blog/blog-lead";
import { BlogRow } from "@/components/marketing/blog/blog-row";
import { Pagination } from "@/components/marketing/patterns/pagination";
import { CategoryFilter } from "@/components/marketing/patterns/category-filter";
import { RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getAuthorMap } from "@/features/cms/repository/authors";
import { getDocument } from "@/features/cms/repository/documents";
import { listBlogPosts } from "@/features/cms/repository/blog";

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const { page, category } = await searchParams;
  const seo = await resolveSeo("blog");
  return listPageMetadata({ title: seo.title, description: seo.description, path: "/blog", page, category });
}

const PAGE_SIZE = 6;

interface BlogPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function Blog({ searchParams }: BlogPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams;
  const [blogPosts, authors, { blog: text }] = await Promise.all([
    listBlogPosts(),
    getAuthorMap(),
    getDocument("listings"),
  ]);

  const categories = Array.from(new Set(blogPosts.map((post) => post.category)));
  const category = categoryParam && categories.includes(categoryParam) ? categoryParam : undefined;
  const filteredPosts = category
    ? blogPosts.filter((post) => post.category === category)
    : blogPosts;

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number(pageParam) || 1),
  );
  const pagePosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // The newest post leads page 1 of the unfiltered list; filtered and later pages are plain archive.
  const showLead = currentPage === 1 && !category && pagePosts.length > 1;
  const lead = showLead ? pagePosts[0] : undefined;
  const archive = showLead ? pagePosts.slice(1) : pagePosts;

  return (
    <>
      <PageHero variant="compact">
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{text.eyebrow}</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {text.heading}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {text.intro}
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <CategoryFilter categories={categories} active={category} basePath="/blog" />
          {lead && (
            <div className="mt-10">
              <BlogLead post={lead} author={authors.get(lead.authorId)} />
            </div>
          )}
          {pagePosts.length > 0 ? (
            <RevealGroup
              key={`${category ?? "all"}-${currentPage}`}
              className={lead ? "mt-12" : "mt-8"}
            >
              {archive.map((post) => (
                <RevealItem key={post.slug}>
                  <BlogRow post={post} author={authors.get(post.authorId)} />
                </RevealItem>
              ))}
            </RevealGroup>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">
              {text.empty}
            </p>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/blog"
            query={category ? { category } : undefined}
            totalItems={filteredPosts.length}
            pageSize={PAGE_SIZE}
          />
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
