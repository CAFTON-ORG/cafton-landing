"use client";

import { Field } from "@/components/dashboard/shared/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { saveProject } from "../admin/editor-actions";
import type { AdminProjectDetail } from "../admin/forms";
import type { AuthorOption } from "../admin/types";
import { checkPublishProject, slugify } from "../rules";
import { AuthorField } from "./author-field";
import { EditorTab, EditorTabs, PublishPanel, Repeater, useContentEditor } from "./editor-kit";
import { CoverImageFields } from "./cover-image-fields";
import { ImageField } from "./image-field";
import { useState } from "react";

const BLANK: AdminProjectDetail = {
  id: "",
  title: "",
  slug: "",
  authorId: "",
  client: "",
  category: "",
  services: [],
  summary: "",
  description: "",
  problem: "",
  solution: "",
  recognition: "",
  imageLight: "",
  imageDark: "",
  imageAlt: "",
  imageFit: "",
  liveUrl: "",
  gallery: [],
  status: "draft",
  updatedAt: "",
};

const FIT_LABEL = {
  "": "Fill the frame (crop)",
  cover: "Fill the frame (crop)",
  contain: "Show it whole (logo or mark)",
} as const;

export function ProjectEditor({
  project,
  authors,
  servicePillars,
}: {
  /** The service areas a project can be filed under (read on the server: the dashboard has no site-content provider). */
  servicePillars: { slug: string; title: string }[];
  project?: AdminProjectDetail;
  authors: AuthorOption[];
}) {
  const { values, set, setValues, errors, pending, dirty, submit, reset, published } =
    useContentEditor({
      initial: project ?? { ...BLANK, authorId: authors[0]?.id ?? "" },
      isNew: !project,
      save: (form, intent) => saveProject({ ...form, id: project?.id || undefined }, intent),
      editHref: (id) => `/dashboard/content/projects/${id}`,
      listHref: "/dashboard/content/projects",
    });
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const readiness = checkPublishProject(values);
  const text = (key: "client" | "category" | "liveUrl") => ({
    id: `project-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
    "aria-invalid": !!errors[key],
  });
  const area = (
    key: "summary" | "description" | "problem" | "solution" | "recognition",
    rows: number,
  ) => ({
    id: `project-${key}`,
    rows,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => set(key, event.target.value),
    "aria-invalid": !!errors[key],
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit("save");
      }}
    >
      <EditorTabs
        rail={
          <>
            <PublishPanel
              status={values.status}
              readiness={readiness}
              listHref="/dashboard/content/projects"
              listLabel="Back to all projects"
              publicHref={project ? `/portfolio/${project.slug}` : undefined}
              pending={pending}
              dirty={dirty}
              isNew={!project}
              onSubmit={submit}
              onDiscard={reset}
              error={errors.form}
            />

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field id="project-client" label="Client or product" required error={errors.client}>
                  <Input {...text("client")} autoComplete="off" />
                </Field>
                <Field
                  id="project-category"
                  label="Category"
                  required
                  error={errors.category}
                  hint="Becomes a filter tab on the portfolio page."
                >
                  <Input {...text("category")} autoComplete="off" />
                </Field>
                <AuthorField
                  id="project-authorId"
                  label="Built by"
                  value={values.authorId}
                  onChange={(value) => set("authorId", value)}
                  authors={authors}
                  error={errors.authorId}
                />
                <fieldset className="grid gap-4">
                  <legend className="text-sm font-medium">Services</legend>
                  <p className="text-muted-foreground -mt-1 text-xs">
                    Where this appears as related work.
                  </p>
                  {servicePillars.map((pillar) => {
                    const id = `project-service-${pillar.slug}`;
                    return (
                      <div key={pillar.slug} className="flex items-start gap-2 py-0.5">
                        <Checkbox
                          id={id}
                          checked={values.services.includes(pillar.slug)}
                          onCheckedChange={(checked) =>
                            set(
                              "services",
                              checked === true
                                ? [...values.services, pillar.slug]
                                : values.services.filter((slug) => slug !== pillar.slug),
                            )
                          }
                        />
                        <Label htmlFor={id} className="text-sm leading-snug font-normal">
                          {pillar.title}
                        </Label>
                      </div>
                    );
                  })}
                  {errors.services && (
                    <p role="alert" className="text-destructive text-sm">
                      {errors.services}
                    </p>
                  )}
                </fieldset>
                <Field id="project-imageFit" label="Cover framing">
                  <Select
                    value={values.imageFit || "cover"}
                    onValueChange={(value) =>
                      set("imageFit", value === "contain" ? "contain" : "cover")
                    }
                  >
                    <SelectTrigger id="project-imageFit" className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          FIT_LABEL[value as keyof typeof FIT_LABEL] ?? FIT_LABEL.cover
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">{FIT_LABEL.cover}</SelectItem>
                      <SelectItem value="contain">{FIT_LABEL.contain}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="project-liveUrl"
                  label="Live site"
                  error={errors.liveUrl}
                  hint="Shows a “Visit Live Site” button."
                >
                  <Input {...text("liveUrl")} type="url" placeholder="https://" />
                </Field>
                <Field
                  id="project-slug"
                  label="Web address"
                  required
                  error={errors.slug}
                  hint={`cafton.com/portfolio/${values.slug || "…"}`}
                >
                  <Input
                    id="project-slug"
                    value={values.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value.toLowerCase());
                    }}
                    aria-invalid={!!errors.slug}
                    autoComplete="off"
                  />
                </Field>
                {published && project && values.slug !== project.slug && (
                  <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-xs">
                    Changing the address of a live project breaks links people already have.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        }
        tabs={[
          { value: "about", label: "Project", fields: ["title", "summary", "description"] },
          { value: "story", label: "Story", fields: ["problem", "solution", "recognition"] },
          { value: "images", label: "Images", fields: ["image", "gallery"] },
        ]}
        errors={errors}
      >
        <EditorTab value="about">
          <Card>
            <CardHeader>
              <CardTitle>The project</CardTitle>
              <CardDescription>
                What visitors read on the portfolio page and the project&rsquo;s own page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="project-title" label="Headline" required error={errors.title}>
                <Input
                  id="project-title"
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
                id="project-summary"
                label="Summary"
                error={errors.summary}
                hint="A sentence or two for the cards on the home and portfolio pages."
              >
                <Textarea {...area("summary", 3)} />
              </Field>
              <Field
                id="project-description"
                label="Description"
                error={errors.description}
                hint="The main text of the project page."
              >
                <Textarea {...area("description", 6)} />
              </Field>
            </CardContent>
          </Card>
        </EditorTab>

        <EditorTab value="story">
          <Card>
            <CardHeader>
              <CardTitle>The story</CardTitle>
              <CardDescription>
                Optional. Each one shows as its own section when filled in.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="project-problem" label="The problem" error={errors.problem}>
                <Textarea {...area("problem", 3)} />
              </Field>
              <Field id="project-solution" label="What we built" error={errors.solution}>
                <Textarea {...area("solution", 3)} />
              </Field>
              <Field
                id="project-recognition"
                label="Recognition"
                error={errors.recognition}
                hint="Awards, finalist places, press."
              >
                <Textarea {...area("recognition", 2)} />
              </Field>
            </CardContent>
          </Card>
        </EditorTab>

        <EditorTab value="images">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                Without a cover the project shows the Cafton cover art.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <CoverImageFields
                idPrefix="project"
                noun="project"
                light={values.imageLight}
                dark={values.imageDark}
                alt={values.imageAlt}
                onLight={(value) => set("imageLight", value)}
                onDark={(value) => set("imageDark", value)}
                onAlt={(value) => set("imageAlt", value)}
                errors={errors}
              />
              <Repeater
                label="Gallery"
                hint="More screenshots, shown on the project page."
                itemName="Image"
                items={values.gallery}
                onChange={(gallery) => set("gallery", gallery)}
                create={() => ({ src: "", alt: "", width: 1200, height: 800, caption: "" })}
                error={errors.gallery}
                render={(image, index, update) => (
                  <div className="grid gap-3">
                    <ImageField
                      id={`gallery-${index}-src`}
                      label="Image"
                      value={image.src}
                      onChange={(src) => update({ src })}
                      onPicked={(item) =>
                        update({
                          width: item.width,
                          height: item.height,
                          alt: image.alt || item.alt,
                        })
                      }
                    />
                    <Field id={`gallery-${index}-alt`} label="Describe it" required>
                      <Input
                        id={`gallery-${index}-alt`}
                        value={image.alt}
                        onChange={(event) => update({ alt: event.target.value })}
                      />
                    </Field>
                    <Field id={`gallery-${index}-caption`} label="Caption">
                      <Input
                        id={`gallery-${index}-caption`}
                        value={image.caption}
                        onChange={(event) => update({ caption: event.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field id={`gallery-${index}-width`} label="Width (px)">
                        <Input
                          id={`gallery-${index}-width`}
                          type="number"
                          min={1}
                          value={image.width}
                          onChange={(event) => update({ width: Number(event.target.value) })}
                        />
                      </Field>
                      <Field id={`gallery-${index}-height`} label="Height (px)">
                        <Input
                          id={`gallery-${index}-height`}
                          type="number"
                          min={1}
                          value={image.height}
                          onChange={(event) => update({ height: Number(event.target.value) })}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </EditorTab>
      </EditorTabs>
    </form>
  );
}
