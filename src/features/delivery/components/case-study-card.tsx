"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { linkPortfolio } from "../actions/projects";
import type { PortfolioOption } from "../types";

const NONE = "none";

/** Ties a delivered project to the portfolio entry that tells its story, so the two can be found from each other. */
export function CaseStudyCard({
  projectId,
  current,
  options,
  canEdit,
}: {
  projectId: string;
  current?: string;
  options: PortfolioOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [slug, setSlug] = useState(current ?? "");
  const [error, setError] = useState("");
  // An entry that another project already uses can't be picked (the one you have stays pickable).
  const choices = options.filter(
    (option) => !option.linkedProjectId || option.linkedProjectId === projectId,
  );
  const linked = options.find((option) => option.slug === current);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case study</CardTitle>
        <CardDescription>
          Link this delivered project to its entry in the portfolio. Write and publish the story
          under Website &gt; Portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {canEdit ? (
          <>
            <Field id="case-study" label="Portfolio entry" error={error}>
              <Select
                value={slug || NONE}
                onValueChange={(next) => setSlug(next === NONE ? "" : String(next))}
              >
                <SelectTrigger id="case-study" className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      const found = options.find((option) => option.slug === value);
                      return found ? `${found.title} · ${found.client}` : "Not linked";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {choices.map((option) => (
                    <SelectItem key={option.slug} value={option.slug}>
                      {option.title} · {option.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div>
              <Button
                size="sm"
                disabled={pending || slug === (current ?? "")}
                onClick={() => {
                  setError("");
                  run(() => linkPortfolio(projectId, slug), {
                    success: slug ? "Linked." : "Link removed.",
                    onSuccess: () => router.refresh(),
                    onFieldErrors: (errors) => setError(errors.slug ?? ""),
                  });
                }}
              >
                {pending ? "Saving…" : "Save link"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm">{linked ? `${linked.title} · ${linked.client}` : "Not linked."}</p>
        )}
        {linked && (
          <Link
            href={`/portfolio/${linked.slug}`}
            className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
          >
            View on the website <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
