import { Logo } from "@/components/shared/logo";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/** The name under the product's name in the sidebar: which workspace this is. */
export const WORKSPACE_LABEL = "Operations";

/**
 * The Cafton mark and name for the dashboard's headers, sidebar and sign-in. With `subtitle` the
 * name sits over a small label saying which workspace this is (the way a workspace switcher or
 * a product header does), which is what the sidebar shows; the sign-in page shows the name alone.
 */
export function Brand({
  showName = true,
  subtitle,
  className,
}: {
  showName?: boolean;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo size={subtitle ? 26 : 22} className="shrink-0" />
      {showName ? (
        <span className="grid min-w-0 gap-0.5 leading-tight">
          <span className="text-base font-semibold tracking-wide">{SITE_NAME}</span>
          {subtitle && (
            <span className="text-sidebar-foreground/70 truncate text-[10px] font-medium tracking-[0.16em] uppercase">
              {subtitle}
            </span>
          )}
        </span>
      ) : (
        <span className="sr-only">{subtitle ? `${SITE_NAME}, ${subtitle}` : SITE_NAME}</span>
      )}
    </span>
  );
}
