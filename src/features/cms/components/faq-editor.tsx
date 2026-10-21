"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { saveServiceFaqs } from "../admin/editor-actions";
import type { AdminFaq } from "../admin/forms";
import { Repeater } from "./editor-kit";

/** The questions on one service page. Saved as a set, in order, and live immediately. */
export function FaqEditor({
  services,
  serviceSlug,
  initial,
}: {
  services: { slug: string; title: string; count: number }[];
  serviceSlug: string;
  initial: AdminFaq[];
}) {
  const router = useRouter();
  const canEdit = useCan("content:update");
  const { run, pending } = useServerAction();
  const [items, setItems] = useState<AdminFaq[]>(initial);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const current = services.find((service) => service.slug === serviceSlug);

  return (
    <div className="grid gap-4">
      <SegmentedNav
        label="Service"
        items={services.map((service) => ({
          href: `/dashboard/content/faqs?service=${service.slug}`,
          label: `${service.title} (${service.count})`,
          active: service.slug === serviceSlug,
        }))}
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          run(() => saveServiceFaqs({ serviceSlug, items }), {
            success: "Saved. The questions are live.",
            onSuccess: () => router.refresh(),
            onFieldErrors: (errors) => setError(errors.form ?? Object.values(errors)[0] ?? ""),
          });
        }}
      >
        <fieldset disabled={!canEdit} className="contents">
          <Card>
            <CardHeader>
              <CardTitle>{current?.title ?? "Questions"}</CardTitle>
              <CardDescription>
                Shown at the bottom of this service&rsquo;s page, in this order. Answers should stay
                general: scope decides specifics, so promise no price or date.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Repeater
                label="Questions"
                itemName="Question"
                max={30}
                items={items}
                onChange={setItems}
                create={() => ({ question: "", answer: "" })}
                error={error}
                render={(item, index, update) => (
                  <div className="grid gap-3">
                    <Field id={`faq-${index}-q`} label="Question" required>
                      <Input
                        id={`faq-${index}-q`}
                        value={item.question}
                        onChange={(e) => update({ question: e.target.value })}
                      />
                    </Field>
                    <Field id={`faq-${index}-a`} label="Answer" required>
                      <Textarea
                        id={`faq-${index}-a`}
                        rows={4}
                        value={item.answer}
                        onChange={(e) => update({ answer: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
              {canEdit && (
                <div>
                  <Button type="submit" disabled={pending || !dirty}>
                    <Save aria-hidden="true" /> {pending ? "Saving…" : "Save questions"}
                  </Button>
                  {!dirty && (
                    <span className="text-muted-foreground ml-3 text-sm">No changes to save.</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </fieldset>
      </form>
    </div>
  );
}
