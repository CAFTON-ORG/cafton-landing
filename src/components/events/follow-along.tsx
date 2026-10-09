import { socialLinks } from "@/components/layout/social-links";

/** A row of the social channels, for the bottom of an event page. */
export function FollowAlong() {
  return (
    <div className="mt-12 flex flex-col items-center gap-4 border-t pt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Follow along
      </p>
      <ul className="flex flex-wrap justify-center gap-2.5">
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
  );
}
