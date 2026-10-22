import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { DocForm } from "@/features/cms/components/doc-form";
import { getDocument } from "@/features/cms/repository/documents";
import { isSiteDocumentKey, siteDocuments } from "@/features/cms/site/registry";
import { requirePageAccess } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: isSiteDocumentKey(key) ? siteDocuments[key].spec.title : "Page content" };
}

export default async function PageContentEditor({ params }: { params: Promise<{ key: string }> }) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const { key } = await params;
  if (!isSiteDocumentKey(key)) notFound();
  const { spec } = siteDocuments[key];
  const value = await getDocument(key);

  return (
    <>
      <BackLink href="/dashboard/content/pages">All pages</BackLink>
      <PageHeader title={spec.title} description={spec.description} />
      {/* Keyed by the stored text, so the form restarts from the saved values after each save. */}
      <DocForm
        key={JSON.stringify(value)}
        spec={spec}
        initial={value as unknown as Record<string, unknown>}
      />
    </>
  );
}
