"use client";

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
import { SITE_NAME } from "@/config/site";

/**
 * What a search engine shows for one item (post, project, event). Empty fields use the item's
 * own title and text, shown in grey, so most items never need this.
 */
export function SeoListingCard({
  idPrefix,
  title,
  description,
  onTitle,
  onDescription,
  defaultTitle,
  defaultDescription,
  errors,
}: {
  idPrefix: string;
  title: string;
  description: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  /** What is used when the field is empty. */
  defaultTitle: string;
  defaultDescription: string;
  errors: Record<string, string>;
}) {
  const shownTitle = title || defaultTitle || "Untitled";
  const shownDescription = description || defaultDescription;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search listing</CardTitle>
        <CardDescription>
          How this appears in search results and link previews. Leave empty to use its own title and
          text.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <div className="bg-muted/40 min-w-0 rounded-lg border p-3">
          <p className="line-clamp-2 text-base font-medium break-words text-blue-700 dark:text-blue-400">
            {`${shownTitle} - ${SITE_NAME}`}
          </p>
          <p className="text-foreground/70 mt-1 line-clamp-3 text-sm break-words">
            {shownDescription || "No description yet."}
          </p>
        </div>
        <Field
          id={`${idPrefix}-seoTitle`}
          label="Search title"
          error={errors.seoTitle}
          hint={`${shownTitle.length} characters. Around 60 or fewer reads best.`}
        >
          <Input
            id={`${idPrefix}-seoTitle`}
            value={title}
            placeholder={defaultTitle}
            aria-invalid={!!errors.seoTitle}
            onChange={(event) => onTitle(event.target.value)}
          />
        </Field>
        <Field
          id={`${idPrefix}-seoDescription`}
          label="Search description"
          error={errors.seoDescription}
          hint={`${shownDescription.length} characters. Around 155 or fewer reads best.`}
        >
          <Textarea
            id={`${idPrefix}-seoDescription`}
            rows={3}
            value={description}
            placeholder={defaultDescription}
            aria-invalid={!!errors.seoDescription}
            onChange={(event) => onDescription(event.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
