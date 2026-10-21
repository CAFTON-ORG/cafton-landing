import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> {children}
    </Link>
  );
}
