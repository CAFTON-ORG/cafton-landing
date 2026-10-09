import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { authorJsonLd, breadcrumbJsonLd, ORGANIZATION_ID } from "@/lib/structured-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { BlogHeroImage } from "@/components/blog/blog-hero-image";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/shared/json-ld";
import { Byline } from "@/components/shared/byline";
import { formatBlogDate, readingTime } from "@/lib/blog";
import { getAuthor } from "@/lib/repositories/authors";
import { getBlogPost, listBlogPosts } from "@/lib/repositories/blog";
import { SITE_URL } from "@/lib/site";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listBlogPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const author = await getAuthor(post.authorId);

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}/cafton-lengthwise.png`,
    inLanguage: "en-PH",
    author: author ? authorJsonLd(author) : { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };

  return (
    <>
      <JsonLd data={blogPostingJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
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
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{post.category}</Badge>
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
            {author && (
              <RevealItem>
                <Byline
                  author={author}
                  label="Written by"
                  className="mt-8"
                />
              </RevealItem>
            )}
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell>
          <Reveal>
            <BlogHeroImage post={post} />
          </Reveal>
          <Reveal>
            <div className="mx-auto max-w-2xl">
              <RevealGroup className="mt-10 flex flex-col gap-6">
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
