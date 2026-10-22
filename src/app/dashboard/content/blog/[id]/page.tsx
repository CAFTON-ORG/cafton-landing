import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { getPost, listAuthorOptions, listPostCategories } from "@/features/cms/admin/repository";
import { PostEditor } from "@/features/cms/components/post-editor";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const [authors, categories] = await Promise.all([
    listAuthorOptions(staff.id, post.authorId),
    listPostCategories(),
  ]);
  const readOnly = !can(staff, "content:update");

  return (
    <>
      <BackLink href="/dashboard/content/blog">All posts</BackLink>
      <PageHeader
        title={post.title || "Untitled post"}
        description={`Last edited ${formatDate(post.updatedAt, { dateStyle: "medium", timeStyle: "short" })}${readOnly ? " · You can read this but not edit it." : ""}`}
      />
      {/* Keyed by the last edit, so the form restarts from the saved values after each save. */}
      <fieldset disabled={readOnly} className="contents">
        <PostEditor key={post.updatedAt} post={post} authors={authors} categories={categories} />
      </fieldset>
    </>
  );
}
