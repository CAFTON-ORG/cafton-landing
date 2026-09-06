import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { BlogCard } from "@/components/blog/blog-card";
import { Pagination } from "@/components/shared/pagination";
import { CategoryFilter } from "@/components/shared/category-filter";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { blogPosts } from "@/lib/blog";
import { cardGridClass } from "@/lib/card-grid";

export const metadata: Metadata = {
  title: "Blog - CAFTON",
  description:
    "Notes from Cafton on building useful technology: process, engineering, and lessons from real projects.",
};

const PAGE_SIZE = 6;

interface BlogPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function Blog({ searchParams }: BlogPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams;

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

  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Notes from Cafton.
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
          {pagePosts.length > 0 ? (
            <RevealGroup
              key={`${category ?? "all"}-${currentPage}`}
              className={`mt-8 grid gap-5 ${cardGridClass(pagePosts.length, 2)}`}
            >
              {pagePosts.map((post) => (
                <RevealItem key={post.slug}>
                  <BlogCard post={post} />
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
          />
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
