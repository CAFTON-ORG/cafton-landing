import type { SVGProps } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { servicePillars } from "@/lib/services";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
  { href: "/events", label: "Events" },
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "Legal" },
  { href: "/careers", label: "Careers" },
];

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

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-xl font-bold tracking-tight">CAFTON</span>
            </Link>
          </div>
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            Software Development Services
          </p>
          <p className="mt-5 text-lg font-medium leading-relaxed">
            Build Better.
            <br />
            Solve Smarter.
          </p>
          <Button asChild className="mt-7">
            <Link
              href="https://calendly.com/cafton-company/consultation"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarDays className="size-4" />
              Book a call
            </Link>
          </Button>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Services
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {servicePillars.map((pillar) => (
              <li key={pillar.slug}>
                <Link
                  href={`/services/${pillar.slug}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pillar.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Connect
          </h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label}
                className="flex size-10 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/10 hover:text-foreground"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t px-5 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Cafton. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
