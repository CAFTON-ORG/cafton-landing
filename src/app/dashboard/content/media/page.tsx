import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { MediaLibrary } from "@/features/media/components/media-library";
import { UploadButton } from "@/features/media/components/upload-button";
import { listMedia } from "@/features/media/repository/media";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Image library" };

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const raw = await searchParams;
  const page = Number.parseInt(typeof raw.page === "string" ? raw.page : "1", 10);
  const library = await listMedia({ page: Number.isFinite(page) ? page : 1 });

  return (
    <>
      <PageHeader
        title="Image library"
        description="Images for the website. Each one gets a description for people who can't see it, and can't be deleted while content uses it."
        action={<UploadButton />}
      />
      <MediaLibrary page={library} />
    </>
  );
}
