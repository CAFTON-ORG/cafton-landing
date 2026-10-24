import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Form endpoints and the internal system: nothing there for a search engine.
      disallow: ["/api/", "/dashboard", "/login", "/auth/", "/q/", "/c/", "/p/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
