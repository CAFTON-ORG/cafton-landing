import type { PublishStatus } from "../rules";

export const CONTENT_STATUSES = ["draft", "published"] as const satisfies readonly PublishStatus[];

export const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "Draft",
  published: "Published",
};

/** The content types the dashboard manages. each has its own editor. */
export type ContentKind = "post" | "project" | "event" | "partner";

export interface AdminListRow {
  id: string;
  title: string;
  /** Second line under the title: category, client, type... */
  subtitle?: string;
  slug: string;
  status: PublishStatus;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
  /** The date shown to the public (posts), if any. */
  date?: string;
  /** Where it lives on the public site (only meaningful when published). */
  publicHref: string;
  /** Cover, poster or logo, for the thumbnail in the list. */
  image?: string;
  /** Who it is credited to (not partners). */
  author?: { name: string; avatar?: string };
}

export interface AdminPostDetail {
  id: string;
  slug: string;
  authorId: string;
  title: string;
  excerpt: string;
  /** Paragraphs, joined for editing. */
  body: string;
  date: string;
  category: string;
  imageLight: string;
  imageDark: string;
  imageAlt: string;
  status: PublishStatus;
  /** Galleries placed in the article; edited elsewhere, kept untouched on save. */
  galleryCount: number;
  updatedAt: string;
}

export interface AuthorOption {
  id: string;
  name: string;
  /** Photo address, when the person has one (staff: their Google photo). */
  avatar?: string;
  /** A staff member (as opposed to the shared team account). */
  staff?: boolean;
}
