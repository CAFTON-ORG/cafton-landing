import type { SVGProps } from "react";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

/** No official TikTok mark ships in lucide-react's icon set -- hand-drawn to match its outline weight/style rather than dropping in a mismatched solid glyph. */
function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 3a5 5 0 0 0 5 5" />
      <path d="M20 8v3a8.5 8.5 0 0 1-5-1.6V16a5.5 5.5 0 1 1-5-5.48" />
      <path d="M15 3v13" />
    </svg>
  );
}

/** X's logo, drawn as a filled mark since lucide-react has no X glyph. */
function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export const socialLinks = [
  {
    href: "https://www.facebook.com/profile.php?id=61593222069389",
    label: "Facebook",
    icon: <Facebook className="size-4" />,
  },
  {
    href: "https://www.instagram.com/cafton.official",
    label: "Instagram",
    icon: <Instagram className="size-4" />,
  },
  {
    href: "https://www.linkedin.com/company/cafton",
    label: "LinkedIn",
    icon: <Linkedin className="size-4" />,
  },
  {
    href: "https://www.tiktok.com/@cafton.official",
    label: "TikTok",
    icon: <TikTokIcon className="size-4" />,
  },
  {
    href: "https://x.com/cafton_official",
    label: "X (Twitter)",
    icon: <XIcon className="size-4" />,
  },
  {
    href: "https://www.youtube.com/@caftonofficial",
    label: "YouTube",
    icon: <Youtube className="size-4" />,
  },
];
