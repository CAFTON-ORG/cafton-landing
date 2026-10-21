/**
 * Brand and site-wide constants. Rename the site here: nothing else hard-codes
 * the product name, description, canonical origin or default share image.
 */

export const SITE_URL = "https://cafton.com";

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

/** localStorage key for the visitor's light/dark choice. */
export const THEME_STORAGE_KEY = "cafton-theme";
