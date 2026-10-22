import { Fragment } from "react";
import Link from "next/link";
import { CalendarDays, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { DotPattern } from "@/components/marketing/decor/dot-pattern";
import { RegistrationMark } from "@/components/marketing/decor/registration-mark";
import { BackToTop } from "@/components/marketing/layout/back-to-top";
import { resolveSocialLinks } from "@/components/marketing/layout/social-links";
import { getSiteSettings } from "@/features/cms/repository/site";
import { CookieSettingsButton } from "@/components/marketing/consent/cookie-settings-button";
import { getServices } from "@/features/cms/repository/services";

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

export async function Footer() {
  const settings = await getSiteSettings();
  const servicePillars = await getServices();
  const socialLinks = resolveSocialLinks(settings.socials);
  return (
    <footer className="relative overflow-hidden border-t">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Dot grid and a soft glow from the top-left, as on the page banners. */}
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_10%_0%,color-mix(in_oklch,var(--foreground)_7%,transparent)_0%,transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/30 to-transparent" />
        <RegistrationMark className="left-[max(1.25rem,calc(50%-36rem))] top-0" />
        <RegistrationMark className="left-[min(calc(100%-1.25rem),calc(50%+36rem))] top-0" />
      </div>
      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-6 lg:px-8">
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
              {settings.tagline.map((line, index) => (
                <Fragment key={line}>
                  {index > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {settings.footerBlurb}
            </p>

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 py-0.5 transition-colors hover:text-foreground"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {settings.email}
                </a>
              </li>
              <li className="inline-flex items-center gap-2 py-0.5">
                <MapPin className="size-4" aria-hidden="true" />
                {`${settings.city}, ${settings.country}`}
              </li>
            </ul>

            {settings.bookingUrl && (
              <Button asChild className="mt-7 cursor-pointer">
                <Link
                  href={settings.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                Book a call
              </Link>
              </Button>
            )}
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
        className="text-outline pointer-events-none relative select-none pb-[0.06em] text-center text-[clamp(4rem,20.5vw,16rem)] font-black uppercase leading-[0.8] tracking-[0.015em] opacity-70 [--outline-width:3px] [mask-image:linear-gradient(to_bottom,#000_25%,transparent_100%)]"
      >
        Cafton
      </p>
    </footer>
  );
}
