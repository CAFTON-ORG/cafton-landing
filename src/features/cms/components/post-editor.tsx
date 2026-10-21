"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { savePost } from "../admin/actions";
import type { PublishIntent } from "../admin/schema";
import { STATUS_LABEL, type AdminPostDetail, type AuthorOption } from "../admin/types";
import { checkPublishPost, paragraphsFromText, slugify } from "../rules";

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
  const router = useRouter();
  const canPublish = useCan("content:publish");
  const { run, pending } = useServerAction();
  const initial = post ?? { ...BLANK, authorId: authors[0]?.id ?? "" };
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  // Leaving with unsaved changes asks first (the browser's own dialog).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key: keyof AdminPostDetail) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const bind = (key: keyof AdminPostDetail) => ({
    id: `post-${key}`,
    value: String(values[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(event.target.value),
    "aria-invalid": !!errors[key],
  });

  function onTitle(title: string) {
    setValues((current) => ({
      ...current,
      title,
      ...(slugTouched ? {} : { slug: slugify(title) }),
    }));
  }

  const readiness = checkPublishPost({
    title: values.title,
    excerpt: values.excerpt,
    content: paragraphsFromText(values.body),
    imageLight: values.imageLight,
    imageDark: values.imageDark,
    imageAlt: values.imageAlt,
  });
  const published = values.status === "published";

  function submit(intent: PublishIntent) {
    setErrors({});
    run(() => savePost({ ...values, id: post?.id || undefined }, intent), {
      success:
        intent === "publish"
          ? "Published. It is live on the website."
          : intent === "unpublish"
            ? "Unpublished."
            : "Saved.",
      onSuccess: (data) => {
        if (!post && data?.id) router.replace(`/dashboard/content/blog/${data.id}`);
        else router.refresh();
        setValues((current) => ({
          ...current,
          status:
            intent === "publish" ? "published" : intent === "unpublish" ? "draft" : current.status,
        }));
      },
      onFieldErrors: (fieldErrors) => {
        setErrors(fieldErrors);
        toast.error(fieldErrors.form ?? "Check the highlighted fields.");
      },
    });
  }

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
                onChange={(event) => onTitle(event.target.value)}
                aria-invalid={!!errors.title}
                autoComplete="off"
              />
            </Field>
            <Field
              id="post-excerpt"
              label="Excerpt"
              error={errors.excerpt}
              hint="One or two sentences. Shown in the blog list and in search results."
            >
              <Textarea {...bind("excerpt")} rows={3} />
            </Field>
            <Field
              id="post-body"
              label="Body"
              error={errors.body}
              hint={`${wordCount} ${wordCount === 1 ? "word" : "words"}`}
            >
              <Textarea {...bind("body")} rows={18} className="font-[inherit] leading-relaxed" />
            </Field>
            {post && post.galleryCount > 0 && (
              <p className="text-muted-foreground bg-muted rounded-lg px-3 py-2 text-sm">
                This article has {post.galleryCount} photo{" "}
                {post.galleryCount === 1 ? "gallery" : "galleries"} placed between paragraphs. They
                are kept exactly as they are when you save. Editing them arrives with the media
                library.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover image</CardTitle>
            <CardDescription>
              Optional. Without one the post shows the Cafton cover art. Use a path on this site or
              a full https:// address.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="post-imageLight" label="Light theme image" error={errors.imageLight}>
              <Input {...bind("imageLight")} placeholder="/images/cover-light.jpg" />
            </Field>
            <Field id="post-imageDark" label="Dark theme image" error={errors.imageDark}>
              <Input {...bind("imageDark")} placeholder="/images/cover-dark.jpg" />
            </Field>
            <div className="sm:col-span-2">
              <Field
                id="post-imageAlt"
                label="Describe the image"
                error={errors.imageAlt}
                hint="Required to publish when there is an image: screen readers read it."
              >
                <Input {...bind("imageAlt")} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Publishing{" "}
              <StatusBadge tone={published ? "success" : "neutral"}>
                {STATUS_LABEL[values.status]}
              </StatusBadge>
            </CardTitle>
            <CardDescription>
              {published
                ? "This post is live on the website. Saving updates it immediately."
                : (readiness ?? "Ready to publish.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {errors.form && (
              <p role="alert" className="text-destructive text-sm">
                {errors.form}
              </p>
            )}
            <Button type="submit" disabled={pending || !dirty}>
              <Save aria-hidden="true" />{" "}
              {pending ? "Saving…" : published ? "Save changes" : "Save draft"}
            </Button>
            {canPublish &&
              (published ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => submit("unpublish")}
                >
                  <EyeOff aria-hidden="true" /> Unpublish
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !!readiness}
                  title={readiness ?? undefined}
                  onClick={() => submit("publish")}
                >
                  <Eye aria-hidden="true" /> Publish
                </Button>
              ))}
            {post && published && (
              <Button
                type="button"
                variant="ghost"
                nativeButton={false}
                render={<a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink aria-hidden="true" /> View on the site
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/dashboard/content/blog" />}
            >
              Back to all posts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field id="post-authorId" label="Written by" required error={errors.authorId}>
              <Select
                value={values.authorId}
                onValueChange={(value) => set("authorId")(String(value))}
              >
                <SelectTrigger
                  id="post-authorId"
                  className="w-full"
                  aria-invalid={!!errors.authorId}
                >
                  <SelectValue>
                    {(value: string) =>
                      authors.find((author) => author.id === value)?.name ?? "Choose an author"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {authors.map((author) => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="post-category"
              label="Category"
              required
              error={errors.category}
              hint="Becomes a filter tab on the blog page."
            >
              <Input {...bind("category")} list="post-categories" autoComplete="off" />
              <datalist id="post-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>
            <Field id="post-date" label="Post date" required error={errors.date}>
              <Input {...bind("date")} type="date" />
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
                  set("slug")(event.target.value.toLowerCase());
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
