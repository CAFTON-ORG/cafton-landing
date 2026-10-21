"use client";

import { useState } from "react";

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
import { savePost } from "../admin/actions";
import type { AdminPostDetail, AuthorOption } from "../admin/types";
import { checkPublishPost, paragraphsFromText, slugify } from "../rules";
import { AuthorField } from "./author-field";
import { ImageField, PublishPanel, useContentEditor } from "./editor-kit";

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
  const { values, set, setValues, errors, pending, dirty, submit, published } = useContentEditor({
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
      className="grid gap-4 lg:grid-cols-[1fr_20rem]"
    >
      <div className="grid content-start gap-4">
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
            <CardDescription>
              Optional. Without one the post shows the Cafton cover art.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField
                id="post-imageLight"
                label="Light theme image"
                value={values.imageLight}
                onChange={(value) => set("imageLight", value)}
                onPicked={(item) => !values.imageAlt && item.alt && set("imageAlt", item.alt)}
                error={errors.imageLight}
                placeholder="/images/cover-light.jpg"
              />
              <ImageField
                id="post-imageDark"
                label="Dark theme image"
                value={values.imageDark}
                onChange={(value) => set("imageDark", value)}
                error={errors.imageDark}
                placeholder="/images/cover-dark.jpg"
              />
            </div>
            <Field
              id="post-imageAlt"
              label="Describe the image"
              error={errors.imageAlt}
              hint="Required to publish when there is an image: screen readers read it."
            >
              <Input
                id="post-imageAlt"
                value={values.imageAlt}
                onChange={(event) => set("imageAlt", event.target.value)}
                aria-invalid={!!errors.imageAlt}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <PublishPanel
          status={values.status}
          readiness={readiness}
          pending={pending}
          dirty={dirty}
          isNew={!post}
          onSubmit={submit}
          listHref="/dashboard/content/blog"
          listLabel="Back to all posts"
          publicHref={post ? `/blog/${post.slug}` : undefined}
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
              <Input
                id="post-date"
                type="date"
                value={values.date}
                onChange={(event) => set("date", event.target.value)}
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
                Changing the address of a live post breaks links people already have. Only do it if
                you must.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
