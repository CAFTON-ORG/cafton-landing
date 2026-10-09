import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import type { Author } from "@/types/content";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * An author's avatar: their photo when there is one, otherwise the Cafton mark
 * for the team account or their initials for a person.
 */
export function AuthorAvatar({ author, className }: { author: Author; className?: string }) {
  return (
    <Avatar className={cn("size-10 border", className)}>
      {author.avatar && <AvatarImage src={author.avatar} alt="" />}
      <AvatarFallback
        className={cn(
          author.kind === "organization"
            ? "bg-foreground text-background"
            : "text-xs font-semibold",
        )}
      >
        {author.kind === "organization" ? (
          <Logo className="size-[55%]" aria-hidden="true" />
        ) : (
          initials(author.name)
        )}
      </AvatarFallback>
    </Avatar>
  );
}
