"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
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
import { SITE_NAME } from "@/config/site";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import { saveSeo } from "../admin/seo-actions";
import type { SeoDocument, SeoImage } from "../types";
import { ImageField } from "./image-field";

export interface SeoPageView {
  key: string;
  label: string;
  path: string;
  /** What is used when nothing is changed. */
  title: string;
  description: string;
  absoluteTitle?: boolean;
  noindex: boolean;
}

type Entry = { title: string; description: string; noindex: boolean | undefined; image?: SeoImage };

const toEntries = (pages: SeoPageView[], saved: SeoDocument): Record<string, Entry> =>
  Object.fromEntries(
    pages.map((page) => {
      const override = saved.pages[page.key] ?? {};
      return [
        page.key,
        {
          title: override.title ?? "",
          description: override.description ?? "",
          noindex: override.noindex,
          image: override.image,
        },
      ];
    }),
  );

/** How a result would look in a search engine. It follows the page being edited. */
function Preview({ page, entry }: { page: SeoPageView; entry: Entry }) {
  const title = entry.title || page.title;
  const shown = page.absoluteTitle ? title : `${title} - ${SITE_NAME}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search preview</CardTitle>
        <CardDescription>{page.label}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <p className="line-clamp-2 text-base font-medium break-words text-blue-700 dark:text-blue-400">
          {shown}
        </p>
        <p className="text-foreground/70 text-xs break-all">
          cafton.com{page.path === "/" ? "" : page.path}
        </p>
        <p className="text-foreground/70 mt-1 line-clamp-3 text-sm break-words">
          {entry.description || page.description}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Search-engine and link-preview text for each fixed page. All pages are listed at once, each
 * folded to a line (its title, and whether it was edited or hidden); one opens at a time, and
 * the preview in the rail follows it.
 */
export function SeoEditor({ pages, saved }: { pages: SeoPageView[]; saved: SeoDocument }) {
  const router = useRouter();
  const canEdit = useCan("settings:update");
  const { run, pending } = useServerAction();
  const initial = toEntries(pages, saved);
  const [entries, setEntries] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openKey, setOpenKey] = useState(pages[0].key);
  const dirty = JSON.stringify(entries) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (key: string, change: Partial<Entry>) =>
    setEntries((previous) => ({ ...previous, [key]: { ...previous[key], ...change } }));
  const hasError = (key: string) => Object.keys(errors).some((e) => e.startsWith(`pages.${key}`));
  const changed = (key: string) => JSON.stringify(entries[key]) !== JSON.stringify(initial[key]);

  const open = pages.find((page) => page.key === openKey) ?? pages[0];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        const document: SeoDocument = {
          pages: Object.fromEntries(
            pages.map((p) => {
              const e = entries[p.key];
              return [
                p.key,
                {
                  title: e.title,
                  description: e.description,
                  ...(e.noindex !== undefined && e.noindex !== p.noindex
                    ? { noindex: e.noindex }
                    : {}),
                  ...(e.image ? { image: e.image } : {}),
                },
              ];
            }),
          ),
        };
        run(() => saveSeo(document), {
          success: "Saved. Search engines pick it up the next time they visit.",
          onSuccess: () => router.refresh(),
          onFieldErrors: (fieldErrors) => {
            setErrors(fieldErrors);
            const bad = pages.find((p) =>
              Object.keys(fieldErrors).some((e) => e.startsWith(`pages.${p.key}`)),
            );
            if (bad) setOpenKey(bad.key);
          },
        });
      }}
    >
      <fieldset disabled={!canEdit || pending} className="min-w-0">
        <EditorLayout
          rail={
            <>
              {canEdit ? (
                <FormActions
                  description="Search and social text for each page."
                  dirty={dirty}
                  pending={pending}
                  error={errors.form}
                  onDiscard={() => {
                    setEntries(initial);
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
              <Preview page={open} entry={entries[open.key]} />
            </>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Pages</CardTitle>
              <CardDescription>
                Open a page to change what search engines and social networks show for it. Empty
                fields keep the default.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-2">
              {pages.map((page) => {
                const entry = entries[page.key];
                const isOpen = page.key === open.key;
                const hidden = entry.noindex ?? page.noindex;
                const bodyId = `seo-${page.key}-body`;
                return (
                  <div key={page.key} className="bg-muted/30 min-w-0 rounded-lg border">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      onClick={() => setOpenKey(page.key)}
                      className="focus-visible:ring-ring flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <ChevronRight
                        className={cn(
                          "text-muted-foreground size-4 shrink-0 transition-transform",
                          isOpen && "rotate-90",
                        )}
                        aria-hidden="true"
                      />
                      <span className="shrink-0 text-sm font-medium">{page.label}</span>
                      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                        {entry.title || page.title}
                      </span>
                      {hasError(page.key) && (
                        <StatusBadge tone="danger">Needs attention</StatusBadge>
                      )}
                      {hidden && <StatusBadge tone="neutral">Hidden</StatusBadge>}
                      {changed(page.key) && <StatusBadge tone="info">Edited</StatusBadge>}
                    </button>
                    {isOpen && (
                      <div id={bodyId} className="grid min-w-0 gap-4 border-t p-3">
                        <Field
                          id={`seo-${page.key}-title`}
                          label="Page title"
                          error={errors[`pages.${page.key}.title`]}
                          hint={`${(entry.title || page.title).length} characters. Around 60 or fewer reads best.`}
                        >
                          <Input
                            id={`seo-${page.key}-title`}
                            value={entry.title}
                            placeholder={page.title}
                            onChange={(event) => patch(page.key, { title: event.target.value })}
                          />
                        </Field>
                        <Field
                          id={`seo-${page.key}-description`}
                          label="Description"
                          error={errors[`pages.${page.key}.description`]}
                          hint={`${(entry.description || page.description).length} characters. Around 155 or fewer reads best.`}
                        >
                          <Textarea
                            id={`seo-${page.key}-description`}
                            rows={3}
                            value={entry.description}
                            placeholder={page.description}
                            onChange={(event) =>
                              patch(page.key, { description: event.target.value })
                            }
                          />
                        </Field>
                        <ImageField
                          id={`seo-${page.key}-image`}
                          label="Share image"
                          hint="Shown when the page is posted on social media. About 1200 by 630. Empty uses the Cafton image."
                          value={entry.image?.url ?? ""}
                          aspect="aspect-[1200/630]"
                          error={errors[`pages.${page.key}.image.url`]}
                          onChange={(url) =>
                            patch(page.key, {
                              image: url
                                ? {
                                    url,
                                    width: entry.image?.width ?? 1200,
                                    height: entry.image?.height ?? 630,
                                  }
                                : undefined,
                            })
                          }
                          onPicked={(item) =>
                            patch(page.key, {
                              image: { url: item.url, width: item.width, height: item.height },
                            })
                          }
                        />
                        <div className="flex items-start gap-2 py-0.5">
                          <Checkbox
                            id={`seo-${page.key}-hide`}
                            checked={hidden}
                            onCheckedChange={(checked) =>
                              patch(page.key, { noindex: checked === true })
                            }
                          />
                          <Label
                            htmlFor={`seo-${page.key}-hide`}
                            className="text-sm leading-snug font-normal"
                          >
                            Hide this page from search engines
                            {page.noindex ? " (hidden by default until it has real content)" : ""}
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </EditorLayout>
      </fieldset>
    </form>
  );
}
