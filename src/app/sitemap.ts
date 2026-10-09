import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { listBlogPosts } from "@/lib/repositories/blog";
import { listEvents } from "@/lib/repositories/events";
import { listProjects } from "@/lib/repositories/projects";
import { servicePillars } from "@/lib/services";

/**
 * Every indexable URL, once, with no query strings. Pages marked `noindex`
 * (careers, while it has no open roles) are left out: listing a URL that tells
 * crawlers not to index it is a mixed signal. `lastModified` is only given
 * where there is a real date to give (blog posts); an invented "modified now"
 * on every URL teaches crawlers to ignore the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPosts, events, projects] = await Promise.all([
    listBlogPosts(),
    listEvents(),
    listProjects(),
  ]);

  const pages = [
    "",
    "/about",
    "/services",
    "/portfolio",
    "/blog",
    "/events",
    "/contact",
    "/privacy",
    "/legal",
  ];

  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...servicePillars.map((pillar) => ({ url: `${SITE_URL}/services/${pillar.slug}` })),
    ...projects.map((project) => ({ url: `${SITE_URL}/portfolio/${project.slug}` })),
    ...events.map((event) => ({ url: `${SITE_URL}/events/${event.slug}` })),
    ...blogPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date,
    })),
  ];
}
