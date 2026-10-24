import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  Handshake,
  Images,
  LayoutTemplate,
  Plus,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { getContentOverview, type CollectionCount } from "@/features/cms/repository/overview";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Website" };

function Collection({
  icon: Icon,
  title,
  href,
  newHref,
  counts,
  canCreate,
}: {
  icon: LucideIcon;
  title: string;
  href: string;
  newHref: string;
  counts?: CollectionCount;
  canCreate: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link href={href} className="font-medium underline-offset-4 hover:underline">
              {title}
            </Link>
            <p className="text-muted-foreground text-sm tabular-nums">
              {counts
                ? `${counts.published} published · ${counts.drafts} draft${counts.drafts === 1 ? "" : "s"}`
                : "Not available"}
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>
            Manage
          </Button>
          {canCreate && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={newHref} />}>
              <Plus aria-hidden="true" /> New
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Shortcut({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:bg-accent/40 h-full transition-colors">
        <CardContent className="flex items-start gap-3">
          <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function WebsiteOverviewPage() {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const overview = await getContentOverview();
  const canCreate = can(staff, "content:create");

  return (
    <>
      <PageHeader
        title="Website"
        description="Everything visitors read on cafton.com, and where to change it."
      />

      <section aria-labelledby="collections" className="mb-8">
        <h2 id="collections" className="text-muted-foreground mb-3 text-sm font-medium">
          Collections
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Collection
            icon={FileText}
            title="Blog posts"
            href="/dashboard/content/blog"
            newHref="/dashboard/content/blog/new"
            counts={overview?.posts}
            canCreate={canCreate}
          />
          <Collection
            icon={FolderKanban}
            title="Portfolio"
            href="/dashboard/content/projects"
            newHref="/dashboard/content/projects/new"
            counts={overview?.projects}
            canCreate={canCreate}
          />
          <Collection
            icon={CalendarDays}
            title="Events"
            href="/dashboard/content/events"
            newHref="/dashboard/content/events/new"
            counts={overview?.events}
            canCreate={canCreate}
          />
          <Collection
            icon={Handshake}
            title="Partners"
            href="/dashboard/content/partners"
            newHref="/dashboard/content/partners/new"
            counts={overview?.partners}
            canCreate={canCreate}
          />
        </div>
      </section>

      <section aria-labelledby="site" className="mb-8">
        <h2 id="site" className="text-muted-foreground mb-3 text-sm font-medium">
          Pages and settings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Shortcut
            icon={LayoutTemplate}
            title="Pages"
            description="The wording of About, Services, Home, Careers, Contact, Privacy and Legal."
            href="/dashboard/content/pages"
          />
          <Shortcut
            icon={Images}
            title="Media"
            description={`${overview?.images ?? 0} image${overview?.images === 1 ? "" : "s"} in the library.`}
            href="/dashboard/content/media"
          />
          <Shortcut
            icon={SlidersHorizontal}
            title="Site settings"
            description={
              overview?.lastSiteEdit
                ? `Contact, social links, search and sharing. Last changed ${formatRelative(overview.lastSiteEdit)}.`
                : "Contact, social links, search and sharing."
            }
            href="/dashboard/content/site"
          />
        </div>
      </section>
    </>
  );
}
