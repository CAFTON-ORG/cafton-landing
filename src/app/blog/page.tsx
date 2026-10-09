import type { Metadata } from "next";
import { listPageMetadata } from "@/lib/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { BlogLead } from "@/components/blog/blog-lead";
import { BlogRow } from "@/components/blog/blog-row";
import { Pagination } from "@/components/shared/pagination";
import { CategoryFilter } from "@/components/shared/category-filter";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getAuthorMap } from "@/lib/repositories/authors";
import { listBlogPosts } from "@/lib/repositories/blog";

const DESCRIPTION =
  "Insights from Cafton on building useful technology: process, engineering, and lessons from real projects.";

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const { page, category } = await searchParams;
  return listPageMetadata({ title: "Blog", description: DESCRIPTION, path: "/blog", page, category });
}

const PAGE_SIZE = 6;

interface BlogPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function Blog({ searchParams }: BlogPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams;
  const [blogPosts, authors] = await Promise.all([listBlogPosts(), getAuthorMap()]);

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
              <Badge variant="outline" className="px-3 py-1 text-sm">Blog</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Insights from Cafton.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Thoughts on process, engineering, and what we learn building
                software around real problems.
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
              No posts in this category yet.
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
