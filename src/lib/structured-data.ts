import { SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

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
