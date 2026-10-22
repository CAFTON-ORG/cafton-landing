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
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { saveEvent } from "../admin/editor-actions";
import type { AdminEventDetail } from "../admin/forms";
import type { AuthorOption } from "../admin/types";
import { checkEventDates, checkPublishEvent, manilaToIso, slugify } from "../rules";
import { AuthorField } from "./author-field";
import { EditorTab, EditorTabs, PublishPanel, Repeater, useContentEditor } from "./editor-kit";
import { ImageField } from "./image-field";

const BLANK: AdminEventDetail = {
  id: "",
  title: "",
  slug: "",
  authorId: "",
  type: "",
  tagline: "",
  summary: "",
  campaignUrl: "",
  startsAt: "",
  endsAt: "",
  closed: false,
  posterSrc: "",
  posterAlt: "",
  posterWidth: "",
  posterHeight: "",
  aboutText: "",
  prizesHeading: "",
  prizes: [],
  steps: [],
  facts: [],
  closedTitle: "",
  closedNote: "",
  promoEyebrow: "",
  promoTitle: "",
  promoDescription: "",
  promoHref: "",
  promoCta: "",
  status: "draft",
  updatedAt: "",
};

export function EventEditor({
  event,
  authors,
}: {
  event?: AdminEventDetail;
  authors: AuthorOption[];
}) {
  const { values, set, setValues, errors, pending, dirty, submit } = useContentEditor({
    initial: event ?? { ...BLANK, authorId: authors[0]?.id ?? "" },
    isNew: !event,
    save: (form, intent) => saveEvent({ ...form, id: event?.id || undefined }, intent),
    editHref: (id) => `/dashboard/content/events/${id}`,
    listHref: "/dashboard/content/events",
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(event));

  const datesProblem = checkEventDates(manilaToIso(values.startsAt), manilaToIso(values.endsAt));
  const readiness =
    checkPublishEvent({ ...values, prizeCount: values.prizes.length }) ?? datesProblem;
  const text = (
    key:
      | "type"
      | "tagline"
      | "campaignUrl"
      | "prizesHeading"
      | "closedTitle"
      | "promoEyebrow"
      | "promoTitle"
      | "promoHref"
      | "promoCta"
      | "posterAlt",
  ) => ({
    id: `event-${key}`,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
    "aria-invalid": !!errors[key],
  });
  const area = (
    key: "summary" | "aboutText" | "closedNote" | "promoDescription",
    rows: number,
  ) => ({
    id: `event-${key}`,
    rows,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => set(key, e.target.value),
    "aria-invalid": !!errors[key],
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit("save");
      }}
      className="grid gap-4 lg:grid-cols-[1fr_20rem]"
    >
      <EditorTabs
        tabs={[
          { value: "about", label: "Event", fields: ["title", "tagline", "summary", "aboutText"] },
          { value: "prizes", label: "Prizes", fields: ["prizes"] },
          { value: "join", label: "How to join", fields: ["steps", "facts"] },
          { value: "promo", label: "Poster and promotion", fields: ["poster", "promo", "closed"] },
        ]}
        errors={errors}
      >
        <EditorTab value="about">
          <Card>
            <CardHeader>
              <CardTitle>The event</CardTitle>
              <CardDescription>
                What visitors read on the events list and the event page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="event-title" label="Title" required error={errors.title}>
                <Input
                  id="event-title"
                  value={values.title}
                  aria-invalid={!!errors.title}
                  autoComplete="off"
                  onChange={(e) =>
                    setValues((c) => ({
                      ...c,
                      title: e.target.value,
                      ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                    }))
                  }
                />
              </Field>
              <Field id="event-tagline" label="Tagline" error={errors.tagline}>
                <Input {...text("tagline")} />
              </Field>
              <Field
                id="event-summary"
                label="Summary"
                error={errors.summary}
                hint="Shown on the events list."
              >
                <Textarea {...area("summary", 3)} />
              </Field>
              <Field
                id="event-aboutText"
                label="About the event"
                error={errors.aboutText}
                hint="Separate paragraphs with a blank line."
              >
                <Textarea {...area("aboutText", 8)} />
              </Field>
            </CardContent>
          </Card>
        </EditorTab>

        <EditorTab value="prizes">
          <Card>
            <CardHeader>
              <CardTitle>Prizes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                id="event-prizesHeading"
                label="Heading above the prizes"
                error={errors.prizesHeading}
                hint="Optional."
              >
                <Input {...text("prizesHeading")} />
              </Field>
              <Repeater
                label="Prize rows"
                itemName="Prize"
                items={values.prizes}
                onChange={(prizes) => set("prizes", prizes)}
                create={() => ({
                  rank: "",
                  name: "",
                  itemsText: "",
                  image: "",
                  imageAlt: "",
                  cutout: false,
                })}
                error={errors.prizes}
                render={(prize, index, update) => (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id={`prize-${index}-rank`} label="Place or package" required>
                        <Input
                          id={`prize-${index}-rank`}
                          value={prize.rank}
                          onChange={(e) => update({ rank: e.target.value })}
                          placeholder="1st place"
                        />
                      </Field>
                      <Field id={`prize-${index}-name`} label="Prize" required>
                        <Input
                          id={`prize-${index}-name`}
                          value={prize.name}
                          onChange={(e) => update({ name: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field
                      id={`prize-${index}-items`}
                      label="What is included"
                      hint="One item per line."
                    >
                      <Textarea
                        id={`prize-${index}-items`}
                        rows={3}
                        value={prize.itemsText}
                        onChange={(e) => update({ itemsText: e.target.value })}
                      />
                    </Field>
                    <ImageField
                      id={`prize-${index}-image`}
                      label="Photo"
                      value={prize.image}
                      onChange={(image) => update({ image })}
                      onPicked={(item) =>
                        !prize.imageAlt && item.alt && update({ imageAlt: item.alt })
                      }
                      hint="Optional. Without one a typographic plate is shown."
                    />
                    <Field id={`prize-${index}-alt`} label="Describe the photo">
                      <Input
                        id={`prize-${index}-alt`}
                        value={prize.imageAlt}
                        onChange={(e) => update({ imageAlt: e.target.value })}
                      />
                    </Field>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`prize-${index}-cutout`}
                        checked={prize.cutout}
                        onCheckedChange={(checked) => update({ cutout: checked === true })}
                      />
                      <Label
                        htmlFor={`prize-${index}-cutout`}
                        className="text-sm leading-snug font-normal"
                      >
                        Transparent cut-out (shown on a studio backdrop)
                      </Label>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </EditorTab>

        <EditorTab value="join">
          <Card>
            <CardHeader>
              <CardTitle>How to join and quick facts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Repeater
                label="Steps"
                itemName="Step"
                items={values.steps}
                onChange={(steps) => set("steps", steps)}
                create={() => ({ title: "", description: "" })}
                error={errors.steps}
                render={(step, index, update) => (
                  <div className="grid gap-3">
                    <Field id={`step-${index}-title`} label="Step" required>
                      <Input
                        id={`step-${index}-title`}
                        value={step.title}
                        onChange={(e) => update({ title: e.target.value })}
                      />
                    </Field>
                    <Field id={`step-${index}-description`} label="Details">
                      <Textarea
                        id={`step-${index}-description`}
                        rows={2}
                        value={step.description}
                        onChange={(e) => update({ description: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
              <Repeater
                label="Quick facts"
                hint="Replaces the default When / Prizes / Enter facts. Leave empty to keep the defaults."
                itemName="Fact"
                max={10}
                items={values.facts}
                onChange={(facts) => set("facts", facts)}
                create={() => ({ label: "", value: "" })}
                error={errors.facts}
                render={(fact, index, update) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id={`fact-${index}-label`} label="Label" required>
                      <Input
                        id={`fact-${index}-label`}
                        value={fact.label}
                        onChange={(e) => update({ label: e.target.value })}
                      />
                    </Field>
                    <Field id={`fact-${index}-value`} label="Value" required>
                      <Input
                        id={`fact-${index}-value`}
                        value={fact.value}
                        onChange={(e) => update({ value: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </EditorTab>

        <EditorTab value="promo">
          <Card>
            <CardHeader>
              <CardTitle>Poster and promotion</CardTitle>
              <CardDescription>
                All optional. Without a poster one is composed from the prize photos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ImageField
                id="event-posterSrc"
                label="Poster"
                value={values.posterSrc}
                onChange={(posterSrc) => set("posterSrc", posterSrc)}
                onPicked={(item) =>
                  setValues((c) => ({
                    ...c,
                    posterWidth: item.width,
                    posterHeight: item.height,
                    posterAlt: c.posterAlt || item.alt,
                  }))
                }
                error={errors.posterSrc}
              />
              <Field id="event-posterAlt" label="Describe the poster" error={errors.posterAlt}>
                <Input {...text("posterAlt")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="event-posterWidth" label="Poster width (px)" error={errors.posterWidth}>
                  <Input
                    id="event-posterWidth"
                    type="number"
                    min={1}
                    value={values.posterWidth}
                    onChange={(e) =>
                      set("posterWidth", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
                <Field
                  id="event-posterHeight"
                  label="Poster height (px)"
                  error={errors.posterHeight}
                >
                  <Input
                    id="event-posterHeight"
                    type="number"
                    min={1}
                    value={values.posterHeight}
                    onChange={(e) =>
                      set("posterHeight", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
              </div>

              <fieldset className="grid gap-3 border-t pt-4">
                <legend className="text-sm font-medium">Promotion for a product or service</legend>
                <p className="text-muted-foreground -mt-1 text-xs">
                  Fill in all five parts, or leave them empty.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="event-promoEyebrow" label="Small label" error={errors.promoEyebrow}>
                    <Input {...text("promoEyebrow")} />
                  </Field>
                  <Field id="event-promoCta" label="Button text" error={errors.promoCta}>
                    <Input {...text("promoCta")} />
                  </Field>
                </div>
                <Field id="event-promoTitle" label="Title" error={errors.promoTitle}>
                  <Input {...text("promoTitle")} />
                </Field>
                <Field
                  id="event-promoDescription"
                  label="Description"
                  error={errors.promoDescription}
                >
                  <Textarea {...area("promoDescription", 2)} />
                </Field>
                <Field
                  id="event-promoHref"
                  label="Button goes to"
                  error={errors.promoHref}
                  hint="A path on this site or a full https:// address."
                >
                  <Input {...text("promoHref")} />
                </Field>
              </fieldset>

              <fieldset className="grid gap-3 border-t pt-4">
                <legend className="text-sm font-medium">When the event has closed</legend>
                <Field id="event-closedTitle" label="Heading" error={errors.closedTitle}>
                  <Input {...text("closedTitle")} placeholder="This event has closed" />
                </Field>
                <Field id="event-closedNote" label="Note" error={errors.closedNote}>
                  <Textarea {...area("closedNote", 2)} />
                </Field>
              </fieldset>
            </CardContent>
          </Card>
        </EditorTab>
      </EditorTabs>
      <div className="grid content-start gap-4">
        <PublishPanel
          status={values.status}
          readiness={readiness}
          pending={pending}
          dirty={dirty}
          isNew={!event}
          onSubmit={submit}
          listHref="/dashboard/content/events"
          listLabel="Back to all events"
          publicHref={event ? `/events/${event.slug}` : undefined}
          error={errors.form}
        />
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field
              id="event-type"
              label="Kind of event"
              required
              error={errors.type}
              hint="e.g. Giveaway, Awards."
            >
              <Input {...text("type")} />
            </Field>
            <AuthorField
              id="event-authorId"
              label="Posted by"
              value={values.authorId}
              onChange={(v) => set("authorId", v)}
              authors={authors}
              error={errors.authorId}
            />
            <Field
              id="event-startsAt"
              label="Starts"
              error={errors.startsAt}
              hint="Philippine time. Leave empty if not announced."
            >
              <Input
                id="event-startsAt"
                type="datetime-local"
                value={values.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                aria-invalid={!!errors.startsAt}
              />
            </Field>
            <Field
              id="event-endsAt"
              label="Ends"
              error={errors.endsAt ?? datesProblem ?? undefined}
            >
              <Input
                id="event-endsAt"
                type="datetime-local"
                value={values.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                aria-invalid={!!errors.endsAt || !!datesProblem}
              />
            </Field>
            <div className="flex items-start gap-2">
              <Checkbox
                id="event-closed"
                checked={values.closed}
                onCheckedChange={(checked) => set("closed", checked === true)}
              />
              <Label htmlFor="event-closed" className="text-sm leading-snug font-normal">
                Mark as closed now, whatever the dates say
              </Label>
            </div>
            <Field
              id="event-campaignUrl"
              label="Entry form (Gleam)"
              error={errors.campaignUrl}
              hint="The public campaign address; the entry form is built from it."
            >
              <Input {...text("campaignUrl")} type="url" placeholder="https://gleam.io/…" />
            </Field>
            <Field
              id="event-slug"
              label="Web address"
              required
              error={errors.slug}
              hint={`cafton.com/events/${values.slug || "…"}`}
            >
              <Input
                id="event-slug"
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
      </div>
    </form>
  );
}
