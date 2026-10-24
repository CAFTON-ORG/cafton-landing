"use client";

import { useState } from "react";

import { Field } from "@/components/dashboard/shared/field";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import type { MediaItem } from "@/features/media/types/core";
import { ImageField } from "./image-field";

/**
 * The cover of a post or project: one image, its description, and (only when asked for)
 * a different image for dark mode. Without a dark image the same cover is used in both
 * themes, so a single upload is enough.
 */
export function CoverImageFields({
  idPrefix,
  noun,
  light,
  dark,
  alt,
  onLight,
  onDark,
  onAlt,
  errors,
}: {
  idPrefix: string;
  /** "post" or "project", for the hint text. */
  noun: string;
  light: string;
  dark: string;
  alt: string;
  onLight: (value: string) => void;
  onDark: (value: string) => void;
  onAlt: (value: string) => void;
  errors: Record<string, string>;
}) {
  const [separate, setSeparate] = useState(Boolean(dark && dark !== light));
  const pickedAlt = (item: MediaItem) => !alt && item.alt && onAlt(item.alt);

  return (
    <div className="grid gap-4">
      <ImageField
        id={`${idPrefix}-imageLight`}
        label="Cover image"
        value={light}
        onChange={onLight}
        onPicked={pickedAlt}
        error={errors.imageLight}
        hint={`Shown on the ${noun}'s card and page. Without one the site shows the Cafton cover art.`}
      />
      <Field
        id={`${idPrefix}-imageAlt`}
        label="Describe the image"
        error={errors.imageAlt}
        hint="Required to publish when there is an image: screen readers read it."
      >
        <Input
          id={`${idPrefix}-imageAlt`}
          value={alt}
          onChange={(event) => onAlt(event.target.value)}
          aria-invalid={!!errors.imageAlt}
        />
      </Field>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`${idPrefix}-separate`}
          checked={separate}
          onCheckedChange={(checked) => {
            setSeparate(checked === true);
            if (checked !== true) onDark("");
          }}
        />
        <Label htmlFor={`${idPrefix}-separate`} className="text-sm leading-snug font-normal">
          Use a different image in dark mode
        </Label>
      </div>
      {separate && (
        <ImageField
          id={`${idPrefix}-imageDark`}
          label="Dark mode image"
          value={dark}
          onChange={onDark}
          error={errors.imageDark}
        />
      )}
    </div>
  );
}
