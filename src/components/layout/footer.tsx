import Link from "next/link";
import { CalendarDays, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { BackToTop } from "@/components/layout/back-to-top";
import { socialLinks } from "@/components/layout/social-links";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { servicePillars } from "@/lib/services";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/blog", label: "Blog" },
  { href: "/events", label: "Events" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "Legal" },
];

const linkClass =
  "inline-block py-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

// Filled with the page colour so the font's overlapping contours don't show as lines.
const WORDMARK =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col">{children}</ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr] lg:gap-20">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Logo size={34} aria-hidden="true" />
              <span className="text-xl font-bold uppercase tracking-tight">Cafton</span>
            </Link>
            <p className="mt-5 text-lg font-medium leading-snug">
              Build Better.
              <br />
              Solve Smarter.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A software development company in Baguio City, building practical systems for
              businesses, organizations, and new ventures.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:contact@cafton.com"
                  className="inline-flex items-center gap-2 py-0.5 transition-colors hover:text-foreground"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  contact@cafton.com
                </a>
              </li>
              <li className="inline-flex items-center gap-2 py-0.5">
                <MapPin className="size-4" aria-hidden="true" />
                Baguio City, Philippines
              </li>
            </ul>

            <Button asChild className="mt-7 cursor-pointer">
              <Link
                href="https://calendly.com/cafton-company/consultation"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                Book a call
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            <FooterColumn title="Services">
              {servicePillars.map((pillar) => (
                <li key={pillar.slug}>
                  <Link href={`/services/${pillar.slug}`} className={linkClass}>
                    {pillar.title}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Company">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <div className="col-span-2 sm:col-span-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Follow
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/10 hover:text-foreground"
                    >
                      {link.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Cafton. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <CookieSettingsButton className="cursor-pointer py-1 transition-colors hover:text-foreground" />
            <BackToTop />
          </nav>
        </div>
      </div>

      <p
        aria-hidden="true"
        className={`pointer-events-none -mb-[0.14em] select-none text-center text-[clamp(4rem,23vw,18rem)] font-black uppercase leading-[0.8] tracking-tight opacity-30 ${WORDMARK}`}
      >
        Cafton
      </p>
    </footer>
  );
}
