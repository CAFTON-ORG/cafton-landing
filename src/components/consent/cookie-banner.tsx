"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/components/consent/consent-provider";

/**
 * First-visit cookie notice, rendered on the server so it is part of the
 * first paint rather than appearing after hydration. A non-modal region, not a wall: the page stays
 * readable and usable behind it. Accepting and rejecting are the same size and
 * weight (no nudging towards "accept"), nothing is pre-selected, and the full
 * choices are one click away. It disappears once any choice is saved and can
 * be reopened any time from "Cookie settings" in the footer.
 */
export function CookieBanner() {
  const { consent, preferencesOpen, acceptAll, rejectAll, openPreferences } = useConsent();

  if (consent || preferencesOpen) return null;

  return (
    <section
      aria-label="Cookie notice"
      data-cookie-banner
      className="fixed inset-x-3 bottom-3 z-45 rounded-2xl border bg-background p-5 shadow-xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-md"
    >
      <h2 className="text-base font-semibold">Cookies on this site</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        We only use the cookies needed to run the site and remember your
        choices. Embedded content, like our giveaway form, comes from third
        parties that set their own cookies, and loads only if you allow it.{" "}
        <Link
          href="/privacy#cookies"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Read how we use them
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1 cursor-pointer" onClick={rejectAll}>
          Reject non-essential
        </Button>
        <Button variant="outline" className="flex-1 cursor-pointer" onClick={acceptAll}>
          Accept all
        </Button>
      </div>
      <button
        type="button"
        onClick={openPreferences}
        className="mt-3 w-full cursor-pointer rounded-md py-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        Choose which cookies
      </button>
    </section>
  );
}
