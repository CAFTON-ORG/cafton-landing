import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { BlogCard } from "@/components/blog/blog-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { blogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog - CAFTON",
  description:
    "Notes from Cafton on building useful technology: process, engineering, and lessons from real projects.",
};

export default function Blog() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Insights
              </p>
            </RevealItem>
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
          <Reveal>
            <RevealGroup className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
              {blogPosts.map((post) => (
                <RevealItem key={post.slug}>
                  <BlogCard post={post} />
                </RevealItem>
              ))}
            </RevealGroup>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
