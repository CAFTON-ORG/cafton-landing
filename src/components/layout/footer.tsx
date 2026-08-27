import Link from "next/link";
import {
  CalendarDays,
  Facebook,
  Github,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "Legal" },
  { href: "/careers", label: "Careers" },
];

const services = [
  "Custom Software",
  "Web Applications",
  "Mobile Applications",
  "SaaS & Digital Products",
];

const socialLinks = [
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
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[oklch(0.145_0_0)] text-[oklch(0.985_0_0)]">
      {/* A hairline of light along the top edge -- the same restrained,
          grayscale "glow" language used by the hero and the closing CTA,
          scaled down to a footer-appropriate accent rather than a full
          section treatment. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} aria-hidden="true" />
              <span className="text-xl font-bold tracking-tight">CAFTON</span>
            </Link>
          </div>
          <p className="mt-5 text-sm font-medium text-white/70">
            Software Engineering &amp; Technology
          </p>
          <p className="mt-5 text-lg font-medium leading-relaxed">
            We don&apos;t start with software.
            <br />
            We start with the problem.
          </p>
          <Button
            asChild
            className="mt-7 cursor-pointer bg-white text-[oklch(0.145_0_0)] hover:bg-white/90"
          >
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
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/55">
            Services
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {services.map((service) => (
              <li key={service}>
                <Link
                  href="/#services"
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {service}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/55">
            Connect
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  {link.icon}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Cafton. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
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
