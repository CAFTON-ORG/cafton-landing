import { SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import type { Author } from "@/types/content";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization and WebSite entities, rendered once site-wide in the root layout. */
export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      legalName: "Cafton Software Development Services",
      url: SITE_URL,
      logo: `${SITE_URL}/cafton.png`,
      image: `${SITE_URL}/cafton-lengthwise.png`,
      description: SITE_DESCRIPTION,
      email: "contact@cafton.com",
      foundingDate: "2026",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Baguio City",
        addressCountry: "PH",
      },
      areaServed: { "@type": "Country", name: "Philippines" },
      sameAs: [
        "https://www.facebook.com/profile.php?id=61593222069389",
        "https://www.instagram.com/cafton.official",
        "https://www.linkedin.com/company/cafton",
        "https://www.tiktok.com/@cafton.official",
        "https://x.com/cafton_official",
        "https://www.youtube.com/@caftonofficial",
      ],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en-PH",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

/** schema.org author: the Cafton organization for the team account, a Person otherwise. */
export function authorJsonLd(author: Author) {
  if (author.kind === "organization") return { "@id": ORGANIZATION_ID };
  return {
    "@type": "Person",
    name: author.name,
    ...(author.url && { url: author.url.startsWith("http") ? author.url : `${SITE_URL}${author.url}` }),
  };
}

interface Crumb {
  name: string;
  /** Path on this site, e.g. "/blog". */
  path: string;
}

/** BreadcrumbList for a page, from the site root down to the page itself. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}

export { ORGANIZATION_ID };
