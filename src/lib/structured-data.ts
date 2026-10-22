import { SITE_NAME, SITE_URL } from "@/config/site";
import type { Author, SiteSettings } from "@/features/cms/types";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization and WebSite entities, rendered once site-wide in the root layout. */
export const siteJsonLd = (settings: SiteSettings) => ({
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
      description: settings.description,
      email: settings.email,
      foundingDate: settings.established,
      address: {
        "@type": "PostalAddress",
        addressLocality: settings.city,
        addressCountry: settings.countryCode,
      },
      areaServed: { "@type": "Country", name: settings.country },
      sameAs: settings.socials.map((link) => link.url),
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
});

/** schema.org author: the Cafton organization for the team account, a Person otherwise. */
export function authorJsonLd(author: Author) {
  if (author.kind === "organization") return { "@id": ORGANIZATION_ID };
  return {
    "@type": "Person",
    name: author.name,
    ...(author.url && {
      url: author.url.startsWith("http") ? author.url : `${SITE_URL}${author.url}`,
    }),
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
