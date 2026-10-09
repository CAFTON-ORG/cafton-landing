import type { Metadata } from "next";

export const SITE_NAME = "CAFTON";

export const SITE_DESCRIPTION =
  "Cafton builds custom software, web apps, and mobile apps for businesses and organizations. Based in Baguio City, serving clients across the Philippines.";

export interface SocialImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** Share image used wherever a page has none of its own. */
export const DEFAULT_SOCIAL_IMAGE: SocialImage = {
  url: "/cafton-lengthwise.png",
  width: 2000,
  height: 675,
  alt: SITE_NAME,
};

/** Search results show about 160 characters; cut longer text at a word boundary. */
function fitDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:!?-]+$/, "")}…`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path of this page, e.g. "/about". Becomes the canonical URL and og:url. */
  path: string;
  image?: SocialImage;
  type?: "website" | "article";
  /** Keep the page out of the index (it still passes link signals on). */
  noindex?: boolean;
  /** Use `title` exactly, without the " - CAFTON" suffix the root layout appends. */
  absoluteTitle?: boolean;
}

/**
 * One place that builds a page's metadata, so the document title, description,
 * canonical URL, Open Graph and Twitter cards always agree. Next.js replaces a
 * nested `openGraph` object wholesale rather than merging it, so a page that
 * only set a title would otherwise inherit the home page's og:url and image.
 */
export function pageMetadata({
  title,
  description: rawDescription,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
  type = "website",
  noindex = false,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const description = fitDescription(rawDescription);
  const socialTitle = absoluteTitle ? title : `${title} - ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noindex && { robots: { index: false, follow: true } }),
    openGraph: {
      type,
      url: path,
      siteName: SITE_NAME,
      locale: "en_PH",
      title: socialTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image.url],
    },
  };
}
