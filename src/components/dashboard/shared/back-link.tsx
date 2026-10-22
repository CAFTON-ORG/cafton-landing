import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-4 -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> {children}
    </Link>
  );
}
