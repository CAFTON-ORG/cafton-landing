"use client";

import { useState } from "react";

import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
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
import { savePartner } from "../admin/editor-actions";
import type { AdminPartnerDetail } from "../admin/forms";
import { checkPublishPartner, slugify } from "../rules";
import { PublishPanel, Repeater, useContentEditor } from "./editor-kit";
import { ImageField } from "./image-field";

const BLANK: AdminPartnerDetail = {
  id: "",
  name: "",
  shortName: "",
  slug: "",
  logoSrc: "",
  logoFit: "contain",
  logoPlate: "",
  rolesText: "",
  featured: false,
  description: "",
  links: [],
  status: "draft",
  updatedAt: "",
};

const FIT_LABEL = {
  cover: "Fill the square (the logo is a square image)",
  contain: "Show it whole on a plate (transparent logo)",
} as const;

export function PartnerEditor({ partner }: { partner?: AdminPartnerDetail }) {
  const { values, set, setValues, errors, pending, dirty, submit, reset } = useContentEditor({
    initial: partner ?? BLANK,
    isNew: !partner,
    save: (form, intent) => savePartner({ ...form, id: partner?.id || undefined }, intent),
    editHref: (id) => `/dashboard/content/partners/${id}`,
    listHref: "/dashboard/content/partners",
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(partner));
  const readiness = checkPublishPartner(values);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit("save");
      }}
    >
      <EditorLayout
        rail={
          <>
            <PublishPanel
              status={values.status}
              readiness={readiness}
              listHref="/dashboard/content/partners"
              listLabel="Back to all partners"
              publicHref={partner ? "/about" : undefined}
              liveNote="This partner is live on the website. Saving updates it immediately."
              pending={pending}
              dirty={dirty}
              isNew={!partner}
              onSubmit={submit}
              onDiscard={reset}
              error={errors.form}
            />
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="partner-featured"
                    checked={values.featured}
                    onCheckedChange={(checked) => set("featured", checked === true)}
                  />
                  <Label htmlFor="partner-featured" className="text-sm leading-snug font-normal">
                    Featured: gets a full entry with story and links even in the compact wall
                  </Label>
                </div>
                <Field
                  id="partner-slug"
                  label="Internal key"
                  required
                  error={errors.slug}
                  hint="Only used to tell partners apart."
                >
                  <Input
                    id="partner-slug"
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase());
                    }}
                    aria-invalid={!!errors.slug}
                    autoComplete="off"
                  />
                </Field>
              </CardContent>
            </Card>
          </>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>The partner</CardTitle>
            <CardDescription>
              Shown on the About page, and in the logo strip on the home page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field id="partner-name" label="Full name" required error={errors.name}>
              <Input
                id="partner-name"
                value={values.name}
                aria-invalid={!!errors.name}
                autoComplete="off"
                onChange={(e) =>
                  setValues((c) => ({
                    ...c,
                    name: e.target.value,
                    ...(slugTouched || c.shortName ? {} : { slug: slugify(e.target.value) }),
                  }))
                }
              />
            </Field>
            <Field
              id="partner-shortName"
              label="Short name"
              required
              error={errors.shortName}
              hint="Used where space is tight."
            >
              <Input
                id="partner-shortName"
                value={values.shortName}
                aria-invalid={!!errors.shortName}
                autoComplete="off"
                onChange={(e) =>
                  setValues((c) => ({
                    ...c,
                    shortName: e.target.value,
                    ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                  }))
                }
              />
            </Field>
            <Field
              id="partner-description"
              label="Story"
              error={errors.description}
              hint="Optional. Featured partners show it with their links."
            >
              <Textarea
                id="partner-description"
                rows={4}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field
              id="partner-rolesText"
              label="Relationship"
              error={errors.rolesText}
              hint="Comma separated, e.g. Sponsor, Technology partner."
            >
              <Input
                id="partner-rolesText"
                value={values.rolesText}
                onChange={(e) => set("rolesText", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ImageField
              id="partner-logoSrc"
              label="Logo image"
              value={values.logoSrc}
              onChange={(v) => set("logoSrc", v)}
              error={errors.logoSrc}
            />
            <Field id="partner-logoFit" label="How it is framed">
              <Select
                value={values.logoFit}
                onValueChange={(v) => set("logoFit", v === "cover" ? "cover" : "contain")}
              >
                <SelectTrigger id="partner-logoFit" className="w-full">
                  <SelectValue>
                    {(v: string) => FIT_LABEL[v as keyof typeof FIT_LABEL] ?? FIT_LABEL.contain}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contain">{FIT_LABEL.contain}</SelectItem>
                  <SelectItem value="cover">{FIT_LABEL.cover}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {values.logoFit === "contain" && (
              <Field
                id="partner-logoPlate"
                label="Plate colour"
                error={errors.logoPlate}
                hint="A background class such as bg-white. Leave empty for the default."
              >
                <Input
                  id="partner-logoPlate"
                  value={values.logoPlate}
                  onChange={(e) => set("logoPlate", e.target.value)}
                  aria-invalid={!!errors.logoPlate}
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            <Repeater
              label="Links shown with the partner"
              itemName="Link"
              max={10}
              items={values.links}
              onChange={(links) => set("links", links)}
              create={() => ({ label: "", href: "" })}
              error={errors.links}
              render={(link, index, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`link-${index}-label`} label="Text" required>
                    <Input
                      id={`link-${index}-label`}
                      value={link.label}
                      onChange={(e) => update({ label: e.target.value })}
                    />
                  </Field>
                  <Field
                    id={`link-${index}-href`}
                    label="Goes to"
                    required
                    hint="A path or https:// address."
                  >
                    <Input
                      id={`link-${index}-href`}
                      value={link.href}
                      onChange={(e) => update({ href: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </EditorLayout>
    </form>
  );
}
