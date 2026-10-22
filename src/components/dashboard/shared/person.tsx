import Link from "next/link";

import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { cn } from "@/lib/utils";

/**
 * The standard way to show a person (a staff member, a client, an attendee): their photo or
 * initials beside their name, everywhere. With no name it shows `fallback` ("Unassigned") as
 * plain muted text, because an empty circle says nothing. `secondary` is a smaller line under
 * the name (an email, a business); `href` makes the name a link.
 */
export function Person({
  name,
  email,
  avatarUrl,
  size = "sm",
  fallback = "Unassigned",
  secondary,
  href,
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "default" | "sm" | "lg";
  fallback?: string;
  secondary?: string | null;
  href?: string;
  className?: string;
}) {
  if (!name) return <span className={cn("text-muted-foreground", className)}>{fallback}</span>;
  const label = href ? (
    <Link href={href} className="truncate underline-offset-4 hover:underline">
      {name}
    </Link>
  ) : (
    <span className="truncate">{name}</span>
  );
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <UserAvatar name={name} email={email ?? undefined} src={avatarUrl} size={size} />
      {secondary ? (
        <span className="grid min-w-0 leading-tight">
          {label}
          <span className="text-muted-foreground truncate text-xs">{secondary}</span>
        </span>
      ) : (
        label
      )}
    </span>
  );
}
