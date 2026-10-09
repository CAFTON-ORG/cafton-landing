import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { socialLinks } from "@/components/layout/social-links";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { servicePillars } from "@/lib/services";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
  { href: "/events", label: "Events" },
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "Legal" },
  { href: "/careers", label: "Careers" },
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
            <CookieSettingsButton className="cursor-pointer transition-colors hover:text-foreground" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
