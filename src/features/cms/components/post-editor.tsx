"use client";

import { useState } from "react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { savePost } from "../actions/content";
import type { AdminPostDetail, AuthorOption } from "../types/admin";
import { checkPublishPost, paragraphsFromText, slugify } from "../rules/core";
import { AuthorField } from "./author-field";
import { PublishPanel, useContentEditor } from "./editor-kit";
import { SeoListingCard } from "./seo-listing-card";
import { CoverImageFields } from "./cover-image-fields";

const today = () => new Date().toISOString().slice(0, 10);

const BLANK: AdminPostDetail = {
  id: "",
  slug: "",
  authorId: "",
  title: "",
  excerpt: "",
  body: "",
  date: today(),
  category: "",
  imageLight: "",
  imageDark: "",
  imageAlt: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  galleryCount: 0,
  updatedAt: "",
};

/** Create (no `post`) or edit a blog post. Publishing is a separate, permission-gated button. */
export function PostEditor({
  post,
  authors,
  categories,
}: {
  post?: AdminPostDetail;
  authors: AuthorOption[];
  categories: string[];
}) {
  const { values, set, setValues, errors, pending, dirty, submit, reset, published } =
    useContentEditor({
      initial: post ?? { ...BLANK, authorId: authors[0]?.id ?? "" },
      isNew: !post,
      save: (form, intent) => savePost({ ...form, id: post?.id || undefined }, intent),
      editHref: (id) => `/dashboard/content/blog/${id}`,
      listHref: "/dashboard/content/blog",
    });
  const [slugTouched, setSlugTouched] = useState(Boolean(post));

  const readiness = checkPublishPost({
    title: values.title,
    excerpt: values.excerpt,
    content: paragraphsFromText(values.body),
    imageLight: values.imageLight,
    imageDark: values.imageDark,
    imageAlt: values.imageAlt,
  });
  const wordCount = values.body.trim() ? values.body.trim().split(/\s+/).length : 0;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit("save");
      }}
    >
      <EditorLayout
        rail={
          <>
            <PublishPanel
              status={values.status}
              readiness={readiness}
              listHref="/dashboard/content/blog"
              listLabel="Back to all posts"
              publicHref={post ? `/blog/${post.slug}` : undefined}
              pending={pending}
              dirty={dirty}
              isNew={!post}
              onSubmit={submit}
              onDiscard={reset}
              error={errors.form}
            />

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <AuthorField
                  id="post-authorId"
                  label="Written by"
                  value={values.authorId}
                  onChange={(value) => set("authorId", value)}
                  authors={authors}
                  error={errors.authorId}
                />
                <Field
                  id="post-category"
                  label="Category"
                  required
                  error={errors.category}
                  hint="Becomes a filter tab on the blog page."
                >
                  <Input
                    id="post-category"
                    value={values.category}
                    onChange={(event) => set("category", event.target.value)}
                    list="post-categories"
                    autoComplete="off"
                    aria-invalid={!!errors.category}
                  />
                  <datalist id="post-categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </Field>
                <Field id="post-date" label="Post date" required error={errors.date}>
                  <DatePicker
                    id="post-date"
                    value={values.date}
                    onChange={(value) => set("date", value)}
                    aria-invalid={!!errors.date}
                  />
                </Field>
                <Field
                  id="post-slug"
                  label="Web address"
                  required
                  error={errors.slug}
                  hint={`cafton.com/blog/${values.slug || "…"}`}
                >
                  <Input
                    id="post-slug"
                    value={values.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value.toLowerCase());
                    }}
                    aria-invalid={!!errors.slug}
                    autoComplete="off"
                  />
                </Field>
                {post && published && values.slug !== post.slug && (
                  <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-xs">
                    Changing the address of a live post breaks links people already have. Only do it
                    if you must.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Article</CardTitle>
            <CardDescription>Separate paragraphs with a blank line.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field id="post-title" label="Title" required error={errors.title}>
              <Input
                id="post-title"
                value={values.title}
                aria-invalid={!!errors.title}
                autoComplete="off"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    title: event.target.value,
                    ...(slugTouched ? {} : { slug: slugify(event.target.value) }),
                  }))
                }
              />
            </Field>
            <Field
              id="post-excerpt"
              label="Excerpt"
              error={errors.excerpt}
              hint="One or two sentences. Shown in the blog list and in search results."
            >
              <Textarea
                id="post-excerpt"
                rows={3}
                value={values.excerpt}
                onChange={(event) => set("excerpt", event.target.value)}
                aria-invalid={!!errors.excerpt}
              />
            </Field>
            <Field
              id="post-body"
              label="Body"
              error={errors.body}
              hint={`${wordCount} ${wordCount === 1 ? "word" : "words"}`}
            >
              <Textarea
                id="post-body"
                rows={18}
                className="leading-relaxed"
                value={values.body}
                onChange={(event) => set("body", event.target.value)}
                aria-invalid={!!errors.body}
              />
            </Field>
            {post && post.galleryCount > 0 && (
              <p className="text-muted-foreground bg-muted rounded-lg px-3 py-2 text-sm">
                This article has {post.galleryCount} photo{" "}
                {post.galleryCount === 1 ? "gallery" : "galleries"} placed between paragraphs. They
                are kept exactly as they are when you save.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover image</CardTitle>
            <CardDescription>Optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <CoverImageFields
              idPrefix="post"
              noun="post"
              light={values.imageLight}
              dark={values.imageDark}
              alt={values.imageAlt}
              onLight={(value) => set("imageLight", value)}
              onDark={(value) => set("imageDark", value)}
              onAlt={(value) => set("imageAlt", value)}
              errors={errors}
            />
          </CardContent>
        </Card>
        <SeoListingCard
          idPrefix="post"
          title={values.seoTitle}
          description={values.seoDescription}
          onTitle={(value) => set("seoTitle", value)}
          onDescription={(value) => set("seoDescription", value)}
          defaultTitle={values.title}
          defaultDescription={values.excerpt}
          errors={errors}
        />
      </EditorLayout>
    </form>
  );
}
