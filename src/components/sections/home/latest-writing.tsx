import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { BlogCard } from "@/components/blog/blog-card";
import { blogPosts } from "@/lib/blog";
import { PageShell } from "@/components/layout/page-shell";
import { cardGridClass } from "@/lib/card-grid";

const latestPosts = blogPosts.slice(0, 3);

const LatestWriting = () => {
  if (latestPosts.length === 0) return null;

  return (
    <section className="py-14 sm:py-16 lg:py-20">
      <PageShell>
        <Reveal className="mb-12 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Latest from the blog
          </h2>
          <p className="text-lg text-muted-foreground">
            Notes on how we work, what we&apos;re building, and what we&apos;re
            learning along the way.
          </p>
        </Reveal>

        {/* No outer Reveal here: it fades the whole block from opacity 0,
            which masks RevealGroup's own per-card stagger. */}
        <RevealGroup
          className={`grid gap-6 ${cardGridClass(latestPosts.length)}`}
        >
          {latestPosts.map((post) => (
            <RevealItem key={post.slug}>
              <BlogCard post={post} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <Button variant="outline" className="group cursor-pointer" asChild>
            <Link href="/blog">
              Read the blog
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </PageShell>
    </section>
  );
};

export { LatestWriting };
