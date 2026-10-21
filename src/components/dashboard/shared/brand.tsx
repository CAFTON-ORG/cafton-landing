import { Logo } from "@/components/shared/logo";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/** The Cafton mark and name for the dashboard's headers, sidebar and sign-in. */
export function Brand({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo size={22} className="shrink-0" />
      {showName ? (
        <span className="text-lg font-semibold tracking-wide">{SITE_NAME}</span>
      ) : (
        <span className="sr-only">{SITE_NAME}</span>
      )}
    </span>
  );
}
