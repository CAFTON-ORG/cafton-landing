import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { seoPages } from "@/features/cms/content/seo-pages";
import { SeoEditor, type SeoPageView } from "@/features/cms/components/seo-editor";
import { getSeoOverrides, resolveSeo } from "@/features/cms/repository/seo";
import { getSiteSettings } from "@/features/cms/repository/site";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Search and sharing" };

export default async function SeoPage() {
  const staff = await requirePageAccess("settings:view");
  if (!staff) return <AccessDenied area="the search settings" />;

  const [saved, settings] = await Promise.all([getSeoOverrides(), getSiteSettings()]);
  const pages: SeoPageView[] = seoPages.map((page) => ({
    key: page.key,
    label: page.label,
    path: page.path,
    title: page.title,
    description: page.description ?? settings.description,
    absoluteTitle: page.absoluteTitle,
    noindex: page.noindex ?? false,
  }));
  // Resolving here fails fast if the registry and the readers ever disagree.
  await Promise.all(seoPages.map((page) => resolveSeo(page.key)));

  return (
    <>
      <SeoEditor pages={pages} saved={saved} />
    </>
  );
}
