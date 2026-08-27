import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import {
  blogPosts,
  formatBlogDate,
  getBlogPost,
  readingTime,
} from "@/lib/blog";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} - CAFTON Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <Link
                href="/blog"
                className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="me-2 size-4" />
                Back to Blog
              </Link>
            </RevealItem>
            <RevealItem>
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{readingTime(post)}</span>
              </div>
            </RevealItem>
            <RevealItem>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                {post.title}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {post.excerpt}
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell>
          <Reveal>
            <div className="mx-auto max-w-2xl">
              <RevealGroup className="flex flex-col gap-6">
                {post.content.map((paragraph, index) => (
                  <RevealItem key={index}>
                    <p className="text-base leading-7 text-foreground/90 sm:text-lg sm:leading-8">
                      {paragraph}
                    </p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
