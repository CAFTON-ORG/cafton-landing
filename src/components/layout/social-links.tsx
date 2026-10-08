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
    href: "https://www.youtube.com/@caftonofficial",
    label: "YouTube",
    icon: <Youtube className="size-4" />,
  },
];
