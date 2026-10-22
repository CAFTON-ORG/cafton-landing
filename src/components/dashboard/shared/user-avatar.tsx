import { Avatar, AvatarFallback, AvatarImage } from "@/components/dashboard/ui/avatar";
import { getInitials } from "@/lib/format";

/**
 * A person's photo with an initials fallback. Used wherever a person is named (menus,
 * pickers, tables) so they look the same everywhere. Google photos refuse requests that
 * carry a referrer, hence `no-referrer`.
 */
export function UserAvatar({
  name,
  email,
  src,
  size = "default",
  className,
}: {
  name?: string;
  email?: string;
  src?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="text-foreground font-medium">
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
