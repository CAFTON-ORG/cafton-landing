import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listPosts } from "@/features/cms/repository/admin";
import { CONTENT_TABLE } from "@/features/cms/rules/table";
import { ContentTable } from "@/features/cms/components/content-table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Blog posts" };

export default async function BlogPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), CONTENT_TABLE);
  const page = await listPosts(params);

  return (
    <>
      <PageHeader
        title="Blog posts"
        description="Articles on the website's blog. A post is a draft until you publish it."
      />
      <ContentTable kind="post" page={page} />
    </>
  );
}
