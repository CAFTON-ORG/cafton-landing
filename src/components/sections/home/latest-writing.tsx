import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { BlogEditorial } from "@/components/sections/home/blog-editorial";
import { getAuthorMap } from "@/lib/repositories/authors";
import { listBlogPosts } from "@/lib/repositories/blog";
import { PageShell } from "@/components/layout/page-shell";

async function LatestWriting() {
  const [posts, authors] = await Promise.all([listBlogPosts(), getAuthorMap()]);
  const latestPosts = posts.slice(0, 3);
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

        <BlogEditorial posts={latestPosts} authors={authors} />

        <Reveal className="mt-10 flex justify-center">
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
}

export { LatestWriting };
