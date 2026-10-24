"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
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
import { saveSiteSettings } from "../actions/site";
import { listFromText, textFromList } from "../rules/core";
import { SOCIAL_PLATFORMS } from "../schemas/core";
import type { SiteSettings, SocialPlatform } from "../types/core";
import { Repeater } from "./editor-kit";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X (Twitter)",
  youtube: "YouTube",
};

type TextKey = "email" | "city" | "country" | "countryCode" | "established" | "bookingUrl";

/** The company facts shown across the public site. Saving updates every page. */
export function SiteSettingsEditor({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const canEdit = useCan("settings:update");
  const { run, pending } = useServerAction();
  const [values, setValues] = useState(settings);
  // Lines and badges are typed one per line; kept as text so typing a newline is not lost.
  const [tagline, setTagline] = useState(textFromList(settings.tagline));
  const [facts, setFacts] = useState(textFromList(settings.facts));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const current: SiteSettings = {
    ...values,
    tagline: listFromText(tagline),
    facts: listFromText(facts),
  };
  const dirty = JSON.stringify(current) !== JSON.stringify(settings);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const text = (key: TextKey) => ({
    id: `site-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
    "aria-invalid": !!errors[key],
    autoComplete: "off",
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        run(() => saveSiteSettings(current), {
          success: "Saved. The website is updating.",
          onSuccess: () => router.refresh(),
          onFieldErrors: setErrors,
        });
      }}
    >
      <fieldset disabled={!canEdit || pending} className="grid gap-4">
        <EditorLayout
          rail={
            <>
              {canEdit ? (
                <FormActions
                  description="The company facts and links shown across the website."
                  dirty={dirty}
                  pending={pending}
                  error={errors.form}
                  onDiscard={() => {
                    setValues(settings);
                    setTagline(textFromList(settings.tagline));
                    setFacts(textFromList(settings.facts));
                    setErrors({});
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="text-muted-foreground text-sm">
                    You can read these settings but not change them.
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Where this shows</CardTitle>
                  <CardDescription>
                    One change here updates every page that uses it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground grid gap-3 text-sm">
                  <p>
                    <strong className="text-foreground font-medium">Footer and menu:</strong>{" "}
                    slogan, paragraph, contact email, location, social links, booking button.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">
                      Contact, careers, legal:
                    </strong>{" "}
                    the contact email and place.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Search results:</strong> the
                    short description and the organisation details.
                  </p>
                </CardContent>
              </Card>
            </>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>About the company</CardTitle>
              <CardDescription>Used in the footer and in search results.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                id="site-description"
                label="Short description"
                error={errors.description}
                hint="Shown in search results and link previews for pages without their own text."
              >
                <Textarea
                  id="site-description"
                  rows={3}
                  value={values.description}
                  onChange={(event) => set("description", event.target.value)}
                  aria-invalid={!!errors.description}
                />
              </Field>
              <Field
                id="site-tagline"
                label="Slogan"
                error={errors.tagline}
                hint="One line per row, up to three. Shown big in the footer."
              >
                <Textarea
                  id="site-tagline"
                  rows={2}
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  aria-invalid={!!errors.tagline}
                />
              </Field>
              <Field id="site-footerBlurb" label="Footer paragraph" error={errors.footerBlurb}>
                <Textarea
                  id="site-footerBlurb"
                  rows={3}
                  value={values.footerBlurb}
                  onChange={(event) => set("footerBlurb", event.target.value)}
                  aria-invalid={!!errors.footerBlurb}
                />
              </Field>
              <Field
                id="site-facts"
                label="Badges"
                error={errors.facts}
                hint="One per row, e.g. Est. 2026. Shown under the home and About headlines."
              >
                <Textarea
                  id="site-facts"
                  rows={3}
                  value={facts}
                  onChange={(event) => setFacts(event.target.value)}
                  aria-invalid={!!errors.facts}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact and location</CardTitle>
              <CardDescription>
                The email address and place are used on the contact page, the legal pages and in
                search results.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="site-email" label="Contact email" required error={errors.email}>
                <Input {...text("email")} type="email" />
              </Field>
              <Field
                id="site-bookingUrl"
                label="Booking link"
                error={errors.bookingUrl}
                hint="Where Book a call goes. Leave empty to hide the button."
              >
                <Input {...text("bookingUrl")} type="url" placeholder="https://" />
              </Field>
              <Field id="site-city" label="City" required error={errors.city}>
                <Input {...text("city")} />
              </Field>
              <Field id="site-country" label="Country" required error={errors.country}>
                <Input {...text("country")} />
              </Field>
              <Field
                id="site-countryCode"
                label="Country code"
                required
                error={errors.countryCode}
                hint="Two capital letters, e.g. PH."
              >
                <Input {...text("countryCode")} maxLength={2} />
              </Field>
              <Field id="site-established" label="Founded" required error={errors.established}>
                <Input {...text("established")} inputMode="numeric" maxLength={4} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social networks</CardTitle>
              <CardDescription>
                Shown as icons in the footer, the menu and on event pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Repeater
                label="Links"
                itemName="Network"
                addLabel="Add a network"
                max={SOCIAL_PLATFORMS.length}
                items={values.socials}
                onChange={(socials) => set("socials", socials)}
                create={() => ({
                  platform:
                    SOCIAL_PLATFORMS.find((p) => !values.socials.some((s) => s.platform === p)) ??
                    "facebook",
                  url: "",
                })}
                error={errors.socials}
                render={(link, index, update) => (
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <Field id={`social-${index}-platform`} label="Network">
                      <Select
                        value={link.platform}
                        onValueChange={(platform) =>
                          update({ platform: platform as SocialPlatform })
                        }
                      >
                        <SelectTrigger id={`social-${index}-platform`} className="w-full">
                          <SelectValue>
                            {(value: string) => PLATFORM_LABEL[value as SocialPlatform] ?? value}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {PLATFORM_LABEL[platform]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      id={`social-${index}-url`}
                      label="Address"
                      error={errors[`socials.${index}.url`]}
                    >
                      <Input
                        id={`social-${index}-url`}
                        type="url"
                        value={link.url}
                        placeholder="https://"
                        onChange={(event) => update({ url: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </EditorLayout>
      </fieldset>
    </form>
  );
}
