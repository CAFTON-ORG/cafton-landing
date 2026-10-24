"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
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
import { useServerAction } from "@/hooks/use-server-action";
import { saveServiceFaqs } from "../actions/editors";
import type { AdminFaq } from "../schemas/forms";
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
      <fieldset disabled={!canEdit || pending} className="min-w-0">
        <EditorLayout
          rail={
            <>
              {canEdit ? (
                <FormActions
                  description={`The questions on the ${current?.title ?? "service"} page.`}
                  dirty={dirty}
                  pending={pending}
                  error={error}
                  saveLabel="Save questions"
                  onDiscard={() => {
                    setItems(initial);
                    setError("");
                  }}
                  links={
                    <Button
                      type="button"
                      variant="ghost"
                      nativeButton={false}
                      render={
                        <a
                          href={`/services/${serviceSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLink aria-hidden="true" /> View on the site
                    </Button>
                  }
                />
              ) : (
                <Card>
                  <CardContent className="text-muted-foreground text-sm">
                    You can read these questions but not change them.
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Good to know</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground grid gap-2 text-sm">
                  <p>They appear at the bottom of the service page, in this order.</p>
                  <p>
                    Keep answers general: the scope decides the specifics, so promise no price or
                    date.
                  </p>
                </CardContent>
              </Card>
            </>
          }
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{current?.title ?? "Questions"}</CardTitle>
                  <CardDescription>
                    {items.length} question{items.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <div>
                  <Label htmlFor="faq-service" className="sr-only">
                    Service
                  </Label>
                  <Select
                    value={serviceSlug}
                    onValueChange={(next) => {
                      if (next === serviceSlug) return;
                      if (dirty && !window.confirm("Leave without saving your changes?")) return;
                      router.push(`/dashboard/content/faqs?service=${next}`);
                    }}
                  >
                    <SelectTrigger id="faq-service" className="w-full sm:w-64">
                      <SelectValue>
                        {(value: string) => services.find((s) => s.slug === value)?.title}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.slug} value={service.slug}>
                          {service.title} ({service.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Repeater
                label="Questions"
                itemName="Question"
                max={30}
                collapsible
                summary={(item) => item.question}
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
            </CardContent>
          </Card>
        </EditorLayout>
      </fieldset>
    </form>
  );
}
