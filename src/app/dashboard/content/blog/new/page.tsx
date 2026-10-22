import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listAuthorOptions, listPostCategories } from "@/features/cms/admin/repository";
import { PostEditor } from "@/features/cms/components/post-editor";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const staff = await requirePageAccess("content:create");
  if (!staff) return <AccessDenied area="creating content" />;

  const [authors, categories] = await Promise.all([
    listAuthorOptions(staff.id),
    listPostCategories(),
  ]);

  return (
    <>
      <BackLink href="/dashboard/content/blog">All posts</BackLink>
      <PageHeader
        title="New post"
        description="It is saved as a draft. Publish it when it is ready."
      />
      <PostEditor authors={authors} categories={categories} />
    </>
  );
}
